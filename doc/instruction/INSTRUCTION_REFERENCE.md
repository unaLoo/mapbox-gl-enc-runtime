# S-57 电子海图 Instruction 类型完整参考

## 📋 快速查询表

| 指令码 | 名称 | 用途 | 参数个数 | 常见用法 |
|-------|------|------|--------|---------|
| **TX** | Plain Text | 显示简单文字标签 | 9 | `TX(OBJNAM,3,1,2,'15110',1,0,CHBLK,29)` |
| **TE** | Numeric Text | 显示格式化数值 | 10 | `TE('%4.1lf','VERCCL',3,1,2,'15110',1,0,CHBLK,11)` |
| **SY** | Symbol | 显示点状符号 | 1-2 | `SY(ACHARE02)` / `SY(FAIRWY51,ORIENT)` |
| **LS** | Simple Line | 绘制简单线条 | 3 | `LS(DASH,2,CHMGD)` |
| **LC** | Complex Line | 绘制复杂线条 | 1 | `LC(ARCSLN01)` |
| **AC** | Area Color | 颜色填充区域 | 1 | `AC(LANDA)` |
| **AP** | Area Pattern | 图案填充区域 | 1 | `AP(AIRARE02)` |
| **CS** | Conditional | 条件符号化 | 1 | `CS(DEPARE01)` |

---

## 🎯 详细说明

### 1️⃣ TX - Plain Text (普通文本)

**功能**: 在对象位置显示简单文字标签，通常来自对象属性

**语法**:
```
TX(fieldName, horizontalAlign, verticalAlign, direction, fontID, bold, effect, color, fontSize)
```

**参数详解**:

| 参数 | 含义 | 常见值 |
|-----|------|-------|
| `fieldName` | 源字段名 | OBJNAM, TORHGT, VERCCL 等 |
| `horizontalAlign` | 水平对齐 | 1=左, 2=中, 3=右 |
| `verticalAlign` | 垂直对齐 | 1=上, 2=中, 3=下 |
| `direction` | 文字方向 | 2=横向, 3=纵向 |
| `fontID` | 字体编号 | '15110', '16120', '18110' |
| `bold` | 粗体 | 0=否, 1=是 |
| `effect` | 文字效果 | 0=无, 1=带背景框 |
| `color` | 颜色代码 | CHBLK, CHGRD, CHMGD |
| `fontSize` | 字体大小 | 11-29 像素 |

**示例**:
```javascript
TX(OBJNAM,3,1,2,'15110',1,0,CHBLK,29)          // 对象名，29像素，右对齐，加粗
TX(TORHGT,1,2,2,'15110',0,0,CHBLK,11)          // 灯塔高度，11像素，左对齐
TX(CATLND,2,2,2,'15110',0,0,CHBLK,20)          // 陆地类别，20像素，中对齐
```

---

### 2️⃣ TE - Numeric Text (数值文本)

**功能**: 显示格式化的数值（深度、高度、长度等）

**语法**:
```
TE(formatString, fieldName, horizontalAlign, verticalAlign, direction, fontID, bold, effect, color, fontSize)
```

**格式字符串**:

| 格式 | 含义 | 示例 |
|-----|------|------|
| `%s` | 字符串 | `TE('%s','OBJNAM',...)` → "OBJNAM值" |
| `%d` | 整数 | `TE('%d','VERCL',...)` → "125" |
| `%.1f` | 1位小数浮点数 | `TE('%.1f','VERCCL',...)` → "12.5" |
| `%4.1lf` | 宽度4, 1位小数 | `TE('%4.1lf','VERCCL',...)` → "  12.5" |
| `'prefix %4.1lf'` | 带前缀格式 | `TE('clr %4.1lf','VERCCL',...)` → "clr  12.5" |

**示例**:
```javascript
TE('%s','OBJNAM',3,1,2,'15110',1,0,CHBLK,29)                     // 对象名字符串
TE('%4.1lf','VERCCL',3,1,2,'15110',1,0,CHBLK,11)                 // 高度数值，1位小数
TE('clr cl %4.1lf','VERCCL',3,1,2,'15110',1,0,CHBLK,11)          // "clr cl 12.5"格式
TE('clr op %4.1lf','VERCOP',3,1,2,'15110',1,1,CHBLK,11)          // "clr op ..."格式
```

---

### 3️⃣ SY - Symbol (点符号)

**功能**: 在对象位置显示一个符号（灯标、浮标、灯塔等）

**语法**:
```
SY(symbolName)
SY(symbolName, rotationField)
```

**参数**:

| 参数 | 含义 | 示例 |
|-----|------|------|
| `symbolName` | 符号名称 | ACHARE02, TSSLPT51, DWRTPT51 |
| `rotationField` | (可选) 旋转字段 | ORIENT (对象会根据该字段值旋转) |

