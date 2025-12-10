# 设计目标（简短）

- **瓦片优先**：以瓦片为单位调度、解析、渲染，最小化跨瓦片同步。
- **规则可重用/预编译**：把 S-52/S-57 的条件化规则编译为运行时友好的“渲染指令”（HPGL 风格或中间指令集）。
- **高效 GPU 管线**：尽量把绘制工作交给 GPU（批次、实例化、atlas、VAO/VBO 重用）。
- **可扩展性**：支持后续加入三维/水面/动态物标（AIS）等。
- **可调试/可回放**：能导出 tiles → rules → HPGL → drawcalls 的链路以便调试和回放。

---

# 总体架构（概览）

```
Network Tile Source  --> TileManager (scheduler, cache)
                            |
                            v
                      Tile Loader Worker(s)
                            |
                            v
                      Parsed Tile (Vector Features + Attributes)
                            |
                            v
                   Rule Engine / Compiler (worker or main)
                            |
                            v
                    Runtime Rule Objects (razRule)  <- Lookup tables (LUPs)
                            |
                            v
                      Bucketizer (by draw primitive + priority)
                            |
                            v
                    GPU Upload / Buffer Manager (per-tile buckets)
                            |
                            v
                Mapbox CustomLayer render loop (per frame)
                    - Cull tiles by viewport
                    - Update LUPs/Uniforms
                    - Issue draw passes (areas -> lines -> points -> labels)
```

---

# 数据模型（核心类型与职责）

（这里把 razRule 做成运行时主力数据结构，并补充一些辅助结构）

1. **Tile**
    - id (z/x/y), bbox, state (idle/loading/parsed/compiled/ready/failed)
    - features: 原始或矢量要素（几何 + attributes）或引用到已解析的要素集合
    - compiledBuckets: 指向已 bucket 化并上传到 GPU 的对象

2. **Feature**
    - fid（唯一）
    - geomType, geometry (encoded or vertex arrays)
    - attributes (S-57 fields)
    - sourceTileId

3. **razRule**（运行时规则对象）
    - id
    - featureRef / geometryRef
    - attributes（缓存的查找字段）
    - ruleRefs: 引用查找表中匹配的 rule 条目（可能带优先级）
    - compiledHPGL: 中间渲染指令序列（更像指令/参数：fillStyle, strokeStyle, symbolId, labelSpec, mask, offset...）
    - zOrder / priority / renderPassHint（area/line/point/label）
    - bbox / screenBBoxEstimate（用于快速剔除）
    - placementHints（label candidate positions）
    - neighborsRequired: boolean（是否需要跨瓦片上下文）

4. **LUP（Lookup tables / Symbol dictionaries）**
    - symbol atlas, symbol defs (vector paths/SVG/HPGL templates)
    - colour / pen / brush lookup
    - conditional rule tables（用更快的索引结构，例如按 feature class -> attribute -> sorted rule list）

5. **Bucket**
    - 类型：AreaBucket / LineBucket / PointBucket / LabelBucket
    - holds a list of draw commands or packed vertex/index buffers
    - per-priority (prio 0..n) separation, or a sorted single list
    - GPU resources handle, lastUsed timestamp

---

# 运行时规则引擎（关键点）

目标：把 S-52 的规则链从“条件检查 + 符号指派” 转换为“快速可执行的渲染单元”。

1. **编译阶段（offline 或 worker）**
    - 将 S-52 条件 + symbol definitions 预编译成“模板规则（RuleTemplate）”：
        - 条件→ 以字段索引的形式存储（比如 `feature.OBJL in {1,2}`、`CONDT==true`），便于快速匹配。
        - 输出→ 统一的 HPGL-like 指令序列（fill polygon with brush X; stroke with pen Y; place symbol S at anchor ...）。

    - RuleTemplate 带优先级，优先级由 S-52 表配置。

2. **匹配阶段（在 tile worker）**
    - 对每个 feature，使用 LUP 查找匹配的 RuleTemplate（字段索引以 O(1) 或 O(log n) 快速过滤）。
    - 生成 `razRule`：复制必要属性 + 1 个或多个 compiledHPGL（有时需多个命令序列）。
    - 如果规则依赖邻近要素/上下文（例如：某些灯塔规则可能受邻近水域影响），标记 `neighborsRequired = true`。

3. **合并/优化**
    - 同类指令合并（同一个 bucket 的相同 pen/brush 可合并为一批渲染命令）。
    - 预计算样式 hash，用于 bucket grouping。

4. **延迟编译**
    - 对复杂规则/符号（例如基于 map scale / camera tilt 的复杂符号），可以延迟到主线程或 GL 上传时编译，减少初始解析压力。

---

# 渲染流水线（Frame 时间内）

每一帧的 render 逻辑在 Mapbox customLayer 的 render() 中执行，建议分阶段执行：

1. **Update View/Uniforms**
    - 更新相机、scale、timeOfDay（用于 Light 表现）、display options（浅/深色模式）。
    - 更新 LUPs（如果用户更改样式或亮度/对比度）。

2. **Tile Culling & Selection**
    - Query TileManager → 返回 visibleTiles（排序：drawPriority、distance、z）
    - Optionally include neighbor tiles for features crossing tile borders.

3. **Per-tile quick checks**
    - If tile.state != ready → either show fallback or skip
    - If tile.compiledBuckets dirty → upload to GPU (VBO/IBO), generate drawcalls

4. **Rendering passes (strict order to mimic ENC priorities)**
    - Pass 0: Area fills (底色、浅水/深水着色)
    - Pass 1: Area boundaries (AreaPlainBoundary / SymbolizedBoundary)
    - Pass 2: Lines (航道、等深线、障碍线) — draw thick lines first? obey zOrder
    - Pass 3: Points and symbols (灯、浮标) — use atlas instancing
    - Pass 4: Labels/Texts (TX/TE) — label collision & declutter
    - Pass 5: Overlays / dynamic items (AIS, route overlays)
      每个 pass 遵守 `priority`（prio）排序，并在渲染前对每个 bucket 做一次 GPU 批次合并。

5. **Label/Collision Stage**
    - LabelBucket 不直接 draw；先进行 placement algorithm（grid or R-tree occupancy），确定可放置 labels，然后把放置结果转换为 instance draws.
    - 支持重复标签（沿线重复、点位置 repeat settings）。

6. **Composite / Post**
    - 可能的后处理（抗锯齿、outline for small symbols），但优先放到 MSAA 或 shader 中。

---

# 瓦片与边界/连续性处理

- **跨瓦片几何**：缓冲（overlap）像素/地理范围。请求瓦片时带额外 margin（一般 8-16 px）以避免符号被切断或线断裂。
- **Neighbor rules**：某些 S-52 条件需要知道邻近要素（例如嵌套海域面积）。两种策略：
    1. **Tile-local + margin**：在 tile loader 里拉取 margin 区域并把相邻 features 也送进 razRule 编译（最简单）；
    2. **Global index**：维护轻量索引（feature centroids in an R-tree across loaded tiles），在需要时进行 neighbor queries（更复杂但更节省内存）。

- **Seamless styling**：保持 symbol IDs 与 atlas 全局唯一，统一 symbol placement rules 以便边界处行为一致。

