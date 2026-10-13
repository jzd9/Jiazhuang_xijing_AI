# 栖境 AI 家居空间预览 · 生图流程提示词文档

> **用途**：把本文档的提示词复制到其他生图软件（即梦 / 豆包 / Seedream / GPT-4o / Midjourney 等），生成一张"栖境 AI 生图流程"架构说明图。版式完全对标你提供的**电商购买 AI 流程图**（分层架构 + 步骤时间轴 + 右侧信息面板），节点内容 100% 来自项目真实实现（dist/index.html、dist/app.js、worker/index.js），未虚构。
>
> **推荐用法**：中文生图工具（即梦/豆包/Seedream）优先用【中文主提示词】；Midjourney/SDXL 类工具用【英文主提示词】。提示词较长时若工具支持不佳，改用【精简版】。

---

## 1 目标画面：版式语言（对标电商购买 AI 流程图）

| 版式元素 | 要求 |
| --- | --- |
| 画幅 | 横版信息图（4:3 或 16:10），白底，扁平矢量风 |
| 顶部 | 灰色标题带：产品名 + 流程名；右侧小字标注页面与模型 |
| 步骤时间轴 | ①–⑨ 九个步骤圆点横排，细箭头串联 |
| 主体 | 五个横向分层大框，从上到下：用户层（粉）→ 前端层（青）→ 服务端编排层（橙）→ AI 能力层（紫）→ 数据与治理层（蓝），层内白色圆角节点带编号（U/F/B/A/D） |
| 连线 | 实线黑箭头=主数据流；红虚线箭头=异常与重试回环；菱形=判断节点 |
| QC 分支 | 质检菱形出三条彩色线：绿 PASS / 琥珀 服务不可用 / 红 FAIL 纠错 |
| 右侧信息栏 | 三个叠放小卡：① 关键源码事实（红色数字圆标 4 条）② 核心价值（菱形图标）③ 图例 |
| 风格 | 细描边、圆角、留白充分、无照片无 3D 无渐变，中文小号英文副标注 |

---

## 2 节点内容依据：真实生图流程（写入图中的一切文字以此为准）

| 区块 | 真实内容 |
| --- | --- |
| 输入 | 空间原图（PNG/JPG ≤10MB）+ 商品参考图；操作类型"添加到照片/替换现有物品"；可选长宽高（厘米）；照片上点选"家具底部中心"；一句话要求 |
| 前端处理 | 点选坐标归一化为 X/Y 百分比；点选与文字矛盾时弹"请确认"（以点选位置为准 / 以文字描述为准）；任务快照冻结素材、坐标、Prompt 版本；五阶段进度（理解需求→生成基础效果→优化空间与光影→检查结果→完成） |
| 服务端 | 前端唯一接口 `/api/generate-stage`；API Key 仅存服务端环境变量；四轮调度 R0→R1→R2→R3，异步提交+轮询取图；无服务端数据库、无后台队列 |
| 模型 | qwen3-vl-plus（R0 空间分析输出 JSON 不生图；R3 质检评分）、qwen-image-3.0（R1 出图 1、R2 出图 2、纠错出图 3）——代码默认配置，线上实际值待确认 |
| QC 三分支 | PASS 交付最终图；服务不可用→交付图 2 标"QC 待确认"；FAIL→唯一一次纠错生图→复检（复检失败展示纠错图标 QC WARN） |
| 失败与重试 | 失败卡 + 红色"重新生成"= 用户手动新建任务、沿用素材、从 R0 重来（非自动循环） |
| 数据 | localStorage 存历史对话/任务/Prompt（约 12 段上限）；结果为云端图片 URL；每轮 request_id 可在管理员后台查 Round 0–3 |

---

## 3 中文主提示词（推荐，直接复制使用）

