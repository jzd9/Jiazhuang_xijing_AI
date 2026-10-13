# V2_test 部署信息

## 线上入口

<https://qijing-ai-home-preview.mawellhihi.chatgpt.site/>

该地址对应 2026-10-09 冻结的 `V2_test` 功能基线。线上地址可能在未来继续发布新版本，因此判断某份代码是否与本基线完全一致时，应同时核对 Git 提交、Sites 版本号和校验值，而不能只看网址。

## 基线身份

| 字段 | 值 |
|---|---|
| Git commit | `7f9f3c03d1ac6b652aa9a8c649168660a821e882` |
| Sites project | `appgprj_6ac1d507ee648191acf8cc8b326860eb` |
| Sites version | `21` |
| Deployment | `appgdep_6ac71fb85df88191a3de9d5d9ad688a4` |
| Version ID | `appgprj_6ac1d507ee648191acf8cc8b326860eb~appgver_6df5f1a061608191b51fe35df2ac0fa0` |
| Audience | 继承现有站点访问范围，本快照不修改访问权限 |

## 代码入口

- 浏览器页面：`dist/index.html`
- 浏览器逻辑：`dist/app.js`
- Worker 源码：`worker/index.js`
- Worker 构建产物：`dist/server/index.js`
- 构建脚本：`scripts/build-worker.mjs`
- 校验脚本：`scripts/validate-worker.mjs`

## 运行时依赖

服务端通过托管环境变量读取百炼/DashScope 配置。密钥没有复制到本目录。恢复或重新部署时，先检查目标站点的运行时变量，不要从聊天记录、源文件或文档中恢复明文密钥。

## 版本边界

`V2_test` 是源代码和构建产物快照，不包含浏览器 `localStorage` 中的用户历史对话、上传图片和任务记录。那些数据属于具体浏览器设备上的本地状态，不应混入代码基线。
