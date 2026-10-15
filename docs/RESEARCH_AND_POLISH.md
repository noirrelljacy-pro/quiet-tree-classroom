# 类似项目研究与视觉优化记录

调研日期：2026-10-16。项目目标仍是温和、默认静音、声音本地处理的课堂反馈；本次没有引入后端或游戏引擎。

## Skill Finder 实际检索

先检查了已有技能，使用 skills CLI 实时检索了 frontend-design、animation、game-development。当前 CLI 把多余的 limit 参数视为查询内容，因此后续改用单个关键词搜索。

| 技能                      | 来源与适配判断                                                                                                                                        | 本次使用                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| frontend-design           | [Anthropic 源文档](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)；适合真实产品视觉、布局、字体、设计克制            | 已读取并用于自然主题、树木主视觉和减少装饰性标签                 |
| animation-performance     | [Emil Kowalski 源文档](https://github.com/emilkowalski/skills/blob/main/skills/animation-performance/SKILL.md)；直接针对绘制成本、继承变量和 DOM 更新 | 已读取，用于 transform/opacity、直接写局部样式、缓存与相等值检查 |
| apple-design              | 本环境已安装；[上游技能库](https://github.com/emilkowalski/skills/tree/main/skills/apple-design)                                                      | 延续已有指导，关注连续反馈、可中断过渡、减少动态                 |
| improve-animations        | 同一库的审计/规划技能                                                                                                                                 | 仅比较适配性；本次需要直接实现，因此未采用它的规划工作流         |
| game-development 搜索结果 | 含 Unity、Godot、Phaser 等引擎方向                                                                                                                    | 与当前轻量 SVG/TypeScript 栈匹配度较低，本轮未引入               |

本轮读取技能作为指导，没有安装额外技能包、运行其附带脚本或给网页增加服务依赖。技能内容、安装量和检索排序会变化，搜索热度不代表适合本项目。

## 直接 GitHub 检索与源码阅读

实际使用 GitHub 仓库搜索，关键词包括 classroom noise、classroom noise tree、noise meter game、silence classroom、bouncy balls microphone。下表只列实际读取过的相关项目，不声称搜索覆盖所有类似产品。

| 项目与检查版本                                                                                                                                                     | 实际看到了什么                                                                         | 对安静小树的启发与边界                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [YaoSiQian/BouncyBalls](https://github.com/YaoSiQian/BouncyBalls/blob/c3bf97eb13f00c14e413143bd6831839b54187e0/index.html)                                         | 声控弹球、不同球样式，requestAnimationFrame 驱动视觉；音频部分含平滑与 ScriptProcessor | 反馈直接作用于主体；本项目让树木在初期也持续改变，沿用自己的 AnalyserNode 输入实现     |
| [TondaKantorka/classroom-noise-monitor](https://github.com/TondaKantorka/classroom-noise-monitor/blob/b22623b62c911c08d4bd5a827121085ed86a7839/index.html)         | 阈值、提醒冷却、倒计时和快捷时间；有音效和红色提醒；将频域 RMS 简单映射后标为 dB       | 教师需要理解何时反馈。本项目增加等待原因与反馈进度，保持相对音量命名和静音             |
| [jaimefreeby-debug/classroom-noise-tracker](https://github.com/jaimefreeby-debug/classroom-noise-tracker/blob/c1d56f5744184195602836969cad52f2f282c31e/index.html) | 三色灯加文字、RMS 阈值判断、单个动画循环及停止输入的处理                               | 状态应同时以文字和视觉表达，本项目新增当前成长阶段与反馈状态；保留自己的缓冲、恢复规则 |

读取时这些仓库根目录未发现明确的许可证文件，未复制任何源码、SVG、CSS 或图片。这里是交互与工程做法比较，所有新增树木和实现均在本项目独立编写。外部项目没有经过本项目的完整运行或课堂验证。

## 本轮落地

视觉方向为一座小小的林间绿岛。底色、苔绿、嫩叶色和浅金果实继续服务课堂大屏；字体使用本地系统楷体/衬线回退，没有网络字体。原创 SVG 新增叶脉、树皮层次、分批叶冠和温和结果标记。

- 幼苗从初期开始长高，与小树连续交接；跨 25% / 65% 阶段边界不突变几何尺寸。
- 树冠分四批展开；叶片下垂方向与所在一侧一致，恢复反向展开；果实到目标才出现。
- 四个阶段明确标记当前步骤，本轮有效运行时间排除暂停。
- 新增反馈原因与等待进度，以及短暂声音演示按钮。演示与真实输入仍共用引擎。
- 音量条改成缩放，音量在现有 RAF 中更新；树木/文案最多约 10 次每秒，控件只在会话切换时更新。
- 捕获节点并跳过相同样式/文本/属性，避免重复开启过渡。静态音量和静态树木渲染器有 120 次重复调用不产生额外 DOM 写入的测试。
- 移除叶片逐个滤镜与模糊阴影。生长、下垂、恢复与庆祝仅改变缩放、旋转和透明度；无循环漂移、闪烁或新增声音。

## 浏览器调度问题

实测内置浏览器可能出现 1.0001 秒的帧间隔；旧代码以大于 1 秒为中断，导致误暂停。现在首帧建立基准，中断容差 2.5 秒，每帧有效推进仍上限 0.25 秒；后台主动暂停和资源释放不变。节流时会保守变慢，不补算未知声音区间；这是准确性取舍，不是声称设备能稳定 60 FPS。

验证记录见 [VALIDATION.md](VALIDATION.md)。真实中低端设备帧率、系统节流、麦克风和课堂教学效果仍需实机/教师验证。后续可在获得匿名试用反馈后调整树冠密度、参数节奏和展示布局。

性能依据：[MDN CSS 与 JavaScript 动画性能](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance)。加速取决于浏览器、SVG 与具体设备，本项目未作 GPU 加速或帧率保证。

最后复核了浏览器将 1.000 / 0.0deg 序列化为 1 / 0deg 的边界，渲染工具同时缓存期望值与实际序列化值，避免成长期间重复写入相同叶片样式；外部更改样式后仍可正确恢复。对应两项回归使总测试数为 50。