**常见符号**:

| 符号 | 对象类型 | 说明 |
|-----|---------|------|
| ACHARE02 | 锚泊区 | 锚泊区符号 |
| ACHBRT07 | 锚泊位 | 单个锚泊位符号 |
| BRIDGE01 | 桥梁 | 桥梁符号 |
| DWRTPT51 | 深水航道路点 | 路点符号 |
| FAIRWY51 | 航道 | 航道方向符号（支持旋转） |
| TSSLPT51 | 航道路点 | 航道路点符号（支持旋转） |

**示例**:
```javascript
SY(ACHARE02)                           // 显示锚泊区符号
SY(FAIRWY51,ORIENT)                   // 航道符号，根据ORIENT字段旋转
SY(DWRTPT51)                           // 显示路点符号
SY(BRIDGE01)                           // 显示桥梁符号
```

---

### 4️⃣ LS - Simple Line (简单线)

**功能**: 绘制地物的边界或路线

**语法**:
```
LS(lineStyle, lineWidth, color)
```

**参数**:

| 参数 | 含义 | 常见值 |
|-----|------|-------|
| `lineStyle` | 线条风格 | SOLD(实线), DASH(虚线), DOT(点线), DASHDOT(点划线) |
| `lineWidth` | 线条宽度 | 1-4 像素 |
| `color` | 线条颜色 | CHBLK, CHGRD, CHMGD, TRFCD |

**线条风格**:

```
SOLD     实线        ─────────────────
DASH     虚线        - - - - - - - - -
DOT      点线        · · · · · · · · ·
DASHDOT  点划线      - · - · - · - · -
```

**颜色代码**:

| 颜色代码 | 含义 | RGB 示例 |
|---------|------|---------|
| CHBLK | 黑色 | #000000 |
| CHGRD | 深灰色 | #333333 |
| CHGRF | 浅灰色 | #CCCCCC |
| CHMGD | 管制区深色 | #8B5A8B |
| CHMGF | 管制区浅色 | #DDA0DD |
| TRFCD | 交通线深色 | #FF0000 |
| TRFCF | 交通线浅色 | #FF6666 |
| CSTLN | 海岸线颜色 | 特殊 |

**示例**:
```javascript
LS(SOLD,1,CHBLK)                      // 黑色实线，1像素宽
LS(DASH,2,CHMGF)                      // 管制区浅虚线，2像素宽
LS(DASH,2,TRFCD)                      // 交通线虚线，2像素宽
LS(SOLD,4,CHGRD)                      // 深灰色实线，4像素宽（粗）
```

---

### 5️⃣ LC - Complex Line (复杂线)

**功能**: 绘制具有特殊效果的线条（如含符号、填充的线条）

**语法**:
```
LC(complexLineDefinition)
```

**说明**:
- LC 引用一个预定义的复杂线定义
- 可包含线条风格、线上符号、填充图案等
- 通常用于特殊导航线、电缆线、有标记的边界

**示例**:
```javascript
LC(ARCSLN01)                           // 弧形线定义
LC(PIPELN01)                           // 管线线定义
```

---

### 6️⃣ AC - Area Color (颜色填充)

**功能**: 用纯色填充一个面积对象

**语法**:
```
AC(colorName)
```

**常用颜色**:

| 颜色代码 | 含义 | 用途 |
|---------|------|------|
| LANDA | 陆地色 | 填充陆地 |
| DEPIT | 岛屿/陆地 | 填充岛屿 |
| DEPVS | 很浅水 | 填充浅水区 |
| DEPMS | 中浅水 | 填充中浅水区 |
| DEPDW | 深水 | 填充深水区 |
| NODTA | 无数据 | 填充未测量区 |
| CHBRN | 建筑色 | 填充建筑物 |

**示例**:
```javascript
AC(LANDA)                              // 陆地色填充
AC(CHBRN)                              // 建筑物填充
AC(DEPVS)                              // 浅水色填充
AC(NODTA)                              // 无数据区填充
```

---

### 7️⃣ AP - Area Pattern (图案填充)

**功能**: 用图案/纹理填充一个面积对象

**语法**:
```
AP(patternName)
```

**常用图案**:

| 图案名 | 用途 | 说明 |
|-------|------|------|
| AIRARE02 | 机场区域 | 斜线或格子图案 |
| PRTSUR01 | 测量不确定 | 网格或条纹图案 |
| FSHFAC03 | 钓鱼设施 | 特殊图案 |

**示例**:
```javascript
AP(AIRARE02)                           // 机场区域图案
AP(PRTSUR01)                           // 测量不确定图案
```