```
一张专业的中文技术架构信息图，扁平矢量风格，白色背景，细描边圆角矩形，黑色细箭头，清晰的中文无衬线字体，横版构图，留白充分，无照片无3D无渐变无装饰。

顶部灰色标题带：主标题"栖境 AI 家居空间预览｜生图流程：四轮生成 + 视觉质检"，右侧灰色小字"页面：index.html + worker · 模型：qwen3-vl-plus / qwen-image-3.0"。

标题带下方为步骤时间轴：九个绿色编号圆点横排，细箭头串联，依次标注：
① 表达要求 → ② 上传双图 → ③ 选择添加/替换 → ④ 点选落点 → ⑤ 冲突确认 → ⑥ 发送生成 → ⑦ 四轮生成 → ⑧ 质检 QC → ⑨ 交付/引用

主体为五个横向分层大框，从上到下排列，每个分层是带彩色描边的大圆角框，左上角有层名标签，层内放白色圆角节点，节点带编号，层与层之间用实线黑箭头连接：

第一层"用户层"（粉色描边），四个节点：
U1 输入素材：空间原图 + 商品参考图 + 可选尺寸 + 一句话要求
U2 点选落点：照片上点一下，代表家具底部中心
U3 冲突确认：以点选位置为准 / 以文字描述为准
U4 查看结果：引用这张图 / 下载 / 重新生成

第二层"前端层 dist/app.js"（青色描边），三个节点：
F1 坐标归一化：点选位置转为 X/Y 百分比
F2 任务快照：冻结素材、坐标、Prompt 版本
F3 进度渲染：理解需求 → 生成基础效果 → 优化空间与光影 → 检查结果 → 完成

第三层"服务端编排层 Cloudflare Worker"（橙色描边），节点：
B1 统一入口 /api/generate-stage：浏览器请求不带 Key
B2 四轮调度：R0 分析 → R1 基础 → R2 修正 → R3 质检，异步提交 + 轮询取图
B2 旁放一个琥珀色小警示框"无服务端数据库 · 无后台队列"，和一个绿色盾牌徽章"API Key 仅存服务端环境变量"

第四层"AI 能力层 · 阿里云百炼"（紫色描边），节点：
A1 qwen3-vl-plus 视觉理解：R0 空间分析（输出 JSON，不生图）
A2 qwen-image-3.0 图像编辑：R1 基础生成出图1 · R2 综合修正出图2 · 纠错重试出图3
A2 右侧放一个白色菱形判断节点"R3 质量检查"，菱形出三条彩色线：
绿色箭头标"PASS → 交付最终图"
琥珀色箭头标"服务不可用 → 交付图2，标注 QC 待确认"
红色箭头标"FAIL → 唯一一次纠错生图 → 复检"

第五层"数据与治理层"（蓝色描边），三个节点：
D1 localStorage：历史对话 / 任务记录 / Prompt 模板（上限约 12 段）
D2 结果图：云端图片 URL，浏览器直接展示与下载
D3 排障：每轮 request_id，管理员后台可查 Round 0–3

异常流（红色虚线箭头）：从第四层生成失败处引红色虚线向下到一个红色小卡"生成失败：失败卡 + 红色重新生成按钮"，再从该卡引灰色虚线回环到第四层 R0，回环线标注"用户手动重新生成 = 新任务从 R0 重来（非自动循环）"。

右侧信息栏为三个叠放的白色小卡：
第一卡"关键源码事实"，红色数字圆标四条：
① API Key 仅存服务端环境变量
② R0 分析只传基础图，商品图参考发生在 R1/R2 与 QC
③ 重新生成 = 新建任务从 R0 重来，不是自动重试
④ 任务状态由浏览器 localStorage 保存
第二卡"核心价值"，配菱形图标："一张房间照片 + 一张商品图 + 一句话 → 经视觉质检的融合效果图"
第三卡"图例"，配小图样：白色菱形=判断节点 · 白色圆角矩形=操作节点 · 彩色描边大框=系统分层 · 实线箭头=主数据流 · 红色虚线箭头=异常与重试

配色：粉、青、橙、紫、蓝仅作各层描边与标签色，节点底色一律白色，背景纯白，箭头黑色，文字深灰。所有中文文字必须准确清晰，无错字无乱码。
```

---

## 4 英文主提示词（Midjourney / SDXL 类工具）