---

# 并发、Worker 与缓冲管理

- **Worker 分层**
    - **I/O Worker(s)**：fetch vector tile bytes, decompress (gzip/snappy).
    - **Parse Worker(s)**：解析 MVT / .000 -> features/attributes.
    - **Rule Engine Worker(s)**：匹配 RuleTemplate → 生成 razRule（生成中间指令），这一步 CPU 密集但可并行。
    - **Optional**：placement worker（label candidate computation），但因需屏幕坐标，通常在主线程做最终放置。

- **Main/UI 线程**
    - 管理 GPU 上传、drawcalls、label final placement（因为依赖 WebGL context）。

- **缓冲策略**
    - Tile cache with LRU (limit by count & memory). Eviction frees GPU buffers + worker caches.
    - Keep a separate small cache for compiled RuleTemplates and symbol atlases (常驻内存)。

- **Backpressure**
    - TileManager 需要节流并发 fetch & worker tasks（比如同时最多 N 个 tile fetch, M 个 parse jobs），避免阻塞。

---

# GPU & Buffering 实践（性能关键）

- **Vertex Buffer Layout**：设计紧凑、可实例化的结构：
    - Lines: polyline vertex buffers + per-segment attributes (color index, width index).
    - Symbols: instanced draw with transform (x,y,scale,rotation) + symbolId index.
    - Labels: instanced quads with glyph atlas indices or SDF text rendering.

- **Atlas**
    - 一个统一的 Symbol Atlas（位图或 SDF），所有符号与小图都放在同一纹理。按需动态加入并重打包（或 build offline）。

- **VAO 管理**
    - 每个 bucket 管理自己的 VAO/VBO/IBO 指针，上传后尽量复用，不要每帧重建。

- **Batching**
    - 合并同一笔刷/同一符号的实例到一个 drawcall。

- **Shader**
    - 一个通用的 symbol shader 支持颜色变体、outline、opacity 参数；另一个通用 line shader 支持线帽/接合/宽度缩放。

- **WebGL2 特性**
    - 使用 instancing、vertex texture fetch（如需要），textureArray（如果支持），or use SDF for crisp scaling。

- **Fallback**
    - 若 tile not ready，显示简化栅格或低 detail 渲染。

---

# Label 放置与去重（重点）

- **Placement phases**
    1. For each razRule that has label → produce candidate anchor(s) in screen space (centroid, along-line intervals, node).
    2. Sort candidates by priority + importance.
    3. Use occupancy grid or R-tree to test collisions. If candidate accepted, mark occupancy (with padding).
    4. Convert accepted candidates into vertex instances (glyph quads).

- **Repeat rules**
    - For along-line labels，use distance-based repeat interval and projected screen-space intervals (respect tile boundaries).

- **跨层级一致性**
    - When zooming, preserve label anchoring where possible (cache placements per feature across frames).

---

# 优化策略（工程化）

- **预编译规则缓存**：RuleTemplates 和 compiledHPGL 永久缓存到 IndexedDB（按样式版本），下次冷启动更快。
- **按优先级延迟加载**：优先加载高优先级 chart (e.g., local chart / route area) 的 tiles。
- **减少上传**：只有当 tile 的 compiledBuckets 改变时才上传或更新 GPU buffers。
- **GPU memory limit**：对 buffers 做分级 LRU（recently used kept in GPU; others kept in CPU or evicted）。
- **渐进式细节**：先绘制簡化 geometry（low-res）再替换成 full fidelity（progressive refinement）。
- **Profiling hooks**：测量 parse time, rule match time, GPU upload time, draw time。可视化 pipeline 延迟。

---

# 开发/调试工具与可视化

- **Visual debug overlay**
    - 展示 tile boundaries, razRule ids, matched rule ids, draw order, label collisions, symbol atlas.

- **Export trace**
    - 能导出一个 tile 的完整链路（原始 feature -> matched rules -> compiledHPGL -> drawcalls）供回放或单元测试。

- **Unit tests**
    - rule matching tests, label placement tests, seam continuity tests.

- **Golden images & visual diff**
    - 对部分 charts 做渲染快照比对以防回归（特别是 S-52 条件化行为）。

---

# 接口/契约建议（概念性，不是代码）

- `TileManager.getVisibleTiles(viewport) -> Tile[]`（含 priority）
- `TileLoader.fetchAndParse(tileId) -> ParsedTile`（Worker）
- `RuleEngine.compile(parsedTile, LUP) -> razRule[]`
- `Bucketizer.bucketize(razRule[]) -> Bucket[]`
- `GPUManager.upload(bucket) -> GPUHandle`
- `Renderer.renderFrame(viewport, visibleTiles)`

---

# 设计决策与 tradeoffs（需要注意）

- **把规则完全放在 Worker vs 主线程**：
    - Worker 编译 razRule 能提升主线程响应，但 label final placement（需屏幕坐标）仍在主线程。可将 candidate positions 也计算在 worker（使用 projected coords if viewport known），但要小心 viewport 变化。

- **完全 tile-local vs global neighbor index**：
    - Tile-local + margin 更简单但会增加重复解析；global index 复杂但能节省重复工作。推荐以 tile margin 为默认策略（实现简单且可靠），在遇到内存压力再优化为全局索引。

- **实时性 vs 视觉正确性**：
    - 可配置“快速渲染模式”以牺牲部分符号/label 精度换取流畅性（低端设备）。

---

# 实现路线（优先级分步）

1. **基础完善（短期）**
    - 确定 Tile 状态机、LRU 缓存、worker 并发模型。
    - 在 worker 完成 feature → razRule 的最小实现（no neighbor rules）。
    - 实现 Bucketizer，支持 area/line/point basic batching 与 GPU 上传。
    - 实现简单 label placement（主线程基于 occupancy grid）。

2. **功能强化（中期）**
    - 引入 RuleTemplate 预编译、symbol atlas、合并 drawcalls。
    - Margin-based neighbor handling，保证边界连续性。
    - 增加 declutter、repeat label、沿线 label。
    - Instrumentation 与 debug overlay。

3. **优化与稳健（中后期）**
    - Offline/IndexedDB 缓存 rule templates & atlases。
    - Progressive refinement（low→high fidelity）与 adaptive tile priority。
    - 优化 GPU memory eviction、reduce GL calls、instancing。

4. **高级/可选**
    - 支持 day/night, scale dependent rules, dynamic AIS overlay, 3D water features。
    - Global feature index for expensive cross-tile queries。
    - Visual regression testing & CI。

---

# 推荐的“razRule” 结构（一句话总结）

razRule =「轻量的 feature 引用 + 已解析的 attributes + 指向一个或多个已编译的渲染模板（HPGL 样式的中间指令） + 优先级与放置 hint」。规则的匹配与大部分“编译”工作在 worker 完成，放置/最终实例化在主线程完成并上传 GPU。

---

# 验收指标（你能用来判定是否成功）

- 首屏加载时间（first meaningful paint） < X ms（按目标设备）
- 平均帧率（交互期间） >= 60/30 fps（视设备）
- 内存 & GPU 占用可控：在典型区域最多保留 N tiles
- Visual consistency：与 OpenCPN 基本渲染语义一致（通过样例对比）
- 可维护性：新规则/符号可通过添加 RuleTemplate 而不是改底层代码

