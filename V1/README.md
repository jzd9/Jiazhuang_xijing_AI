# 栖境 AI 家居空间预览 V1

这是 2026-10-07 验收通过并发布的 V1 归档。

## 文件说明

- `index.html`：页面入口
- `app.js`：页面交互、上传、对话与生成流程
- `assets/`：页面示例图片资源
- `server/index.js`：包含百炼调用和多轮生成流程的完整服务端构建文件
- `source/worker/index.js`：服务端源文件
- `source/scripts/`：构建与验收脚本
- `source/hosting.json`：当前站点部署配置快照

直接查看页面可打开 `index.html`。需要真实调用图片生成接口时，应通过包含 `server/index.js` 的 Worker 环境运行，并配置 `DASHSCOPE_API_KEY`。

线上对应版本：<https://qijing-ai-home-preview.mawellhihi.chatgpt.site/>