```
A professional Chinese technical architecture infographic poster, flat 2D vector style, pure white background, thin gray outlines, rounded-corner cards, small black arrows, clean sans-serif Chinese typography, landscape layout, generous whitespace, no photos, no 3D, no gradients, no decoration.

Top gray title band: main title "栖境 AI 家居空间预览｜生图流程：四轮生成 + 视觉质检", small gray caption on the right "页面：index.html + worker · 模型：qwen3-vl-plus / qwen-image-3.0".

Below the title band, a horizontal step timeline: nine green numbered circles connected by thin arrows, labeled: ① 表达要求 ② 上传双图 ③ 选择添加/替换 ④ 点选落点 ⑤ 冲突确认 ⑥ 发送生成 ⑦ 四轮生成 ⑧ 质检 QC ⑨ 交付/引用

Main body: five wide horizontal layer boxes stacked vertically, each layer a large rounded box with a colored border and a layer-name label chip on its top-left, containing white rounded nodes with ID letters, layers connected downward by solid black arrows:

LAYER 1 用户层 (pink border), four nodes:
U1 输入素材：空间原图 + 商品参考图 + 可选尺寸 + 一句话要求
U2 点选落点：照片上点一下，代表家具底部中心
U3 冲突确认：以点选位置为准 / 以文字描述为准
U4 查看结果：引用这张图 / 下载 / 重新生成

LAYER 2 前端层 dist/app.js (teal border), three nodes:
F1 坐标归一化：点选位置转为 X/Y 百分比
F2 任务快照：冻结素材、坐标、Prompt 版本
F3 进度渲染：理解需求 → 生成基础效果 → 优化空间与光影 → 检查结果 → 完成

LAYER 3 服务端编排层 Cloudflare Worker (orange border), nodes:
B1 统一入口 /api/generate-stage：浏览器请求不带 Key
B2 四轮调度：R0 分析 → R1 基础 → R2 修正 → R3 质检，异步提交 + 轮询取图
next to B2 a small amber warning box "无服务端数据库 · 无后台队列" and a small green shield badge "API Key 仅存服务端环境变量"

LAYER 4 AI 能力层 · 阿里云百炼 (purple border), nodes:
A1 qwen3-vl-plus 视觉理解：R0 空间分析（输出 JSON，不生图）
A2 qwen-image-3.0 图像编辑：R1 基础生成出图1 · R2 综合修正出图2 · 纠错重试出图3
to the right of A2 a white decision diamond "R3 质量检查" with three colored outgoing arrows:
green arrow "PASS → 交付最终图"
amber arrow "服务不可用 → 交付图2，标注 QC 待确认"
red arrow "FAIL → 唯一一次纠错生图 → 复检"

LAYER 5 数据与治理层 (blue border), three nodes:
D1 localStorage：历史对话 / 任务记录 / Prompt 模板（上限约 12 段）
D2 结果图：云端图片 URL，浏览器直接展示与下载
D3 排障：每轮 request_id，管理员后台可查 Round 0–3

Exception flow (dashed red arrows): from a generation failure point in layer 4, a red dashed arrow goes down to a small red card "生成失败：失败卡 + 红色重新生成按钮", then a gray dashed arrow loops back up to layer 4 R0, labeled "用户手动重新生成 = 新任务从 R0 重来（非自动循环）".

Right sidebar: three stacked white cards:
Card 1 "关键源码事实" with red numbered circles:
① API Key 仅存服务端环境变量
② R0 分析只传基础图，商品图参考发生在 R1/R2 与 QC
③ 重新生成 = 新建任务从 R0 重来，不是自动重试
④ 任务状态由浏览器 localStorage 保存
Card 2 "核心价值" with a diamond icon: "一张房间照片 + 一张商品图 + 一句话 → 经视觉质检的融合效果图"
Card 3 "图例" with small symbols: 白色菱形=判断节点 · 白色圆角矩形=操作节点 · 彩色描边大框=系统分层 · 实线箭头=主数据流 · 红色虚线箭头=异常与重试

Color rules: pink, teal, orange, purple, blue used only as layer border and label colors; all nodes are white with dark gray Chinese text; pure white background; crisp legible Chinese characters, no garbled text.
```

---

## 5 精简版提示词（工具对超长提示词支持不佳时用）

```
扁平矢量风格的中文技术架构信息图，白底横版。五层彩色描边大框从上到下：用户层（粉）、前端层（青）、服务端编排层（橙）、AI能力层（紫）、数据与治理层（蓝），层内白色圆角节点用实线箭头连接。顶部九步时间轴：表达要求→上传双图→选择添加/替换→点选落点→冲突确认→发送生成→四轮生成→质检QC→交付/引用。AI层含节点：qwen3-vl-plus 空间分析与质检、qwen-image-3.0 基础生成与修正；白色菱形"R3 质量检查"出三条线：绿 PASS 交付、琥珀 服务不可用标待确认、红 FAIL 唯一一次纠错。红色虚线从失败处连到"失败卡+重新生成"小卡再回环到 R0，标注"手动重新生成=新任务从 R0 重来"。右侧信息栏三小卡：关键源码事实（Key 仅存服务端；R0 只传基础图；重新生成非自动重试；状态存 localStorage）、核心价值、图例。细描边圆角，中文清晰无乱码。
```

---

## 6 负面提示词（通用）

```
photorealistic photo, 3D render, glossy gradient, heavy decoration, unrelated illustration, people, faces, watermark, logo, QR code, garbled Chinese characters, broken text, mirrored or duplicated characters, English-only interface, blurry small text, cluttered layout
```

---

## 7 参数建议与人工核对要点

| 项 | 建议 |
| --- | --- |
| 画幅 | 横版 4:3 或 16:10（参考图为横版）；生 2–4 张挑字最准的一张 |
| 文字 | AI 渲染密集中文必有错字风险：生成后逐字核对，重点核对模型名（qwen3-vl-plus / qwen-image-3.0）、按钮名（引用这张图/下载/重新生成）、五阶段文案 |
| 逻辑 | QC 三分支颜色语义（绿/琥珀/红）、"重新生成=R0 回环非自动循环"、R0 标注"不生图"——三处最易被画错 |
| 拆分备选 | 一次生成效果差时，可按"五层 + 时间轴 + 右侧栏"拆三段分别生成再拼版 |
| 待确认 | 模型名为代码默认配置，线上实际生效值待确认；若对外发布建议在角落保留"依据 V2 版本真实功能整理" |
