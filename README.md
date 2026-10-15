# 安静小树 Quiet Tree

**把安静，种成一棵树。** 一个温和的课堂音量反馈小游戏：安静时成长，持续嘈杂时提醒、叶片下垂，恢复安静后继续生长，最终收获果实。

[在线体验](https://noirrelljacy-pro.github.io/quiet-tree-classroom/) · [状态规则](docs/STATE_RULES.md) · [实际验证](docs/VALIDATION.md)

纯静态前端，Vite + TypeScript + 原生 SVG/CSS，无运行时第三方依赖、后端、账号、排名、广告与付费 API。声音只在设备本地用于计算强弱，不录音、不上传、不转写。

项目源于一次匿名的教育产品现场交流：一位班主任希望把课堂音量变成可见的游戏反馈。项目发起人曾制作本地 HTML 版本并收到教师的积极反馈；**本仓库是独立重新实现的版本，尚未经教师或真实课堂验证**，没有效果、用户数量或满意度统计。

## 本地运行

需要 Node.js 22.12+（本次使用 Node.js 24）及 npm。在本项目文件夹内运行：

```sh
npm ci
npm run dev
```

打开终端打印的 localhost / `127.0.0.1` 地址。不要双击 `index.html`：源码需要 Vite 处理。

```sh
npm run typecheck  # TypeScript 严格检查
npm test          # 状态、校准、音频资源管理测试
npm run build     # 类型检查 + 生成 dist/
npm run preview   # 检查构建产物，默认 4173 端口
```

## 在课堂中使用

1. 点击「开启麦克风」，允许浏览器使用声音输入。
2. 保持期望的安静状态，采集 5 秒环境音量；进度完成后显示建议阈值，点击「开始本轮」。可以跳过校准，使用当前阈值（初次为 35）。
3. 在「照料设置」调整阈值、安静结果时长和嘈杂容忍时长，也可重新校准。
4. 点击「课堂展示」突出树木。若全屏不可用，使用页面内展示；Esc 或「退出展示」回到照料台。
5. 暂停会冻结游戏并释放麦克风；继续时重新开启。结束监测保留本轮进度。重新开始需确认；结果后可开始下一轮。

无需麦克风即可体验：点击「先体验演示模式」，拖动「模拟音量」，或选择「安静 / 持续嘈杂」。**演示模式不会采集课堂声音**，规则与真实输入相同，可切换到真实麦克风。为了快速体验，可把安静结果时长调为 30 秒；体验后恢复默认。

刷新页面不会保留本轮进度；只保留三个偏好设置，不保存班级、学生、声音、历史记录或统计。

## 默认参数

默认值集中在 [`src/config.ts`](src/config.ts)，完整规则见 [`docs/STATE_RULES.md`](docs/STATE_RULES.md)。这些值是本次设计的起点，并非已验证的最佳课堂参数。

| 参数         | 默认值          | 可调范围 / 含义                    |
| ------------ | --------------- | ---------------------------------- |
| 安静阈值     | 35 / 100        | 10–90；相对音量                    |
| 安静结果时长 | 180 秒          | 30–600 秒；累计有效安静时间        |
| 嘈杂容忍时长 | 8 秒            | 4–20 秒；达到后开始下垂            |
| 温和提醒     | 3 秒            | 高音量持续达到此时间               |
| 安静缓冲     | 2 秒            | 安静保持后重置嘈杂计时、恢复或成长 |
| 恢复速率     | 每秒 10% 健康度 | 叶片完全恢复后继续成长             |

## 麦克风使用条件与排障

麦克风依赖 `getUserMedia` 和 Web Audio API，需要 HTTPS 或 localhost、安全上下文、网站权限及操作系统输入权限。优先使用最新版 Chrome、Edge、Firefox 或 Safari；内嵌网页/WebView 和较旧浏览器可能不支持。建议单独打开顶层页面，iframe 还需要宿主明确授权 microphone。

如果拒绝授权，可在地址栏的网站权限中允许后重试；没有设备时连接麦克风；设备不可用时检查系统权限、连接和其他占用应用。也可以直接使用演示模式。授权弹窗长期不处理时，可点击「结束监测」取消应用侧等待；浏览器稍后返回的输入流也会被关闭。

暂停、结束、设备中断、后台切换或页面离开都会停止声音输入。后台返回后需要手动继续，不会补算离开期间的成长。操作系统将音频中断时也会暂停。

**相对音量不是分贝或 dB SPL。** 使用时域采样 RMS，经数字对数映射到 0–100 并平滑。没有专业声压校准，无法比较不同设备或教室的绝对噪声；硬件增益和浏览器处理可能影响读数。应用请求关闭自动增益、降噪与回声消除，但浏览器/硬件可能不执行这些偏好。

实现依据（2026-10-16 查阅）：[MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)、[MDN 时域采样](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData)、[MDN 页面可见性](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)、[MDN AudioContext 状态](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)。

## 隐私与无障碍

采样仅存在于当前页面内存，分析器不连接扬声器，不播放声音；没有录音器、网络上传、转写或内容识别代码。localStorage 仅保存阈值、成长时长、容忍时长；存储不可用时仍可使用。本应用不发起字体、追踪或广告请求。静态托管服务仍会接收普通网页访问请求，其日志由托管方管理。

按钮和滑块可用 Tab / Enter / 空格 / 方向键操作；对话框包含原生焦点约束和 Esc 关闭，焦点有可见描边。支持 `prefers-reduced-motion`、增强对比度与降低透明效果；状态同时使用文字和图像表达。未进行完整屏幕阅读器审计。

## 结构与维护

```text
src/config.ts         集中配置、设置边界
src/engine.ts         与 DOM/音频无关的纯状态规则、输入数学函数
src/audio.ts          麦克风生命周期、取消与异常映射
src/calibration.ts    独立的五秒校准器
src/preferences.ts    容错偏好存储
src/tree.ts           原创 SVG、分层叶冠与缓存渲染
src/visual-model.ts   连续成长与可解释的反馈模型
src/dom.ts            轻量渲染与重复写入抑制
src/timing.ts         首帧基准、节流容差与中断边界
src/strings.ts        状态中文文案，预留语言字典入口
src/main.ts           页面、会话控制、单一动画循环、事件协调
src/style.css         响应式与可访问性样式
tests/                Vitest 测试
docs/                 需求、规则、验证、部署与复盘
```

## 开源与部署

采用 [MIT](LICENSE) 许可。源代码和 SVG 为本项目创建，无付费素材或外部字体；开发依赖许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。欢迎按 [CONTRIBUTING.md](CONTRIBUTING.md) 贡献。

公开仓库：[noirrelljacy-pro/quiet-tree-classroom](https://github.com/noirrelljacy-pro/quiet-tree-classroom)。准备了 PR/主分支检查与 GitHub Pages 部署工作流，操作见 [部署说明](docs/DEPLOYMENT.md)。Pages 构建使用已确认仓库对应的 `/quiet-tree-classroom/` 路径；普通 `npm run build` 使用相对资源便于其他静态托管。部署是否通过以 Actions / Pages 返回结果及验证记录为准。

查看 [实际验证记录与限制](docs/VALIDATION.md)、[需求来源与范围](docs/REQUIREMENTS.md)、[项目复盘](docs/RETROSPECTIVE.md)。

## 视觉与流畅度迭代

已根据 Skill Finder 技能检索和 GitHub 类似项目源码阅读完成一轮优化：树冠连续生长、叶片分批展开、明确阶段、反馈等待进度、短暂声音演示，以及缩放型音量条和重复渲染抑制。[调研来源与取舍](docs/RESEARCH_AND_POLISH.md)记录了实际参考、未采用内容及许可边界。没有新增运行时依赖，也未将开发验证当作课堂效果。