---

# 最后一些实践建议（tip）

- 把规则引擎做成**数据驱动**（RuleTemplates 存成 JSON / DSL），方便更新和验证。
- 优先把工具链（rule → compiledHPGL）做好：能显著减少 runtime 复杂度。
- 强制把图形资源（symbol atlas/glyphs）版本化：样式变更能方便回滚。
- 在早期先实现稳定的 debug overlay（它比任何 profiler 都值钱）。

# 融合拓展

当然，我刚才给你的架构是为 **瓦片化 ENC 渲染**打基础的，但它本身已经具备“多维渲染模式（2D/Hybrid/3D）可扩展性”。
不过你提到的这些未来能力（Light 对象切换到 3D 模型、声纳点切换到三维地形、水深从 2.5D 变真实地形等），需要 **显式把“数据层”和“渲染层”解耦**，并在 razRule 之上多加一个“渲染策略层（RenderStrategy）”。

下面我给你一个 **专门为未来 2D/3D/Hybrid 状态扩展设计的架构扩展版**，这个版本可以满足：

- 同一 Feature（如 Light）在 2D 模式下 → symbol + text + beams
- 在 3D 模式下 → 变成 3D 模型 + volumetric beam
- 甚至未来加入航标动态动画、声纳三维场景、水下地形、真实波浪等
- 同样完全支持瓦片渲染，不破坏现有管线

---

# 🌈 **关键想法：把“Rule Engine”扩展为“Rule → RenderStrategy → Rendering Primitives”**

要支持未来渲染方式变化，必须把系统拆为三个层级：

```
Feature (ENC data)
   |
   v
razRule (规则解析结果：语义 + 样式 = 渲染意图)
   |
   v
RenderStrategy (根据当前模式，决定具体的渲染方式)
   |
   v
Rendering Primitives (2D geometry, 3D model instance, volume beams, etc)
```

示意图：

```
     +-------------------+
     |      Feature      |
     +-------------------+
                |
                v
     +-------------------+
     |      razRule      |   “语义表示 + 规则变换”
     +-------------------+
                |
                |   根据模式切换
                v
     +-------------------+
     |  RenderStrategy   |   <—— 关键扩展点
     +-------------------+
      /       |         \
     v        v          v
 2D Primitives    3D Model      Volume/Shader
 (lines, points)   instance       (光束、水体等)
```

---

# 🌟 **1. razRule 永远不承载“维度信息”**

razRule 中保存的始终是：

- feature 的属性（OBJL、CAT、VAL 等）
- 语义化样式（“这是一个 light，白色，闪烁，方位角 60°”）
- S-52 匹配结果（symbolId, colourIndex, lineStyleId 等）
- priority、label hints

**但是不包含：线还是模型？2D 还是 3D？光束的 shader 用哪个？**

这一切不放在 razRule，而放在 RenderStrategy。

这样你扩展成 3D 时只需增加新的 RenderStrategy，而不需要修改规则系统。

---

# 🌟 **2. RenderStrategy 是核心扩展点**

你可以把 RenderStrategy 视为：

> **渲染意图 → 渲染实现**

一个 RenderStrategy 例子（Light 对象）：

```
LightRenderStrategy {
   render2D(razRule, buckets)
   render3D(razRule, scene)
}
```

再比如 DepthArea：

```
DepthAreaRenderStrategy {
    render2D_FilledPolygon(...)
    render3D_TerrainElevation(...)
}
```

所有 feature 类型都应该有一种 Strategy：

| Feature 类型     | 2D 模式                | 3D 模式                            |
| ---------------- | ---------------------- | ---------------------------------- |
| LIGHTS (灯)      | 点 + Symbol + 扇形光束 | 3D 灯塔模型 + 真实 volumetric 光束 |
| DEPARE (深水区)  | 颜色填充               | 真实地形网格（或贴图）             |
| BOYSPP (浮标)    | 点符号                 | 3D 浮标模型、可漂浮                |
| WRECKS（沉船）   | 2D 线/点               | 3D 可视化模型                      |
| SOUNDG（测深点） | 文本“3.8”              | 立体浮标 / 小标识球体              |
| LNDARE（陆地）   | 面填色                 | 地形贴图、模型                     |

这就是完全可扩展、可热插拔的设计。

---

# 🌟 **3. FeatureType → RenderStrategy 注册表（关键）**

你需要一个 global registry：

```ts
RenderStrategyRegistry.register('LIGHTS', LightRenderStrategy)
RenderStrategyRegistry.register('DEPARE', DepthAreaRenderStrat)
RenderStrategyRegistry.register('SOUNDG', SoundingStrategy)
```

在渲染的时候：

```
const rule = razRule
const strategy = RenderStrategyRegistry.get(rule.objl)
strategy.render2D(rule, bucketContext)
```

而切换到 3D：

```
strategy.render3D(rule, sceneContext)
```

**不用修改规则引擎，不用修改数据结构，不用修改瓦片系统。**

这就是未来扩展性。

---

# 🌟 **4. 渲染方式变了，不影响瓦片调度/缓存**

因为 RenderStrategy 的输出都是：

- 2D 模式 → bucket primitives（线/面/点）
- 3D 模式 → scene graph primitives（model instance, mesh, shader node）

你可以继续使用瓦片调度、同样的 TileManager、同样的配套 worker。

**区别只在最后渲染阶段把 razRule 送到不同的渲染策略。**

例如：

```
if (mode == "2D") {
   strategy.render2D(...)
} else {
   strategy.render3D(...)
}
```

---

# 🌟 **5. 3D 支持要关注的一件事：瓦片边界不再“平面一致”**

当你进入 3D 模式时：

- Tile 的 height 可能不是纯平面
- 例如构建三维海底地形（GEBCO、S-44 测深、MBES DEM）
- 3D 模型（灯塔、浮标）不再是“屏幕空间”物体，而是地理坐标 anchor

建议：

**瓦片不存储 3D 几何，只存储地理位置**。
3D 模型在渲染阶段由 scene graph 动态加载。

这样 3D 时瓦片只作为数据入口，scene graph 才是最终呈现层。

---

# 🌟 **6. 声纳三维地形、水体、光束：使用“渲染能力插件”**

再扩展 RenderStrategy：

- SonarPoint → 3D Volumetric Sphere 或 depth scatter point
- UnderwaterArea → 3D mesh terrain
- Light → Volumetric cone shader
- Buoy → Animation Component（floating oscillation）

你甚至可以做成：

```
Strategy = {
   render2D()
   render3D()
   renderHybrid()
   renderShadow()
}
```

---

# 🌟 **7. 未来引入 Deck.GL / WebGPU / Three.js 也不会影响核心架构**

因为你的扩展点在 RenderStrategy：

- 2D 渲染方式可以继续使用 Mapbox + GL2
- 3D 渲染方式可以独立使用 Three.js / Deck.GL / WebGPU

**strategy 层是适配器层**。

你可以对同一个 rule 写不同的实现：

```
render3D_DeckGL(rule)
render3D_ThreeJS(rule)
render3D_WebGPU(rule)
```

