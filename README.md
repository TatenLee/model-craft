# Model Craft · 大模型学习实验室

面向希望从零建立模型认知、亲手训练并完成独立项目的学习者。不预设职业、公司仓库、GPU 或完成期限。默认入口是 `#/book`：一本按因果关系展开的实践书，所有方向共用训练闭环，再按任务扩展。

## 六卷目录

| 卷 | 核心问题与产物 |
| --- | --- |
| 第一卷：按需补齐入门工具 | Python、数字、张量与必要数学；已有编程经验可检查后跳读。 |
| 第二卷：通用训练闭环 | 输入/目标 → wx+b → loss/梯度 → MLP/PyTorch → 独立验证。 |
| 第三卷：语言、视觉、图像、视频 | 编码、骨干、目标与采样；AR、Decoder-only、DINO、CLIP、Diffusion、Flow、DiT 与多模态接口。 |
| 第四卷：模型训练全生命周期 | 完整流程 → 预训练 → 中训练 → 后训练 → 跨阶段方法 → 同模型阶段对照。后训练明确包含 SFT、偏好、奖励、RL、PPO/GRPO、蒸馏/OPD/MOPD；LoRA/QLoRA 与 RL 基础单列。 |
| 第五卷：世界、机器人、Agent | 状态/表示预测、JEPA、rollout、SSM/KDA、策略、VLA、规划、工具与反馈；OmniFM 为可选源码案例。 |
| 第六卷：工程与独立项目 | 稳定训练、资源、架构选型、推理、评测、消融、论文/代码审计与作品交付。 |

共 **23 章、74 节**。保留并归位原有 36 篇主课；新增 3 节入门带练与 35 节桥接/生命周期正文。每节包含新词解释、具体推演、分步任务、排错提示、互动题与观察记录；23 章各有不同的综合任务。浏览器可用的机制题内嵌在阅读页，本地或 GPU 实验明确给出运行入口与验收边界。

目录的卷、章、节均可跳转；每层都有导读。侧栏展开当前章节，阅读页提供段落导航、前后翻页与章末回顾。自动保存小节与段落内位置，首页“继续阅读”恢复位置。记录阅读、答题、当前代码和观察，**已读不会自动通过练习**，修改代码后旧检查失效。

原有 84 个每日单元、10 个工作坊、16 个机制关卡、20 个机器人案例阶段与结构/概念库仍可访问，旧链接、笔记、代码和成绩保留。P 是项目身份、M 是机制练习、R 是可选机器人案例，不再是互相竞争的必修顺序。原课文的旧笔记可以从章节末尾进入。默认导航指向书籍，周课和其他路径收进参考资料。

## 实践与范围

- 84 道浏览器 Python 挑战：48 道每日/综合、8 道专项、16 道项目机制、7 道结构、2 道机器人接口、3 道训练生命周期题。使用真实 Pyodide worker，支持样例、自定义输入、完整检查与停止执行；首次需联网加载固定版本运行时。
- 原有 36 个课内可运行示例与 3 个新入门例子均按预期输出验证。理解题、开放题自查与代码成绩分开；平台不使用 GPT 账号或 GPT 自动判卷。
- [生命周期小实验](projects/lifecycle-lab/README.md)：仅 Python 标准库，保存 base/mixed/domain_only/task_demo 四个快照，比较固定分域 NLL。它是加平滑的一阶字符计数模型，没有反向传播、回答 mask、完整 SFT 或 RL；用来讲阶段谱系与分布权衡。真实梯度训练接 P01/P02。
- [项目实战](projects/README.md)：微型语言模型、可选基座 SFT/LoRA、离散偏好、合成视觉、二维 Flow、低维世界模型、状态/规划、推理机制与源码审计。每项区分实现存在、实际运行与效果证据。
- [机器人参考工程](projects/robot-workbench/README.md)：真实 CPU 标定/动力学训练、解析视觉、规则大脑、MPC、多目标闭环与多教师机制。规则大脑不冒充通用语言 Agent；解析教师不冒充完整 RL 教师训练。
- 结构库含 11 类、83 项结构与相关机制、26 个代表模型/系列拆解，资料快照为 2026-11-10。SWA/DSA、SSM/Mamba、DeltaNet/KDA、MoE、KV/位置/视觉/生成/执行等按设计层级比较。MOPD 归训练路线。目录不宣称穷尽所有模型变体。
- 完整图像/视频生成与后训练、真实 VLA、工业 KDA kernel、多卡/H20 性能尚未完成。DINO 本地权重适配器已存在，真实权重运行仍需验收。二维 Flow、合成 CNN 与低维动力学不能代替这些完整复现。各方向页面标出已有与待补项。