---

### 8️⃣ CS - Conditional Symbolization (条件符号化)

**功能**: 根据对象属性值动态选择绘制样式

**语法**:
```
CS(ruleSetName)
```

**说明**:
- CS 是最复杂的指令类型
- 规则集包含多个条件分支
- 每个分支对应不同的属性值和绘制方式
- 常见属性条件: DRVAL1(水深), STATUS(状态), CATREA(区域类别)

**常用规则集**:

| 规则集名 | 对应对象 | 条件 | 说明 |
|---------|---------|------|------|
| DEPARE01 | DEPARE | 水深值 | 根据DRVAL1显示不同颜色的水深区 |
| RESTRN01 | 多种 | 限制类型 | 根据CATRE/STATUS显示不同限制符号 |
| RESARE02 | 锚泊区等 | 区域状态 | 根据STATUS显示不同样式 |
| LNDARE01 | LNDARE | 陆地类别 | 根据CATLND显示不同颜色 |

**示例**:
```javascript
CS(DEPARE01)                           // 水深区条件规则
CS(RESTRN01)                           // 限制区条件规则
CS(RESARE02)                           // 资源区条件规则
```

---

## 🔄 指令组合示例

### 示例 1: 简单建筑物
```javascript
AC(CHBRN);TX(OBJNAM,1,2,2,'15110',0,0,CHBLK,26);LS(SOLD,1,CHBLK)
```
**执行顺序**:
1. `AC(CHBRN)` - 用褐色填充
2. `LS(SOLD,1,CHBLK)` - 黑色边界
3. `TX(OBJNAM,...)` - 显示名称

---

### 示例 2: 锚泊区
```javascript
SY(ACHARE02);LS(DASH,2,CHMGF);CS(RESTRN01)
```
**执行顺序**:
1. `SY(ACHARE02)` - 显示符号
2. `LS(DASH,2,CHMGF)` - 虚线边界
3. `CS(RESTRN01)` - 应用条件规则

---

### 示例 3: 水深区域（复杂）
```javascript
AC(NODTA);AP(PRTSUR01);LS(SOLD,2,CHGRD)
或
CS(DEPARE01)
```
**说明**:
- 第一行：用灰色和斜线图案表示无数据
- 第二行：用条件规则根据深度值自动着色

---

### 示例 4: 桥梁（带高度）
```javascript
SY(BRIDGE01);TE('clr cl %4.1lf','VERCCL',3,1,2,'15110',1,0,CHBLK,11);TE('clr op %4.1lf','VERCOP',3,1,2,'15110',1,1,CHBLK,11);LS(SOLID,4,CHGRD)
```
**执行顺序**:
1. `SY(BRIDGE01)` - 显示桥梁符号
2. `TE(...VERCCL...)` - 显示间隙高度
3. `TE(...VERCOP...)` - 显示运行高度  
4. `LS(SOLID,4,CHGRD)` - 粗边界线

---

## 🎨 特殊属性字段

### 常见的数值字段
```
DRVAL1      主要水深值 (深度数据中)
DRVAL2      次要水深值
VERCCL      间隙高度 (桥梁、管线等)
VERCOP      运行高度 (通过高度)
VERCCL      架空管线高度
TORHGT      灯塔高度
OBJNAM      对象名称 (通用)
ORIENT      方向 (用于旋转符号)
```

### 常见的分类字段
```
CATLND      陆地类别 (陆地对象)
CATRE       区域类别 (限制区等)
STATUS      状态 (运行、计划中、废弃等)
CATFRY      渡口类别
CATHAF      港口类别
CATPIL      引航点类别
```

---

## 📊 指令类型统计

| 类别 | 类型 | 用途 |
|-----|------|------|
| **文本** | TX, TE | 显示标签和数值 |
| **符号** | SY | 显示地物符号 |
| **线条** | LS, LC | 绘制线条 |
| **填充** | AC, AP | 填充区域 |
| **高级** | CS | 条件符号化 |

---

## 💡 最佳实践

1. **执行顺序很重要**: 先填充(AC/AP)，再边界(LS)，最后文本(TX/TE)
2. **条件规则优先**: 如果存在CS，通常会覆盖其他简单规则
3. **符号要清晰**: 在复杂背景上使用，需要确保可见性
4. **文本大小**: 11-15像素用于细节标签，20-29像素用于主要标签
5. **颜色搭配**: 注意对比度，确保在各种背景上都可见

---

## 🔗 相关资源

- **symbols table**: 存储所有符号定义 (chartsymbols.xml)
- **patterns table**: 存储所有图案定义
- **colors table**: 存储所有颜色定义
- **S52RAZDS.RLE**: 包含S-52标准的符号数据