底层渲染引擎可以替换，但上层数据系统完全不变。

---

# 🌟 **8. 总结：要支持未来 3D 的关键设计原则**

**（1）razRule 不包含渲染方式，只表示语义**
**（2）所有渲染统一交给 RenderStrategy 层**
**（3）RenderStrategy 基于 “渲染模式” 输出不同 primitive**
**（4）Tile 系统保持 2D/3D 无关性**
**（5）Scene Graph 单独对接 3D 渲染引擎**
**（6）策略注册体系确保 feature → 渲染实现 完全可扩展**
**（7）保证渲染模式切换时，只替换渲染层，不影响规则和瓦片层**

这样你的架构不仅能做规范化海图，还能演进到：

- 三维海图
- 混合地图
- 水下可视化
- 海事仿真系统
- 海上驾驶辅助系统

甚至类似 Cesium 的海洋扩展都可以加入。

# 数据流

# 从 `visibleTiles` 到最终渲染数据 — 逐步详解（按时序与责任分层）

下面把一次**加载并渲染单张瓦片**（Tile Z/X/Y）按**时间线**、**线程/worker 责任**、**中间数据结构**、**状态转换**详细列出。目标是把抽象流程具体化到工程可实现的步骤，便于你在现有 `TileManager` / worker / buckets 管线上落地。

> 先给出整体流程速览（一行版）：
> visibleTiles → fetch tile bytes → parse → feature objects → rule-matching → 生成 `razRule`（渲染意图）→ 分配到 `RenderStrategy` → bucketize（构建/合并 draw commands / vertex 数据）→ GPU upload（VBO/IBO/atlas）→ label placement/instances → drawcalls（frame）

接下来把每一步拆成具体动作、输入/输出、谁来做、常见优化与错误处理。

---

# 1) TileManager 得到 visibleTiles（主线程）

**触发条件**：视图（viewport）变化或缩放/平移导致需要新瓦片。
**职责**：

- 计算需要的瓦片集合（包含 margin/overlap），按优先级排序（中心优先、低 zoom 优先或按用户策略）。
- 对每个 tile 决定状态：`cached_ready` / `cached_parsed` / `to_fetch` / `fetching` / `failed`。
- 发起 fetch 请求（如果 tile 未缓存或 stale）。

**输出**：调用 `TileLoader.fetch(tileId)` 或返回已缓存 tile 对象。

---

# 2) Fetch tile bytes（I/O worker 或主线程 fetch）

**谁做**：通常主线程发起网络请求（fetch/XHR），或由 I/O worker 做（受限于浏览器）。
**输入**：tileId → url.
**输出**：tile bytes（MVT / .000 / gzipped）。
**注意**：错误重试策略、gzip/snappy 解压、带宽/并发限制。Tile 状态从 `to_fetch` → `fetching` → `fetched` 或 `failed`。

---

# 3) Parse bytes -> ParsedTile（Parse Worker）

**谁做**：Parse Worker(s)（WebWorker）。
**输入**：tile bytes。
**做什么**：

- 解码 MVT 或你自定义的矢量格式（.000 → feature list）。
- 生成 `ParsedFeature[]`：每个包含 `fid`, `geomType`, encoded geometry (e.g. polyline encoded/command buffers or raw coordinates), `attributes`（S-57 字段）、bbox、centroid（可选）。
- 做基本的几何简化 / quantize（如果 tile 数据是高精度并且你想减少 GPU 数据量，可在 parse 阶段做简化）。
- 计算几何的 tile-local bbox，以便快速剔除后用。
- 标记 features 需要跨 tile 的情况（例如 polygon touches tile edge）。

**输出**：`ParsedTile { tileId, features: ParsedFeature[], rawMeta }`。Tile 状态：`parsed`.

**优化**：

- 使用 typed arrays 存 geometry，便于后续传递与转成 GPU buffers。
- 使用 binary-serializable structure 通过 `postMessage` 传回主线程（Transferable objects）。

---

# 4) 规则引擎匹配（Rule Engine Worker） —— 生成 `razRule`

**谁做**：Rule Engine Worker(s)（可以和 Parse Worker 合并或分离）。
**输入**：`ParsedTile`, LUP（Lookup Tables / RuleTemplates），当前样式/lighting/zoom（必要时）。
**做什么**：

- 对每个 `ParsedFeature` 做快速过滤（按 OBJL/feature class 等索引）以查找可能匹配的 RuleTemplates。
- 逐条执行条件匹配（多数是字段比较、范围判断、存在性判断）；这里条件已经在 RuleTemplate 里以易检索格式（索引化字段、预编译表达式）存储以加速。
- 对每个匹配的模板，生成 1..N 个 `razRule`（一个 feature 在不同优先级或不同渲染 pass 可能对应多个 razRule）。
- 在 `razRule` 中保留：
    - `featureRef`（轻量引用：tileId + fid，或浅拷贝必要字段）
    - `attributes`（常用字段缓存）
    - `compiledHPGL` 或 `renderIntent`（中间指令序列：fill with brush #3, stroke pen #2, place symbol S-12 at anchor A）
    - `priority, renderPass, placementHints, bbox`
    - `neighborsRequired` 标志（如果模板声明需要邻居）

- 如果模板需要跨-tile 上下文，例如判断“该面是否包含特定子面”，则把 `neighborsRequired` 标为 true，并把该 razRule 的状态置为 `pendingNeighborResolve`。

**输出**：`razRule[]`（一个 tile 的规则化描述）。Tile 状态：`compiled`（部分或全部，若有 pending neighbor 则标注）。

**优化**：

- 把 RuleTemplates 保存在 Shared Worker / 全局缓存，避免重复解析。
- 对常用 attribute 做 bitmask 编码以快速判断匹配。
- 把 compiledHPGL 做成紧凑的二进制指令流，便于传输与快速执行。

---

# 5) Neighbor Resolution（可选，Worker 或主线程协调）

**触发**：若有 `razRule` 标记 `neighborsRequired`。
**做什么**：

- TileManager 确保加载相邻瓦片（或从已有缓存读取邻近 features）。
- RuleEngine 对照邻居的 ParsedFeatures / razRules，完成最终的匹配或合并（例如把连通区域属性聚合）。
- 更新这些 `razRule`（变为 `ready`）。

**实现策略**：

- 简单方式：在 parse 阶段就以 margin/overfetch 方式拉入邻居数据，避免后续查询（实现简单但增加重复）。
- 高级方式：维护跨已加载Tile的全局轻量索引（R-tree of feature centroids）以供快速查询（实现复杂但节省重复工作）。

---

# 6) RenderStrategy 决定最终渲染目标（主线程或 Worker）

**谁做**：可在 Worker 里做“策略选择/初步映射”，但最终转换为 GPU-ready 数据通常在主线程（因为 WebGL context 只能在主线程）。
**输入**：`razRule`，当前 `renderMode`（2D/3D/Hybrid），symbol atlas & LUPs，viewport info（如果需要做画屏相关计算）。
**做什么**：