## 本地运行与存储

```bash
npm run dev
```

打开 http://127.0.0.1:4173 。`dist/` 是维护源码与静态发布目录，无前端构建步骤。开发检查需要 `npm ci`；只浏览课程不需要安装 Node 依赖。

学习记录保存在浏览器 `localStorage` 的 `model-craft:learning:v1`，新书籍记录位于 `book` 字段。旧版备份兼容，旧已读不会自动变成新章节验收。导出/导入包含书籍阅读位置、笔记、代码、答题和实验记录；没有账号登录或跨设备自动同步。换域名或设备前先导出备份。

主题与可收缩侧栏偏好保存在 `model-craft:appearance:v1`；浅色、暗色、跟随系统可切换，不重建正在编辑的代码。训练输出默认写入已忽略的 `.openai/local/`。公开包按允许列表生成，不包含公司源码、数据、配置或权重。

## 发布到 GitHub Pages

以 `model-craft/` 作为项目和 GitHub 仓库根目录：仓库首页直接显示 `dist/`、`package.json` 和 `.github/`。现有 Git 仓库及 `common/` 子模块已保留，不需要再次执行 `git init`。

根目录中的 `model-craft-site.tar.gz` 是之前供 Sites 部署使用的快照，不参与 GitHub Pages 发布，无需上传或解压。`dist/downloads/model-craft-labs.zip` 则是课程中供学习者下载的训练材料，需要保留在仓库中。

1. 确认 GitHub 上已创建 `TatenLee/model-craft` 仓库，并将其设为 **Public**。若尚未创建，请创建空仓库，不勾选初始化 README、`.gitignore` 或 License。
2. 本地已配置 `origin = git@github.com:TatenLee/model-craft.git`，无需再次执行 `git remote add`。在项目根目录提交并推送：

```bash
cd /Users/shawn/Code/model-craft
git add .
git commit -m "Add Model Craft learning app and Pages deployment"
git push -u origin main
```

