# RSI Lab：自我进化网页演示

这是一个可以每天自动长出“下一版”的静态网页演示项目。它把 RSI（Recursive Self-Improvement，自我递归改进）拆成可观察、可回滚的闭环：提出假设 → 生成候选变更 → 用指标评估 → 记录决策 → 提交代码 → 发布网页。

网页入口是 `dist/index.html`，每日进化数据的唯一事实来源是 `data/evolution.json`。`dist/data/evolution.json` 是供 Cloudflare Pages 静态发布使用的同步副本。

## 1. 项目设计

| 模块 | 目标 | 本项目中的实现 |
| --- | --- | --- |
| 观察（Observe） | 读取当前版本的状态与历史结果 | 网页加载 `evolution.json`，展示迭代轨迹、分数和最新决策 |
| 假设（Hypothesize） | 明确下一轮要改善什么 | `scripts/evolve.mjs` 从受控的 mutation pool 中挑选改进方向 |
| 变更（Modify） | 只应用边界内的变更 | 每天追加一条结构化记录，不直接修改工作流或权限配置 |
| 评估（Evaluate） | 判断是否值得采纳 | 用清晰度、稳定性、自主性、可学习性四个指标计算综合分 |
| 记忆（Remember） | 让系统知道自己走过的路径 | Git commit + `data/evolution.json` 保存每一轮的原因、变更与结果 |
| 发布（Publish） | 让最新状态对外可见 | GitHub Actions 调用 Wrangler 将 `dist/` 发布到 Cloudflare Pages |

## 2. RSI 的每日循环

| 时间 | 动作 | 产物 | 失败时的处理 |
| --- | --- | --- | --- |
| 每天 09:00（Asia/Shanghai） | GitHub Actions 启动 cron | 一次可追踪的 workflow run | workflow 失败，不产生代码提交 |
| 第 1 步 | 读取当前 `evolution.json` | 当前版本、最近分数、下一假设 | 数据格式校验失败则退出 |
| 第 2 步 | 选择一个候选方向并计算增量 | 新的 iteration 对象 | 当天已运行过则幂等退出 |
| 第 3 步 | 写入 canonical 数据与发布副本 | `data/` 与 `dist/data/` | 只提交允许的两个数据文件 |
| 第 4 步 | 提交到 GitHub | `chore: daily RSI evolution YYYY-MM-DD` | 无变化时不提交 |
| 第 5 步 | 部署到 Cloudflare Pages | 最新网页 URL | 保留上一个成功版本，等待下次重试 |

## 3. 数据契约

每轮进化都是一条可读、可比较、可审计的记录：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `date` | `YYYY-MM-DD` | 该轮执行日期 |
| `version` | string | 网页演示的版本号 |
| `hypothesis` | string | 本轮要验证的改进假设 |
| `changes` | string[] | 本轮允许的变更摘要 |
| `metrics` | object | 四个 0–100 的评估指标 |
| `decision` | `adopted\|hold` | 是否采纳本轮候选 |
| `rationale` | string | 让人能读懂的决策原因 |

## 4. 自动化配置

工作流文件为 `.github/workflows/daily-evolve.yml`，包含 `schedule` 与 `workflow_dispatch` 两种触发方式。

在 GitHub 仓库中配置以下 Actions secrets / variables：

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | 允许 Pages 部署的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare Account ID |
| `CLOUDFLARE_PROJECT_NAME` | Repository variable | Cloudflare Pages 项目名 |

初始化步骤：

1. 创建一个 Cloudflare Pages 项目，构建方式选择“无构建”，输出目录填 `dist`。
2. 将本项目推送到 GitHub 的默认分支。
3. 在 GitHub 配置上表中的 secrets / variable。
4. 手动运行一次 `Daily RSI evolution`，验证首次提交和 Cloudflare 部署。
5. 之后每天由 cron 自动运行；普通代码 push 则由 `deploy.yml` 发布。

## 5. 边界与安全护栏

- RSI 只在 mutation pool 中选择主题，不拥有修改工作流、权限、密钥和发布目标的能力。
- 每轮变化都必须有结构化理由，并通过 Git 保留完整历史。
- 同一天重复运行不会重复追加记录，便于手动重跑。
- 评估指标是演示用的启发式分数，不代表真实生产质量；接入真实系统时应替换为测试、性能和人工验收结果。
- Cloudflare 使用最小权限 API Token；密钥只存在 GitHub Actions secret，不写入网页和仓库。

## 6. 验收标准

| 验收项 | 通过标准 |
| --- | --- |
| 可读性 | 首页能看到项目目的、当前版本、指标、轨迹和设计表格 |
| 可重复 | 在 Actions 中手动运行，最多追加当天一条记录 |
| 可审计 | 每次变化都有 Git commit、日期、假设、变更和理由 |
| 可发布 | `dist/` 可直接作为 Cloudflare Pages 静态输出目录 |
| 可恢复 | 发布失败不会删除历史；修复凭据后可重新运行 workflow |

## 7. 版本控制

- 版本号采用 `v主版本.次版本.修订版本` 的 SemVer 形式，例如 `v0.7.0`。
- `data/evolution.json` 的 `project.versioning` 保存当前版本、更新时间和中文更新摘要。
- 每条 `iteration` 都记录版本号、日期、假设、变更内容、指标和决策，构成可读的版本历史。
- GitHub Actions 在产生新迭代后自动创建同名 Git tag，便于查看差异和回滚。
- 页面从数据动态读取当前版本，并用中文展示本次版本更新了什么。

## 本地预览

静态文件无需依赖安装，可在仓库根目录执行任意静态服务器，例如：

```bash
python -m http.server 4173 --directory dist
```

然后打开 `http://localhost:4173`。
