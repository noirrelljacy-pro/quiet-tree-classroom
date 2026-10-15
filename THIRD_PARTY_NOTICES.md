# 第三方声明

应用运行时没有第三方 JavaScript 库、外部图片、付费素材、音频或网络字体。树木、场景、图标 SVG/CSS 为本项目创建，使用系统字体。

构建与测试工具通过 npm 安装，不随源码复制 node_modules。2026-10-16 按 package-lock.json 的全部包元数据核查许可证：MIT、ISC、BSD-3-Clause、Apache-2.0，无缺失 license 字段。这是声明核查，不是独立法律审计。

| 直接开发依赖 | 本次锁定版本 | 许可证     | 来源                                    |
| ------------ | ------------ | ---------- | --------------------------------------- |
| Vite         | 7.3.7        | MIT        | https://github.com/vitejs/vite          |
| TypeScript   | 5.9.3        | Apache-2.0 | https://github.com/microsoft/TypeScript |
| Vitest       | 4.1.12       | MIT        | https://github.com/vitest-dev/vitest    |
| Prettier     | 3.9.10       | MIT        | https://github.com/prettier/prettier    |

传递依赖的精确版本与许可标记保留于 package-lock.json。工具内部打包代码还包含 BSD-2-Clause、CC0-1.0 等许可，详见各工具随附的 LICENSE / NOTICE；上方元数据清单不涵盖工具内部的每个模块。安装后的各包自带 LICENSE / NOTICE 应保留；如分发开发工具或打包依赖，需要一并保留其声明。应用生产包仅包含本项目代码及 Vite 构建注入的 modulepreload polyfill，相关许可全文见下方。构建时将本项目许可、本声明与锁定 Vite 包的完整 LICENSE.md 复制进 dist。

## Vite MIT License

Copyright (c) 2019-present, VoidZero Inc. and Vite contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

GitHub Actions 工作流参考 Vite 官方文档（来源链接在 docs/DEPLOYMENT.md），使用 GitHub 官方 actions；运行时由 GitHub 获取，仓库不分发其可执行文件。
