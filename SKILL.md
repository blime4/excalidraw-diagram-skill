---
name: excalidraw-diagram
description: Generate Excalidraw diagrams from text content for Obsidian. Use when user asks to create diagrams, flowcharts, mind maps, or visual representations in Excalidraw format. Triggers on "Excalidraw", "画图", "流程图", "思维导图", "可视化", "diagram".
metadata:
  version: 1.4.0
---

# Excalidraw Diagram Generator

Create Excalidraw diagrams from text content, outputting Obsidian-ready `.md` files.

## Workflow

1. Analyze content - identify concepts, relationships, hierarchy
2. Choose diagram type (see below)
3. Generate Excalidraw JSON
4. **Run overlap detection** — `validate-layout.py --json` on the generated JSON; fix any overlaps before proceeding
5. Generate Obsidian-ready `.md` file with Excalidraw frontmatter
6. **Automatically save to current working directory**
7. Notify user with file path and confirm save successful

## Output Format

**严格按照以下结构输出，不得有任何修改：**

```markdown
---

excalidraw-plugin: parsed
tags: [excalidraw]

---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠== You can decompress Drawing data with the command palette: 'Decompress current Excalidraw file'. For more info check in plugin settings under 'Saving'

# Excalidraw Data

## Text Elements
文本内容1 ^elementId1

文本内容2 ^elementId2

%%
## Drawing
\`\`\`json
{JSON 完整数据}
\`\`\`
%%
```

**关键要点（违反任何一条都会导致无法新增元素）：**
- **Frontmatter 前后必须有空行**：`---` 后空一行再写内容，内容后空一行再写 `---`
- **文件扩展名必须是 `.excalidraw.md`**：不能用 `.flowchart.md`、`.comparison.md` 等自定义后缀
- **`## Text Elements` 必须填充内容**：列出每个文本元素的 `originalText` + ` ^elementId`，每个元素之间空一行
- **`%%` 必须在 Text Elements 内容之后**：不能紧跟在 `## Text Elements` 后面
- Frontmatter 必须包含 `tags: [excalidraw]`
- JSON 必须被 `%%` 标记包围
- **元素 ID 只能用 `[A-Za-z0-9]`**：不能包含下划线 `_`、连字符 `-` 等。`^pd_chip` 会被插件解析为 ID=`pd`，导致 ID 不匹配
- **index 字段必须使用单前缀 `a` 系列**：如 `a1, a2, ... a9, aA, aB, ... aZ, aa, ab, ...`。**禁止**跨前缀（如 `a1` 跳到 `b1`），否则 Obsidian 插件无法新增元素。详见下方 Index 规则

## Diagram Types & Selection Guide

选择合适的图表形式，以提升理解力与视觉吸引力。

| 类型 | 英文 | 使用场景 | 做法 |
|------|------|---------|------|
| **流程图** | Flowchart | 步骤说明、工作流程、任务执行顺序 | 用箭头连接各步骤，清晰表达流程走向 |
| **思维导图** | Mind Map | 概念发散、主题分类、灵感捕捉 | 以中心为核心向外发散，放射状结构 |
| **层级图** | Hierarchy | 组织结构、内容分级、系统拆解 | 自上而下或自左至右构建层级节点 |
| **关系图** | Relationship | 要素之间的影响、依赖、互动 | 图形间用连线表示关联，箭头与说明 |
| **对比图** | Comparison | 两种以上方案或观点的对照分析 | 左右两栏或表格形式，标明比较维度 |
| **时间线图** | Timeline | 事件发展、项目进度、模型演化 | 以时间为轴，标出关键时间点与事件 |
| **矩阵图** | Matrix | 双维度分类、任务优先级、定位 | 建立 X 与 Y 两个维度，坐标平面安置 |
| **自由布局** | Freeform | 内容零散、灵感记录、初步信息收集 | 无需结构限制，自由放置图块与箭头 |

## Design Rules

### Text & Format
- **所有文本元素必须使用** `fontFamily: 5`（Excalifont 手写字体）
- **文本中的双引号替换规则**：`"` 替换为 `『』`
- **文本中的圆括号替换规则**：`()` 替换为 `「」`
- **字体大小规则**：
  - 标题：24-28px
  - 副标题：18-20px
  - 正文/说明：14-16px
- **行高**：所有文本使用 `lineHeight: 1.25`

### Layout & Design
- **画布范围**：建议所有元素在 0-1200 x 0-800 区域内
- **元素间距**：确保元素间距适当，整体布局美观
- **层次清晰**：使用不同颜色和形状区分不同层级的信息
- **图形元素**：适当使用矩形框、圆形、箭头等元素来组织信息

### Layout Validation & Overlap Detection（必须执行）

生成 JSON 后、写入文件前，**必须运行重叠检测**。

#### 间距规则
- **同级元素最小间距**：10px（相邻矩形、文本之间）
- **容器内边距**：15px（容器边框到子元素的距离）
- **独立文本之间**：至少 10px 垂直间距