3. 打开 [仓库的 Pages 设置](https://github.com/TatenLee/model-craft/settings/pages)，在 **Build and deployment → Source** 选择 **GitHub Actions**。这是首次发布的必要设置；仅上传工作流不会自动启用 Pages。仓库已自带工作流，不需要再创建示例工作流。
4. 打开 **Actions → Deploy GitHub Pages → Run workflow**，选择 `main` 并运行。首次 push 可能早于启用 Pages；启用后手动运行一次即可。
5. 两个 job 都成功后，在 **Settings → Pages** 或部署任务中打开网站。默认项目地址为 `https://tatenlee.github.io/model-craft/`，访客无需登录 GPT 或 GitHub。

之后更新内容：

```bash
git add .
git commit -m "Update learning content"
git push
```

工作流会在每次推送到 `main` 时运行 JavaScript 检查、课程与交互测试、Python 参考解法检查，通过后发布 `dist/`。它只需要 GitHub 自动提供的工作流凭据，不需要配置 GPT API key、Sites 凭据或个人 token 到仓库。现有 `.openai/hosting.json` 仅用于原 Sites 部署，GitHub Pages 不依赖它。

学习进度按网站来源保存在浏览器中。换到 GitHub Pages 地址前，在原站点导出进度，再到新站点导入；登录账号不会自动迁移进度。

参考：[GitHub Pages 发布源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

### 发布失败排查

- **`Get Pages site failed` / `HttpError: Not Found`**：优先检查仓库 **Settings → Pages** 是否已经启用，并把 Source 设为 **GitHub Actions**。若该页面只显示升级提示，请核对仓库可见性和账号套餐：GitHub Free 支持公开仓库的 Pages，私有仓库需要支持它的套餐。完成设置后运行最新 `main` 分支的工作流。
- **`enablement` 提示**：当前工作流有发布所需的 `pages: write` 和 `id-token: write` 权限。`configure-pages` 的 `enablement: true` 另需非默认的令牌，因此不能只添加这一行就让默认 `GITHUB_TOKEN` 自动启用 Pages。手动开启一次即可，之后正常发布无需额外令牌。
- **Node.js 20 弃用提示**：指 Action 自身的运行环境，与项目里 `setup-node` 的版本设置不同。工作流已升级到 `configure-pages@v6`、`upload-pages-artifact@v5` 和 `deploy-pages@v5`。
- **`ubuntu-latest` 迁移提示**：指 GitHub 托管运行器镜像将发生变化。工作流已固定为 `ubuntu-24.04`。这类迁移警告不是 Pages API 返回 404 的原因。

修改工作流后应推送新提交，再在 **Actions → Deploy GitHub Pages** 查看新运行或手动运行最新 `main`。对旧运行点击 Re-run 会使用旧提交中的工作流。若只修改了仓库 Pages 设置，则可以直接重跑原有运行。

参考：[configure-pages 的输入与令牌要求](https://github.com/actions/configure-pages/blob/v6/action.yml)、[GitHub Pages 可用范围](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。

## 验证与维护

```bash
npm ci
npm run check
npm test
npm run test:python
python3 -m unittest discover -s projects/lifecycle-lab -p 'test_*.py'
python3 dist/downloads/check_exercises.py dist/downloads/exercise_solutions.py
python3 -m compileall -q projects
python3 scripts/package_projects.py --check
# 在已安装 PyTorch 的环境中：
(cd projects/robot-workbench && python -m unittest robot.tests)
```

Node 检查覆盖完整目录、旧课归位、前置链接、每层路由、正文/理解题、阅读与验收分离、段落恢复、备份兼容、现有每日/项目/结构/主题交互。Python WASM 验证 313 条参考断言、未完成代码被拒绝、36 个旧示例与 3 个入门示例的实际输出。生命周期检查覆盖同起点分叉、固定预算、快照重载、参数约束与确定性；CPU 机器人测试覆盖训练、状态、恢复和闭环。

真实浏览器视觉与浏览器 CDN/Web Worker 端到端尚未验收；DOM 交互和 Python WASM 分别验证。GPU、多卡性能与完整预训练权重实验需要对应环境。上述检查不构成学习效果或就业认证。

| 维护位置 | 职责 |
| --- | --- |
| `dist/data/book.js` | 六卷/章/节、稳定路由 ID 与材料归属；改标题不要改 ID。 |
| `dist/data/book-training.js`、`book-units.js`、`book-reviews.js` | 生命周期正文、桥接正文与逐章综合任务。 |
| `dist/data/book-practice.js`、`foundations.js` | 新机制题与公共入门。 |
| `dist/book-content.js`、`book-state.js`、`book-ui.js`、`book.css` | 旧材料适配、独立进度、阅读恢复与书籍页面。 |
| `dist/data/course/`、`days.js`、`practice/` | 原有课文、每日练习与周综合；旧入口保留。 |
| `dist/data/projects.js`、`workshops.js`、`journey.js` | 机制关卡、项目工作坊与可选机器人案例。 |
| `dist/data/architectures.js`、`architecture-lessons.js`、`architecture-sources.js` | 结构族、导学、比较与原始来源。 |
| `dist/state.js`、`preferences.js` | 备份兼容、外观偏好。 |
| `projects/`、`scripts/package_projects.py` | 本地教学代码与下载包允许列表。 |

新增内容时必须给出概念定义、推演、实际任务、失败诊断与来源；声明只完成机制的地方，不能写成完整模型已复现。与 OmniFM 的映射只依据授权本地源码和真实运行配置，支持某功能不代表当前 run 已启用。
