# 详细时序与责任（逐步展开）

下面以**单张 tile**为例，按时间线逐步展开并标注对应模块/文件建议放置位置（以你现有目录为例）。

## 0) 视图/相机变更（主线程，Mapbox customLayer 的 render 或你的 render loop） 🆗

- 触发：用户缩放/平移/rotate 或每帧 tick（requestAnimationFrame）。
- 操作：
    - 更新 `viewport`（projection matrices, zoom, center, dpr）。
    - 调用 `TileManager.getVisibleTiles(viewport)`（`src/tiles/tile_manager.ts`）。

- 输出：`visibleTiles: TileID[]`（按优先级排序）

## 1) TileManager 发起加载 / 调度（主线程） ✖️

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
