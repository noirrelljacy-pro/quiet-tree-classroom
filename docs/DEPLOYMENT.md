# GitHub Pages 部署

默认仓库名 `quiet-tree-classroom`，公开，MIT。先确认已登录账户及同名仓库是否存在，已有项目需先检查内容，不能覆盖。

本项目已在确认同名仓库不存在后创建为公开仓库：[noirrelljacy-pro/quiet-tree-classroom](https://github.com/noirrelljacy-pro/quiet-tree-classroom)。下面的首次发布步骤适用于新的 fork / 其他账户，不要再次创建已存在的本项目仓库。本次发布结果见 VALIDATION.md。

## 首次发布

完成本机授权（不要把 token 发到聊天或写入仓库）：

```sh
gh auth login --hostname github.com
gh auth status
gh api user --jq .login
```

检查 `OWNER/quiet-tree-classroom`（OWNER 替换为上一步真实账户），不存在才创建：

```sh
gh repo view OWNER/quiet-tree-classroom
gh repo create quiet-tree-classroom --public --description "安静小树：温和、隐私友好的课堂音量反馈小游戏" --source . --remote origin --push
```

如果已经存在：先 `gh repo view`、检查远端内容和分支，再决定关联，切勿强制推送。上述创建命令只适用于确认不存在时。源码目录已是独立 Git 仓库，不能从包含私人求职文件的父目录操作。

进入仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。仓库管理员也可用 API：

```sh
gh api --method POST repos/OWNER/quiet-tree-classroom/pages -f build_type=workflow
gh workflow run pages.yml
```

若 Pages 已启用，应在设置页面确认并更改来源，避免重复创建。工作流完成后，从 Actions 部署输出或仓库 Pages 设置页复制真实 URL。不要在工作流失败、授权缺失或部署未完成时宣称上线。

## 工作流与路径

`ci.yml` 在 push main 和 pull_request 时安装锁定依赖、类型检查、测试与构建。`pages.yml` 在 main 推送或手动触发时再次验证并上传 dist、部署 Pages；PR 不部署。部署权限只授予发布 job，普通检查仅 contents:read。

`npm run build:pages` 使用 Vite 的 github-pages mode，将 base 设置为真实仓库对应的 `/quiet-tree-classroom/`；可用 `npm run preview:pages` 检查该产物及子路径。普通 `npm run build` 的 `base: './'` 生成相对资源，适合其他静态托管或自定义域名。Fork 更名后要修改 vite.config.ts 中的项目路径，自定义域名可改用普通 build。Pages 工作流使用 GitHub 的 `${{ steps.deployment.outputs.page_url }}`，线上地址来自实际仓库部署。应用没有前端路由，刷新不需要 SPA 回退配置。

依据 [Vite 官方静态部署说明](https://vite.dev/guide/static-deploy) 与其 [Pages 工作流](https://github.com/vitejs/vite/blob/main/docs/guide/static-deploy-github-pages.yaml)（2026-10-16 查阅）。工作流 action 固定到该官方示例使用的提交，便于审计；后续更新应复查来源。

也可将 dist 内容发布到其他支持 HTTPS 的静态服务器，无需环境变量和密钥。普通局域网 HTTP 地址无法使用麦克风；localhost 可本机验证。