- 根据 `razRule` 的语义 + 当前 `renderMode`，选择对应的 `RenderStrategy`（参见前面设计）。
- `render2D`路径：把 `compiledHPGL` 翻译为具体的 bucket draw commands（例如：三角填充 triangles, stroke segments, symbol instance descriptors, label candidates）。
- `render3D`路径：生成 scene-graph 命令（例如 `ModelInstance { modelId, latlon, rotation, scale }` 或 `mesh patch`），这些命令可能被传到一个 3D 引擎（Three.js / deck.gl layer / WebGPU）去处理。
- 在 2D 路径，会产生**bucket-able**中间结果（见下一步）。

**输出**：

- 2D: `BucketCommands`（描述一组可批量绘制的 primitives）
- 3D: `ScenePrimitives`（模型实例/mesh描述 + references to GPU resources）

---

# 7) Bucketizer / Batch 合并（主线程）

**职责**：把多个 `razRule` 的 renderIntent 合并为最小 drawcall 集合（把相同 pen/brush/symbol 的命令合成一批），并构建最终要上传到 GPU 的 vertex/index 数据结构。
**输入**：`BucketCommands`。
**做什么**：

- 按 `renderPass`（area → area-boundary → lines → points → labels）与 `priority` 排序。
- 以渲染键（penId, brushId, shaderVariant, textureAtlasId, opacity）分组。
- 对 geometry 做最终转化：
    - 面：triangulate（如果尚未三角化）或使用预computed index buffers。结果写入 `Float32Array` 顶点 + `Uint16/32Array` 索引。
    - 线：tessellate 为线段顶点带宽（或使用 screen-space shader with polyline offsets）。
    - 点/符号：构建 instance 描述（x,y,rotation,scale,symbolAtlasIndex, colorIndex）。
    - Label：生成 glyph runs as instances（或 glyph quads）但**不立即 draw**，先放到 `LabelBucket`。

- 产生 `UploadBatch`：一个或多个紧凑数组，准备上传到 GL。

**中间数据结构示例**：

```ts
Bucket {
  type: 'line'|'area'|'symbol'|'label',
  drawKey: string, // for batching
  vertexBuffer: Float32Array,
  indexBuffer?: Uint32Array,
  instanceBuffer?: Float32Array,
  count: number,
  lastUsedFrame: number
}
```

**优化**：

- 延迟三角化：若 tile 溶入合并队列且 short-life，可能先读取 simplified geometry 以快绘制，再后台生成 full mesh。
- 合并跨 tile 的同 drawKey buffers（只在 safe 情况下做，需考虑 tile eviction 与 update）。

---

# 8) GPU Upload（主线程 / GL context）

**谁做**：主线程（WebGL2）。
**输入**：`UploadBatch`（bucket vertex/index/instance arrays）。
**做什么**：

- 为每个 Batch 分配/更新 VBO/IBO/instance buffers。
- 建立或更新 VAO（vertex attribute layout）。
- 管理 GPU 资源生命周期（pair with tile's life — on evict, delete GL buffers）。
- 更新或构建 texture atlas（若新的 symbols/glyphs 被请求），并触发纹理重打包或扩展。如果 atlas 被重新打包，可能需要重新上传一些 instance 描述（source->newAtlasCoords）。
- 在上传时尽量使用 `bufferData` with `gl.DYNAMIC_DRAW` 或 `gl.STATIC_DRAW` 根据使用频率选择，以便驱动优化。

**输出**：`GPUHandle`（bucket -> VAO/VBO references）。Tile 状态：`gpuReady`。

**注意**：

- 避免每帧重建 VAO；只在 bucket 数据真的改变时更新。
- 若使用 texture atlas 增量 update，需要处理 atlas 合并带来的 instance rebind 问题（可能需要移除/重建 draw groups）。

---

# 9) Label 放置与去重（主线程，在 GPU-upload 之后或之前）

**谁做**：主线程（依赖屏幕坐标与 viewport）。
**输入**：`LabelBucket`（label candidates with screen-space anchors, priority, bbox/padding）。
**做什么**：

- 将 label 候选的位置从地理坐标投影到屏幕坐标（需要当前 viewport）。若候选是沿线 repeat，则在屏幕空间做间隔计算。
- 使用 occupancy grid / quadtree / R-tree 来检测碰撞。优先按照 `priority` 排序放置高优先级标签。
- 标记 accepted candidates，并把它们转换为 instance quads（glyph instance or text quad）存入 `LabelInstanceBuffer`。
- 对于 沿线/重复标签、缩放级别相关标签 做裁剪（避免过密）。

**输出**：`LabelInstanceBuffer`（上传到 GPU 并在 label pass 绘制）。

**细节**：

- 对于 SDF 文本，上传 signed distance textures 的 atlas 并用 SDF shader 绘制。
- 为了跨帧稳定性可缓存 accepted placements（per feature) 并在 camera small pan/zoom 时复用，以避免闪烁。

---

# 10) 最终 Drawcalls（在 Mapbox customLayer.render 或对应 3D 渲染帧）

**谁做**：Renderer（主线程，Mapbox customLayer 的 `render` 回调）。
**输入**：已准备好的 `GPUHandle`s、`LabelInstanceBuffer`、当前 view uniforms（projection, viewMatrix, devicePixelRatio, timeOfDay）。
**做什么（渲染顺序）**：

- Set common GL state (blend, depth test, stencil if needed).
- Pass 0: Area fills — bind area VAOs, set uniforms, draw elements per batch.
- Pass 1: Area boundaries — bind boundary VAOs, draw.
- Pass 2: Lines — bind line VAOs, draw.
- Pass 3: Symbols (instanced) — bind instance VAO + atlas, draw instanced.
- Pass 4: Labels — bind SDF/text shader + glyph atlas, draw instanced glyph quads.
- Pass 5: Overlays/3D integration — if hybrid mode, composite 3D scene draws (Three.js) with shared depth or separate layers.
- Each pass respects `priority` orders inside batch lists.

**输出**：屏幕像素（rendered frame）。Tile 状态：`rendered` / `visible`.

---

# 11) 缓存、回收与生命周期管理（持续进行）

**谁做**：TileManager + GPUManager。
**职责**：

- LRU 管理 tiles：当内存/GPU 超限时，按最近使用策略回收最久未使用的 tiles。
- 在回收时释放：GPU buffers (VBO/IBO), instance buffers, per-tile precomputed geometry, razRule 存根（如果需要保留可保留到 IndexedDB）。
- 如果有 offline cache（IndexedDB），可以把 `CompiledRuleTemplates`、symbol atlas、甚至部分 `compiledBuckets` 存储到 disk，以便冷启动加速。

---

# 12) 异常与降级策略

**当任一环节失败**：

- Fetch fail → 标记 tile `failed` 并展示 fallback（parent tile 的低分辨率渲染或 raster fallback）。
- Parse fail → 标记 `parsedFailed`，log 并回退到低保真渲染（例如只渲染线框或栅格）。
- RuleEngine 超时/阻塞 → 可以采用快速模式：使用简单的 default style 显示 features（尽快保证可交互）。
- GPU upload fail（内存不足）→ 触发 eviction，尝试分批次上传或降级精度。

---

# 典型的状态机（Tile）

简化状态序列：

```
idle -> fetching -> fetched -> parsing -> parsed -> compilingRules -> compiled (maybe pending neighbors) ->
readyForUpload -> gpuUploading -> gpuReady -> rendered
```

