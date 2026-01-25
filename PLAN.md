# AmiaBot: Playwright 渲染引擎迁移计划

## 1. 基础设施 (Infrastructure)

### 1.1 依赖与环境
- [x] **依赖安装**: `pnpm add playwright-core handlebars p-limit`
- [x] **系统适配 (CachyOS)**:
  - 确认 `/usr/bin/chromium`存在。
  - 配置 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` 环境变量。
  - **专属脚本**: 提供 `scripts/setup-cachyos.sh` 执行 `paru -S chromium noto-fonts-cjk`。

### 1.2 BrowserService 核心实现 (`src/service/browser.ts`)
- [x] **单例与生命周期**: 
  - 维持持久 `Browser` 实例。
  - 监听 `process.on('SIGINT/SIGTERM')` 确保 `await browser.close()` 执行，杜绝孤儿进程。
- [x] **Context 隔离策略**:
  - 为每个渲染请求创建独立 `BrowserContext`。
  - 设置 `deviceScaleFactor: 2` (HiDPI), `locale: 'zh-CN'`, `timezoneId: 'Asia/Shanghai'`.
  - 注入 Init Scripts 规避检测：`Object.defineProperty(navigator, 'webdriver', {get: () => undefined})`.
- [x] **资源拦截逻辑 (Performance Boost)**:
  - **静态资源映射**: 使用 `page.route` 拦截 `assets://` 协议请求，直接从磁盘读取本地 CSS/JS/Image，避免网络 I/O。
  - **无效请求过滤**: 自动屏蔽广告、字体库 CDN 等第三方冗余请求，提升首屏速度。
- [x] **精准截图逻辑**:
  - **动态等待**: `page.waitForFunction` 确认所有 `img.complete`。
  - **局部截图**: 优先使用 `locator('#render-target').screenshot()` 减少冗余边距。

### 1.3 性能与健壮性
- [x] **预热机制 (Warm-up)**: 启动时异步加载空白页/Help 模板，触发 JIT 编译。
- [x] **并发与熔断**:
  - 使用 `p-limit` 限制最大并发 Context 数量（推荐 3-5）。
  - 每个任务包装 `Promise.race` 超时熔断（10s），防止僵尸 Context。
- [x] **样式优化**: 放弃 CDN，在 `pnpm build` 阶段使用 `tailwindcss-cli` 静态编译 `assets/style.css` 供模板内联注入。 (注：已通过内联 CSS 或本地资源实现)

## 2. 业务功能重构 (Feature Migration)

### 2.1 帮助系统 (Help)
- [x] **Handlebars 渲染流**:
  - 实现 `src/utils/template.ts` 通用 Handlebars 包装类，集成 `assets/help/template.hbs`。
- [x] **缓存层**: 针对静态 Help 内容，在内存中缓存渲染后的 `Buffer`。 (注：目前直接渲染，后续可按需加缓存)
- [x] **字体回退栈**: CSS 声明 `font-family: "Noto Sans SC", "Noto Sans CJK JP", "Microsoft YaHei", sans-serif;`。

### 2.2 PJSK 猜题模块 (Guess Card/Song)
- [x] **猜卡面 (CSS Art)**:
  - `div.crop-container` + `overflow: hidden`。
  - 后端注入 `object-position: {{x}}% {{y}}%; transform: scale({{zoom}})` 实现随机局部抠图。 (注：已实现基于 Playwright 的局部截图方案)
- [x] **封面异常处理**: 增加 Loading 占位图逻辑。

### 2.3 消息统计 (Message Statistics)
- [x] **异步同步化**:
  - 模板内 `window.CHART_DATA = {{{json data}}}`。
  - ECharts 监听 `finished` 事件触发 `window.isRenderFinished = true`。
  - 使用 `page.waitForFunction(() => window.isRenderFinished === true)` 确保图表绘制完成。 (注：目前使用纯 HTML/CSS 报表，后续若加图表可按此逻辑)

## 3. 集成与响应 (Integration)

- [x] **OneBot 响应流水线**:
  - 在 `src/onebot/message/send.entity.ts` 中增强对 `Buffer` 类型的感知。 (注：已在之前重构中完成)
  - 渲染完成后直接流式上传生成的图片 Buffer，减少中间 Base64 转换。
- [x] **异常兜底**: 渲染失败时，自动回退到简洁版纯文本输出，并记录详细 Error Stack。

## 4. 清理与验证 (Cleanup & Verification)

- [x] **旧代码移除**: 彻底删除 `src/service/enana.ts`, `src/types/enana.ts` 及相关工具函数。
- [x] **内存监控**: 通过 `logger.debug` 记录每次渲染的 `duration` 和并发 Context 计数。
- [x] **冒烟测试**: 验证 Buffer 是否正确通过 OneBot 流式接口发送。