#### 文本宽度估算公式

Excalidraw 中 `width` 字段不一定反映实际渲染宽度，必须用以下公式估算：

```
CJK字符宽度 = fontSize × 1.0（每字符）
Latin字符宽度 = fontSize × 0.55（每字符）
文本高度 = 行数 × fontSize × lineHeight
```

**常见陷阱**：声明 `width: 200` 但实际中文文本渲染宽度为 400px → 重叠。

#### 验证脚本

使用 [references/validate-layout.py](references/validate-layout.py) 进行自动检测：

```bash
# 方式1：直接传 JSON 字符串
python validate-layout.py --json '{"type":"excalidraw",...}'

# 方式2：检查已生成的文件（仅支持未压缩的 json 格式）
python validate-layout.py diagram.excalidraw.md
```

脚本会：
- 检测所有元素的包围盒重叠（排除合法的容器↔文本绑定和区域框↔子元素）
- 用文本估算公式修正独立文本的实际宽度
- 输出每对重叠元素的像素重叠量和修复建议
- 退出码：0 = 无重叠，1 = 有重叠，2 = 输入错误

#### 生成流程（更新）

```
1. 构建 elements 数组
2. 运行 validate-layout.py --json 检测重叠
3. 如果有重叠 → 根据建议调整坐标 → 重新检测
4. 重叠为 0 后 → 写入 .excalidraw.md 文件
```

#### 常见重叠模式与修复

| 模式 | 原因 | 修复 |
|------|------|------|
| 独立文本互相覆盖 | 中文文本实际宽度远大于声明宽度 | 用估算公式计算真实宽度，增大 x 间距 |
| 描述文本溢出容器 | 文本放在容器外但坐标在容器范围内 | 将文本绑定为容器文本，或移到容器外部 |
| 相邻行的矩形重叠 | y 坐标间距不够 | 确保 `y_next >= y_prev + height_prev + 10` |
| 标签与箭头目标重叠 | 标签坐标与目标元素坐标相近 | 标签放在元素上方或下方，留出 15px |

### Color Palette
- **标题颜色**：`#1e40af`（深蓝）
- **副标题/连接线**：`#3b82f6`（亮蓝）
- **正文文字**：`#374151`（灰色）
- **强调/重点**：`#f59e0b`（金色）
- **其他配色**：建议使用和谐的配色方案，避免过多颜色

参考：[references/excalidraw-schema.md](references/excalidraw-schema.md)

## JSON Structure

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://github.com/zsviczian/obsidian-excalidraw-plugin",
  "elements": [...],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

## Element Template

Each element requires these fields:

```json
{
  "id": "unique-id",
  "type": "rectangle",
  "x": 100, "y": 100,
  "width": 200, "height": 50,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "index": "a1",
  "roundness": {"type": 3},
  "seed": 123456789,
  "version": 1,
  "versionNonce": 987654321,
  "isDeleted": false,
  "boundElements": [],
  "updated": 1751928342106,
  "link": null,
  "locked": false
}
```

Text elements add:
```json
{
  "text": "显示文本",
  "rawText": "显示文本",
  "fontSize": 20,
  "fontFamily": 5,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": null,
  "originalText": "显示文本",
  "autoResize": true,
  "lineHeight": 1.25
}
```

See [references/excalidraw-schema.md](references/excalidraw-schema.md) for all element types.

---

## Additional Technical Requirements

### Text Elements 处理（关键！）
- `## Text Elements` 部分**必须填充**每个文本元素的内容和 `^elementId` 标记
- 格式：每个文本元素占一段，内容后跟 ` ^elementId`（空格 + ^ + 元素ID），段落之间空一行
- `%%` 注释标记必须在所有 Text Elements 内容之后
- **如果 Text Elements 为空，Obsidian 插件将无法正常新增元素（已有元素可编辑但新增元素保存后消失）**

示例：
```
## Text Elements
标题文本 ^title1

正文内容 ^body1

说明文字 ^note1

%%
## Drawing
```

### 坐标与布局
- **坐标系统**：左上角为原点 (0,0)
- **推荐范围**：所有元素在 0-1200 x 0-800 像素范围内
- **元素 ID**：每个元素需要唯一的 `id`，**只能包含 `[A-Za-z0-9]` 字符**（如 `title1`、`box1`、`pdchip`）。**禁止使用下划线 `_`、连字符 `-` 或其他特殊字符**，因为 Excalidraw 插件用 `^[A-Za-z0-9]+` 解析 Text Elements 中的 ID，下划线会截断匹配

### Index 字段规则（关键！违反会导致无法新增元素）

Excalidraw 使用 fractional indexing 确定元素的绘制顺序。**必须遵守以下规则**：