每个状态都应有 timeout、retry、fail 路径。

---

# 小结：关键点回顾（工程化建议）

1. **把 CPU 工作尽量移到 Worker**：fetch/parse/rule-matching 并行化，主线程只做 GPU 交互与 label final placement。
2. **razRule 是语义/意图层**：不携带屏幕坐标或 WebGL handle，保证跨渲染模式可复用。
3. **RenderStrategy 层负责把意图映成具体 primitive**：是 2D/3D 扩展的核心。
4. **Bucketize + Batch** 是性能关键：设计良好的 drawKey 与合并策略能显著减少 drawcalls。
5. **Label 放置在主线程**（screen-space 依赖），但候选可以在 worker 预计算（如果 viewport 早期已知）。
6. **健壮的缓存与 LRU**：避免频繁重建 GPU 资源与重复解析。
7. **监测与可视化**：在开发早期加入 debug overlay（tile bounds, razRule ids, drawKey counts, glyph usage），便于调优。

# 整体管线

---

# 高层流程速览（一句话版）

1. 视图更新 → TileManager 计算 `visibleTiles`
2. 请求 / 获取 瓦片 bytes（fetch）→ 交给 `loadTile.worker.ts` 解析成 `ParsedTile`
3. FeatureRouter：把 feature 分流为 **basic**（直接渲染）或 **enc-special**（走 razRule）
4. 对 enc 特殊 features：RuleEngine（Worker）匹配 RuleTemplates → 生成 `razRule[]`（渲染意图）
5. RenderStrategy（主线程/worker）把 `razRule` 转换为 `BucketCommands`（2D primitive 或 3D scene primitives）
6. Bucketizer 合并 draw keys，生成 `UploadBatch`（vertex/index/instance arrays）
7. 主线程 GPU upload（VBO/IBO/instance）→ 生成 `GPUHandle`（per tile/bucket）
8. LabelPlacement（主线程）基于屏幕坐标做碰撞/去重，生成 label instances
9. Map render loop（custom layer）按 Pass 顺序 draw（area -> lines -> points -> labels -> overlays）
10. Tile/LRU 管理：回收 GPU/CPU 资源

---

# 关键类型（示意的 TypeScript 接口）

（你可以直接把这些类型放到 `src/types`，便于 worker 与主线程共享文档定义）

```ts
// 基础：TileId
interface TileID {
	z: number
	x: number
	y: number
}

// parse worker -> ParsedTile
interface ParsedFeature {
	fid: string // tile local id
	layer: string // e.g., "LNDARE"
	geomType: 'Point' | 'LineString' | 'Polygon'
	geometry: Float32Array | number[] // encoded vertex stream or flat coords
	props: Record<string, any> // S-57 attributes
	bbox: [number, number, number, number]
}
interface ParsedTile {
	tileId: TileID
	features: ParsedFeature[]
	meta?: Record<string, any>
}

// RuleEngine output
interface RazRule {
	id: string // unique
	tileId: TileID
	fid: string // feature id
	objClass: string // e.g., "LIGHTS"
	attributes: Record<string, any> // 常用字段缓存
	renderPass: 'area' | 'areaBoundary' | 'line' | 'point' | 'label' | 'overlay'
	priority: number
	compiledHPGL?: Uint8Array // 或中间二进制指令流
	placementHints?: any // label anchor, along-line hints
	bbox: [number, number, number, number]
	neighborsRequired?: boolean
}

// Bucket / Batch
interface BucketCommand {
	bucketKey: string // e.g., "area:brush3:prio10"
	type: 'area' | 'line' | 'point' | 'symbol' | 'label'
	geomRef: { tileId: TileID; fid: string } | Float32Array // reference or raw geometry
	styleRefs: { penId?: number; brushId?: number; symbolId?: string; shaderVariant?: string }
	instanceAttrs?: Float32Array // for instancing
}

interface UploadBatch {
	bucketKey: string
	vertexData: Float32Array
	indexData?: Uint32Array
	instanceData?: Float32Array
	count: number
}

// GPU handle
interface GPUHandle {
	vaoId: number
	vboId: number
	iboId?: number
	instanceVboId?: number
	count: number
	drawMode: number // gl.TRIANGLES etc.
	lastUsedFrame: number
}

// Tile State
type TileState = 'idle' | 'fetching' | 'fetched' | 'parsing' | 'parsed' | 'compiling' | 'ready' | 'gpuReady' | 'failed'
```

---

# 详细时序与责任（逐步展开）

下面以**单张 tile**为例，按时间线逐步展开并标注对应模块/文件建议放置位置（以你现有目录为例）。

## 0) 视图/相机变更（主线程，Mapbox customLayer 的 render 或你的 render loop）

- 触发：用户缩放/平移/rotate 或每帧 tick（requestAnimationFrame）。
- 操作：
    - 更新 `viewport`（projection matrices, zoom, center, dpr）。
    - 调用 `TileManager.getVisibleTiles(viewport)`（`src/tiles/tile_manager.ts`）。

- 输出：`visibleTiles: TileID[]`（按优先级排序）

## 1) TileManager 发起加载 / 调度（主线程）

- 文件：`src/tiles/tile_manager.ts`
- 责任：
    - 对每个 tile 检查缓存状态（in-memory LRU cache）。
    - 如果状态 `idle` -> 将 tile 状态置 `fetching`，并发限额控制（例如 maxFetch = 8）。
    - 调用 `fetchTileBytes(tileId)`（可以在主线程 fetch，并把 bytes 传给 parse worker）。

- 设计细节：
    - 支持 `margin` 参数（tile pixel margin，用来避免边界切割）。
    - 优先级队列：中心优先、当前缩放优先、用户路线附近优先等。

## 2) Fetch bytes（主线程或 I/O worker）

- 责任：HTTP GET（支持 GZIP/CBOR），返回 `ArrayBuffer`。
- 出错：retry/backoff，失败后标记 tile `failed` 并可能回退到 parent tile。

## 3) Parse bytes -> ParsedTile（`loadTile.worker.ts`）

- 文件：`src/data/worker/loadTile.worker.ts`
- 责任（Worker）：
    - 将 bytes 解码为 `ParsedFeature[]`（MVT 或 .000 的解析器）。
    - 做轻量化处理（coordinate quantize，compute per-feature bbox/centroid）。
    - 返回 `ParsedTile` 给主线程（使用 `postMessage` transferable）。

- 输出：`ParsedTile`（tile.state -> `parsed`）
- 性能：
    - 使用 TypedArray 以减少复制成本。
    - 在 worker 里做尽可能多的 CPU 工作（解析与部分简化）。

## 4) FeatureRouter（主线程或专门 worker）

- 责任：把 `ParsedFeature[]` 分为 basic（可交给基础渲染器，如果你坚持自主管线，basic 仍交到你的 pipeline 但可以走更简单的 symbolizer）与 enc-special（须走 RuleEngine）。
- 判定策略：
    - 基于 `layer` 名称（白名单），也可以基于属性（e.g., `OBJL`）和配置文件。

- 输出：
    - `basicFeatures[]`
    - `encFeatures[]`（传给 RuleEngine）

