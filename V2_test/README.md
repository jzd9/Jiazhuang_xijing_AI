# 栖境 AI 家居空间预览 — V2_test

当前可运行版本的冻结快照，创建于 2026-10-09（Asia/Shanghai）。

该目录用于保存本轮迭代完成后的稳定基线。后续修改应在项目工作目录或新的版本副本中进行，不应直接覆盖本目录。

## 对应版本

- 线上地址：<https://qijing-ai-home-preview.mawellhihi.chatgpt.site/>
- Sites 项目名称：栖境 AI 家居空间预览
- Sites `project_id`：`appgprj_6ac1d507ee648191acf8cc8b326860eb`
- Sites 版本号：`21`
- Git 基线提交：`7f9f3c03d1ac6b652aa9a8c649168660a821e882`
- 对应部署 ID：`appgdep_6ac71fb85df88191a3de9d5d9ad688a4`
- 对应版本 ID：`appgprj_6ac1d507ee648191acf8cc8b326860eb~appgver_6df5f1a061608191b51fe35df2ac0fa0`
- 发布状态：`succeeded`

## 归档内容

- `dist/`：可部署产物，包括 HTML、前端 JavaScript、图片资源及 Worker 构建产物。
- `worker/`：服务端生成管线源代码。
- `scripts/`：构建与部署前校验脚本。
- `.openai/hosting.json`：Sites 项目配置快照；不包含运行时密钥。
- `BASELINE_COMMIT.txt`：基线提交编号。
- `DEPLOYMENT_INFO.md`：线上部署与功能范围说明。
- `SHA256SUMS.txt`：归档文件校验值。

## 本基线包含的关键能力

- 房间图作为主编辑图，商品图作为参考图的场景理解式图片编辑。
- Round 0 需求解析、Round 1 基础生成、Round 2 综合修正、Round 3 质量检查。
- 实际只生成 Round 1、Round 2 两张过程图。
- 管理员后台查看每轮 Prompt、状态、耗时、请求 ID 和中间图。
- 对话归属固定、历史效果图引用、失败任务重试、历史对话删除。
- 原始宽高比与归一化点选坐标保留。
- Round 3 质检服务异常时保留并展示 Round 2 结果，标记为 `QC 待确认`。
- 对已有 Round 2 结果、但因百炼质检 500 而失败的历史任务进行定向恢复。

## 校验与恢复

在 `V2_test` 目录运行：

```bash
node scripts/build-worker.mjs
node scripts/validate-worker.mjs
```

恢复时建议将本目录复制到新的工作目录，再进行修改。不要在本目录内直接继续开发，以避免失去基线。

## 安全说明

API Key 等运行时凭据由托管环境保存，不应写入本归档、Git 提交或项目文档。如果后续部署缺少凭据，应通过站点运行时环境变量重新配置。