1. **所有 index 必须使用同一个前缀 `a`**：如 `a1, a2, a3, ... a9, aA, aB, ... aZ, aa, ab, ... az`
2. **禁止跨前缀**：如 `a1, a2, ... a5, b1, b2` 会导致 Obsidian 插件无法新增元素
3. **index 必须在 elements 数组中严格单调递增**
4. **index 序列生成方法**：

```
字符序列：1 2 3 4 5 6 7 8 9 A B C D E F G H I J K L M N O P Q R S T U V W X Y Z a b c d e f g h i j k l m n o p q r s t u v w x y z
第 N 个元素的 index = "a" + 序列[N-1]
```

示例（50 个元素）：
```
a1, a2, a3, ... a9, aA, aB, ... aZ, aa, ab, ... ax
```

**错误示例**（会导致无法新增元素）：
```
a0, a1, a2, ... a6, b0, b1, b2    ← 跨前缀，禁止！
a1, b1, a2, a3, b2                  ← 非单调递增，文件无法打开！
```

### Required Fields for All Elements
```json
{
  "id": "unique-identifier",
  "type": "rectangle|text|arrow|ellipse|diamond",
  "x": 100, "y": 100,
  "width": 200, "height": 50,
  "angle": 0,
  "strokeColor": "#color-hex",
  "backgroundColor": "transparent|#color-hex",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid|dashed",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "index": "a1",
  "roundness": {"type": 3},
  "seed": 123456789,
  "version": 1,
  "versionNonce": 987654321,
  "isDeleted": false,
  "boundElements": [],
  "updated": 1751928342106,
  "link": null,
  "locked": false
}
```

### Text-Specific Properties
文本元素 (type: "text") 需要额外属性：
```json
{
  "text": "显示文本",
  "rawText": "显示文本",
  "fontSize": 20,
  "fontFamily": 5,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": null,
  "originalText": "显示文本",
  "autoResize": true,
  "lineHeight": 1.25
}
```

### appState 配置
```json
"appState": {
  "gridSize": null,
  "viewBackgroundColor": "#ffffff"
}
```

### files 字段
```json
"files": {}
```

## Implementation Notes

### Auto-save & File Generation Workflow

当生成 Excalidraw 图表时，**必须自动执行以下步骤**：

#### 1. 选择合适的图表类型
- 根据用户提供的内容特性，参考上方 「Diagram Types & Selection Guide」 表
- 分析内容的核心诉求，选择最合适的可视化形式

#### 2. 生成有意义的文件名
- **文件扩展名必须是 `.excalidraw.md`**：不能用 `.flowchart.md`、`.comparison.md` 等自定义后缀
- 格式：`[主题].excalidraw.md`
- 例如：`内容创作流程.excalidraw.md`、`Axton商业模式.excalidraw.md`
- 优先使用中文以提高清晰度

#### 3. 使用 Write 工具自动保存文件
- **保存位置**：当前工作目录（自动检测环境变量）
- **完整路径**：`{current_directory}/[filename].excalidraw.md`
- 这样可以实现灵活迁移，无需硬编码路径

#### 4. 确保 Markdown 结构完全正确
**必须按以下格式生成**（不能有任何修改）：

```markdown
---

excalidraw-plugin: parsed
tags: [excalidraw]

---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠== You can decompress Drawing data with the command palette: 'Decompress current Excalidraw file'. For more info check in plugin settings under 'Saving'

# Excalidraw Data

## Text Elements
文本内容1 ^elementId1

文本内容2 ^elementId2

%%
## Drawing
\`\`\`json
{完整的 JSON 数据}
\`\`\`
%%
```

#### 5. JSON 数据要求
- ✅ 包含完整的 Excalidraw JSON 结构
- ✅ 所有文本元素使用 `fontFamily: 5`
- ✅ 文本中的 `"` 替换为 `『』`
- ✅ 文本中的 `()` 替换为 `「」`
- ✅ JSON 格式必须有效，通过语法检查
- ✅ 所有元素有唯一的 `id`
- ✅ 包含 `appState` 和 `files: {}` 字段
- ✅ **运行 `validate-layout.py` 重叠检测通过（0 overlaps）**

#### 6. 用户反馈与确认
向用户报告：
- ✅ 图表已生成
- 📍 精确的保存位置
- 📖 如何在 Obsidian 中查看
- 🎨 图表的设计选择说明（选择了什么类型的图表、为什么）
- ❓ 是否需要调整或修改

### Example Output Message
```
✅ Excalidraw 图已自动生成！

📍 保存位置：
Axton_2026商业模式.excalidraw.md

🎨 图表选择说明：
我选择了「关系图」来表现三大产品线之间的转化关系，用箭头展示用户的升级路径，以及它们如何共同构成完整的商业闭环。

📖 使用方法：
1. 在 Obsidian 中打开此文件
2. 点击右上角「MORE OPTIONS」菜单
3. 选择「Switch to EXCALIDRAW VIEW」
4. 即可看到可视化的商业模式全景

需要调整吗？比如改变布局、添加更多细节或调整配色，直接告诉我！
```
