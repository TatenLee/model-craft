# Model Craft · 大模型学习实验室

面向有编程与数据工程经验、希望转向具身智能 / 世界模型训练算法的学习者。12 周课程，约 130 小时，不设独立数学基础章节。

## 本地启动

```bash
cd /Users/shawn/Code/model-craft
npm run dev
```

打开 http://127.0.0.1:4173 。应用使用原生 ES modules，无前端依赖安装和构建步骤。`dist/` 同时是维护的站点源码和静态发布目录。

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

## 内容与功能

- 12 周 / 36 节完整主课：正文、原创代码示例、理解检查、练习与一手资料。
- 概念地图覆盖预训练、后训练、AR、SFT、LoRA、JEPA、视觉塔、KDA、Decoder-only、世界模型、具身、LSD、MMLU、MMMU、MMStar 等。PT / rewardx 保留待确认语境；LSD 标记项目特定。
- 6 个交互实验：真实回归梯度更新、因果可见性、LoRA 参数预算、rollout、记忆与梯度窗口、Flow Matching 路径。
- 8 个浏览器 Python 练习：代码在 Web Worker 中通过 Pyodide 执行，真实断言评分。首次运行需访问固定版本的公开 CDN；运行可取消并有超时控制。
- 按周 / 阶段 / 概念测验与错题复习。
- 实验手记、课文笔记、进度导入导出；进度默认仅保存到浏览器 localStorage，没有跨设备云同步。
- 可下载的微型语言模型、动作条件世界模型 PyTorch 训练脚本。

## 验证

```bash
npm ci
npm run check
npm test
npm run test:python
python3 dist/downloads/check_exercises.py dist/downloads/exercise_solutions.py
```

`npm ci` 只为开发检查安装依赖，本地浏览课程不需要。`test:python` 首次需联网获取 Pyodide 标准库，它使用与网页相同的 Python 执行器和断言，在 Node 中运行 WASM。

首版已验证：全部课程与概念路由、阅读和笔记保存、收藏搜索、测验评分、实验记录创建编辑；8 个 Python 练习共 40 个参考解法断言通过，未完成代码和异常代码会被判失败。两个 PyTorch 示例已在 Mac CPU 上真实运行。固定 seed=42 的教学数据上，语言模型 40 步验证 loss 从 3.69 降至 1.51；世界模型 80 步 rollout MSE 从 0.234 降至 0.00167。这些数值仅是运行验证，不是现实任务性能承诺。

本次环境没有浏览器控制授权，尚未完成真实浏览器的视觉与 Web Worker/CDN 端到端验收；DOM 交互和 Python WASM 执行已分别验证。H20 与 MPS 训练尚未实测。

本地训练项目见 `dist/downloads/README.md`。GPU 训练不在浏览器内执行。学习进度区分“阅读完成”“测验最近答对”“代码检查通过”，不把读完页面当作能力认证。

## 维护

- `dist/data/curriculum.js`：课程和课文。
- `dist/data/concepts.js`：概念、来源和题库。
- `dist/data/exercises.js`：Python 练习、检查器与参考解法。
- `dist/app.js`、`dist/styles.css`：应用与响应式界面。
- `dist/labs.js`：可交互机制实验。
- `dist/state.js`：进度结构、导入校验。
- `.openai/hosting.json`：Sites 私有站点部署身份。

站点不包含公司仓库源码、数据或模型权重；OmniFM 只作为课程中的源码阅读与实验设计方向。后续实验须绑定实际使用的配置与数据版本。教学数值实验、机制图和真实训练结果明确区分。