> 你已有基础点/线/面渲染实现：把 basicFeatures 直接进入轻量化处理通道（更快的 compilation/bucketing），encFeatures 进入规则引擎。

## 5) RuleEngine 匹配 RuleTemplates → 生成 `razRule[]`（Worker）

- 文件：`src/rule_engine/*`（建议新建）
- 责任（Worker）：
    - 从 LUP / RuleTemplates（预先载入）中快速匹配 `ParsedFeature`。
    - 为每个匹配产出一个或多个 `RazRule`（可能同一 feature 生成多个 razRule，分别对应 area、boundary、symbol、label）。
    - 标注 `neighborsRequired` 的规则（需要跨 tile context）。
    - 输出 `razRule[]` 回主线程。

- 结构：
    - RuleTemplates 事先 offline 编译成高效索引（按 OBJL、字段存在位掩码等）。

- 性能：
    - 可并行处理每个 feature。
    - 避免把 geometry 大量复制到 razRule，只保留引用（tileId + fid）与必要属性，除非后续需要重写 geometry（例如变形绘制）。

## 6) Neighbor Resolution（若需要）

- 触发：`razRule.neighborsRequired === true`
- 策略 A：**margin overfetch approach**（简单可靠）
    - 在第 1 步 TileManager 加载 tile 时同时拉取带 margin 的 neighbor features；这样在 rule matching 阶段就能处理邻居。

- 策略 B：**Global index on loaded tiles**（高效）
    - 主线程/worker 维护轻量 R-tree（feature centroid），当需要邻居时 query 已加载 tiles。

- 输出：更新 `razRule`（变为 ready）

## 7) RenderStrategy：把 `razRule` 映射为 `BucketCommand`（主线程或 Worker）

- 责任（推荐主线程做最终转换，Worker 做预转换）：
    - `RenderStrategyRegistry.get(objClass)` 调用对应策略，例如 `LightStrategy`, `DepthAreaStrategy`, `WreckStrategy`。
    - `render2D(razRule)` 将 `compiledHPGL` 或 `renderIntent` 翻译为 BucketCommands：
        - 面：triangulation instructions / triangle strips
        - 边界：stroke sequences（可能需 tesselate into screen-space vertices）
        - 符号：symbol instance descriptors（anchor xy, rotation, scale, symbolId）
        - 文本：label candidate descriptors（strings + anchor + offset）

    - `render3D(razRule)`：生成 `ScenePrimitives`（modelId, geolocation, orientation, LOD info）并放入 3D scene queue（如果是 hybrid 模式）。

- 输出：`BucketCommand[]`（tile.scope）

## 8) Bucketizer / Batching（主线程）

- 文件：`@buckets/*`（你已有相关结构）
- 责任：
    - 把 `BucketCommand[]` 按 drawKey（penId:brushId:shaderVariant:textureAtlas）分组。
    - 对同一组合并顶点/索引/instance buffer（拼接成 `UploadBatch`）。
    - 对区域（polygon）进行 triangulation（如果尚未三角化）。
    - 产生 `UploadBatch[]`（按 renderPass 分类）。

- 优化：
    - 延迟 triagulation：初次用 simplified geometry 快速渲染，再后台替换成高质量 mesh。
    - 合并跨 tile 的同 drawKey（谨慎，涉及 eviction）。

## 9) GPU Upload（主线程 / GPUManager）

- 文件：`src/renderer/gpu_manager.ts`
- 责任：
    - 为每个 `UploadBatch` 分配或更新 VBO/IBO/instance VBO，并记录 `GPUHandle`。
    - 设置 attribute pointers / VAO。
    - 如果 symbol atlas/glyph atlas 需要更新：处理 atlas 上传 / 重打包 → 触发 instance UV 修正（可能需要重上传 instanceData）。
    - 记录 `lastUsedFrame`（用于 LRU）。

- 资源回收：
    - Tile 被回收（LRU evict）时释放对应 GPUHandles。

- 注意：
    - 使用 `gl.bufferSubData` 或 `gl.bufferData` 取决于 data 大小和更新频率。
    - Use `DYNAMIC_DRAW` for frequently-updated buffers.

## 10) Label Placement（主线程）

- 文件：`src/labels/label_placer.ts`
- 责任：
    - 把 label candidates（来自 BucketCommands）投影到屏幕坐标（基于当前 viewport）。
    - 对每个 candidate 生成 bounding box（含 padding），按 `priority` 排序。
    - 使用 occupancy grid 或 quadtree 进行碰撞检测（fast）：
        - 如果没冲突 → accept → 生成 glyph instances或 quad instance（写入 `LabelInstanceBuffer`）。
        - 冲突 → 如果有 repeat rules 或沿线规则 → 计算 next candidate → re-test。

    - 支持跨帧稳定性：缓存 accepted placements（per feature），以减少闪烁。

- 输出：`LabelInstanceBuffer` → 上传 GPU（由 GPUManager 管理）

## 11) Render Frame（Map render loop / `custom layer -> render`）

- 文件：`src/renderer/renderer.ts`
- 渲染 Pass 顺序（严格）：
    1. Area fills（底水色、陆地区域）
    2. Area boundaries（AreaSymbolizedBoundary / AreaPlainBoundary）
    3. Lines（航道、等深线）
    4. Points / Symbols（instanced draw）
    5. Labels / Text（SDF glyph shader）
    6. Overlays / 3D composite（If hybrid: composite Three.js scene output or render 3D before overlaying 2D）

- 在每个 pass：
    - 绑定合适 shader program （基于 bucket shaderVariant）
    - 绑定 textures（symbol atlas / glyph atlas）和 uniforms（view matrix, projection, lighting params）
    - 执行 `gl.drawElements / gl.drawArraysInstanced` 按 batch

- Depth & blending:
    - 使用 depth test for 3D or overlay artifacts
    - For 2D map overlay, commonly depth disabled and ordering controlled by priority

## 12) Post-render housekeeping & LRU

- 更新 `GPUHandle.lastUsedFrame`、tile.lastUsed
- 根据内存/GPU限制触发 eviction
- 写日志 / telemetry（parse time, rule engine time, upload time, draw calls）以供分析

---

# Tile 状态机（必须实现的细粒度状态）

```
idle -> fetching -> fetched -> parsing -> parsed -> routing -> ruleCompiling -> compiled (maybe pendingNeighbors)
 -> bucketizing -> uploadPending -> uploading -> gpuReady -> rendered
                    ^                                                   |
                    |--------------fail/retry/evict---------------------|
```

每个状态都应提供：timeout、retry计数、错误原因、以及可观察事件（用于 debug overlay）。

---

# Worker 与消息契约（主线程 <-> worker）

建议协议（JSON 或 binary）要简单且支持 Transferable。

### loadTile.worker.ts 接口

- 主线程 -> worker:

    ```json
    { cmd: "parseTile", tileId: {z,x,y}, bytes: ArrayBuffer, options: {quantize: true} }
    ```

- worker -> 主线程:

    ```json
    { cmd: "parsedTile", tileId: {z,x,y}, parsedTile: ParsedTile }
    ```

### ruleEngine.worker 接口

- 主线程 -> worker:

    ```json
    { cmd: "matchRules", tileId: {z,x,y}, parsedFeatures: ParsedFeature[], contextFlags: {...} }
    ```

- worker -> 主线程:

    ```json
    { cmd: "razRules", tileId: {z,x,y}, razRules: RazRule[] }
    ```

注意：传输大量几何时使用 Transferable objects（ArrayBuffer/TypedArray）避免复制。

---

# 你的现有模块如何接入（文件级建议）

- `src/tiles/tile_manager.ts`
    - 负责 tile lifecycle、fetch 调度、缓存、LRU。增加状态机字段与事件发布（tileStateChanged）。

- `src/data/worker/loadTile.worker.ts`
    - 已存在：扩展为返回 `ParsedTile`，并保证返回的数据为 Transferable-friendly。

- `@buckets/*`
    - 扩展：增加 BucketCommand 接受器（从 RenderStrategy），提供 Batch 合并、triangulation、UploadBatch 产出。

- 新建 `src/rule_engine/*`
    - 包含 RuleTemplates loader、Rule matcher Worker、index structure。

- 新建 `src/renderer/gpu_manager.ts`、`src/renderer/renderer.ts`
    - 管理 GL resources、draw pass orchestration。

- 新建 `src/labels/label_placer.ts`
    - 屏幕投影 + occupancy grid + instance buffer 写入。

- 新建 `src/render_strategies/*`
    - 每一类 feature 的 `RenderStrategy`（LightStrategy, DepthAreaStrategy...），同时暴露 2D/3D 分支。

- Debug：`src/debug/overlay.ts`（tile bounds, razRule ids, drawKey counters, performance panel）

---

# 关键实现细节与优化建议（工程实践）

1. **尽量把 CPU 工作放到 Worker**
    - parse、rule matching、部分 triangulation（非依赖 screen）都放 worker。主线程只做 GPU upload、label final placement、draw。

2. **TypedArray + Transferable**
    - 在 worker -> 主线程间传输几何时必用 Transferable buffers。避免 JSON 序列化大数组。

3. **分级缓存（GPU / CPU / Disk）**
    - GPU: 最近帧使用的 buckets
    - CPU: parsedTile & razRules 缓存
    - Disk (IndexedDB): serialized RuleTemplates、symbol atlas、冷启动加速

4. **批次合并策略（drawKey）**
    - 设计稳定的 drawKey（penId:brushId:shaderVariant:atlasId）用于合并 draw calls。

5. **Label 放置稳定性**
    - 缓存 accepted placements per feature + inertia smoothing，避免缩放/平移时闪烁。

6. **边界与邻居策略**
    - 初期采用 margin-overfetch（简单可靠），后期可切进 global index 优化内存。

7. **逐步替换 / 渐进实现**
    - 先实现 basic pipeline（parse -> basic bucket -> gpu draw），再加入 ruleEngine、then labels、then neighbor rules、then 3D strategies。

8. **profiling & debug**
    - 必须实现渲染 debug overlay（tile ids, rules matched, draw calls, buffer sizes），这是优化的生命线。

9. **错误与退化策略**
    - fetch fail -> 使用 parent tile 或 raster fallback
    - parse/ruleEngine 超时 -> fallback 样式（快速模式）

---

# 单张 tile 完整示例时序（合并以上步骤，列出消息）

1. `render()` -> 调用 `TileManager.getVisibleTiles()` 得到 tile A
2. Tile A 状态 `idle` -> `fetching` → fetch bytes -> bytes returned
3. 主线程 `postMessage` bytes 到 `loadTile.worker`（cmd: parseTile）
4. worker 返回 `parsedTile`（cmd: parsedTile）
5. 主线程 `FeatureRouter` 分流：basic & enc lists
6. basic -> 直接调用 `Bucketizer.addBasicFeature(parsedFeature)`（快速路径）
7. enc -> `postMessage` 到 `ruleEngine.worker`（cmd: matchRules）
8. ruleEngine 返回 `razRule[]`（cmd: razRules）
9. 主线程 `RenderStrategyRegistry.get(objClass).render2D(razRule)` -> 产生 `BucketCommand[]`
10. `Bucketizer` 合并 `BucketCommand[]` -> `UploadBatch[]`
11. `GPUManager.upload(UploadBatch)` -> 返回 `GPUHandle`
12. `LabelPlacer` 投影 label candidates -> 生成 `LabelInstanceBuffer` -> GPU upload
13. render loop draw passes 按优先级 draw tile A 的 GPUHandles
14. mark tile.lastUsedFrame = currentFrame

---

# 实施里程碑（建议的分阶段任务清单）

**阶段 0：基础骨架（1-2 周）**

- 完成 TileManager state machine（idle->fetching->...）
- 完成 loadTile.worker.ts 返回 ParsedTile（transferable arrays）
- 简单 Bucketizer 支持 basic features -> VBO -> draw（area/line/point minimal shader）
- 简单 renderer render loop（按 pass draw已上传 buckets）

**阶段 1：规则引擎与 razRule（2-3 周）**

- 实现 RuleTemplates loader（JSON/DSL -> in-memory index）
- 实现 ruleEngine.worker（matchRules -> razRules）
- Integrate RenderStrategy stub that converts razRule -> BucketCommand

**阶段 2：Batching，Label placement（2-3 周）**

- 完整 Bucketizer（drawKey 合并、triangulation）
- Implement label placer + SDF glyph atlas
- Integrate LRU GPU eviction

**阶段 3：Neighbor rules、优化（2-4 周）**

- Implement margin-based neighbor handling
- Profiling, reduce drawCalls, instance batching, atlas packing improvements

**阶段 4：3D 支持 & hybrid（可选，长期）**

- Add RenderStrategy.render3D implementations
- Add scene graph / Three.js bridge or WebGPU backend

---

# 验收指标 & 测试用例（确保可交付）

- cold-start：从空缓存加载一个中等区域（100 tiles）所需时间
- fps：视图交互下平均帧率（目标 60/30 depending on device）
- memory：最大可用 tile count 在设定 memory under limit 时自动回收
- visual: 与 reference (OpenCPN/expected) 的差异小于阈值（对一组 gold tiles 做 pixel diff）
- correctness: ruleEngine 单元测试覆盖主要条件化规则

---

# 最后的小结（为什么这样做能和你现有代码最好融合）

- 你已有 `TileManager`、`loadTile.worker.ts`、`@buckets`、并且已经实现了点/线/面的渲染基础——这个设计把这些现有工作**逐步接入**（先走 basic pipeline），同时给 `ruleEngine`、`RenderStrategy`、`LabelPlacement` 等模块留出清晰接口，方便并行开发与测试。
- 核心原则：**razRule = 语义/意图层**；**RenderStrategy = 渲染实现层**；**Bucketizer/GPUManager = 性能层**。每层职责清晰，便于扩展到 3D/Hybrid。

---

如果你想，我可以立刻把上面的关键接口（`ParsedTile`、`RazRule`、`BucketCommand`、worker 消息格式、Tile 状态枚举）整理成**一个 TypeScript 接口草案文件**（`src/types/enc-runtime.d.ts`），或者把**单张 tile 时序图**转成一页流程图 PNG / SVG 方便在项目说明里使用——你想现在要哪一个？
