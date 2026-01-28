import { chromium, Browser, Page } from 'playwright-core';
import pLimit from 'p-limit';
import logger from '../config/logger';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { config } from '../config';

/**
 * 浏览器服务类，负责管理 Playwright 实例并提供 HTML 渲染功能
 * 采用单例模式并支持并发控制
 */
export class BrowserService {
  private static instance: BrowserService;
  private browser: Browser | null = null;
  private initPromise: Promise<void> | null = null;
  private isDisconnected = false;
  /** 并发限制器，防止同时开启过多浏览器页面导致 OOM */
  public limit = pLimit(config.playwright.concurrency);

  private constructor() {
    this.ensureInitialized().catch((e) =>
      logger.error('[service.browser] Initial background init failed: %s', e)
    );
    this.setupLifecycle();
  }

  /**
   * 获取 BrowserService 的全局单例
   */
  public static getInstance(): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService();
    }
    return BrowserService.instance;
  }

  /**
   * 确保浏览器实例已初始化并连接
   * @returns 初始化完成的 Promise
   */
  private async ensureInitialized(): Promise<void> {
    if (this.browser && this.browser.isConnected() && !this.isDisconnected) {
      return;
    }
    // 如果正在初始化且不是处于断开状态，则等待现有任务
    if (this.initPromise && !this.isDisconnected) {
      return this.initPromise;
    }

    // 否则（初始化未开始、已失败或浏览器已断开），启动/重新啟動初始化
    this.isDisconnected = false;
    this.initPromise = this.init();
    return this.initPromise;
  }

  /**
   * 执行实际的浏览器启动或连接逻辑
   */
  private async init() {
    logger.info('[service.browser] Initializing browser service...');
    try {
      if (config.playwright.wsEndpoint) {
        logger.info(
          '[service.browser] Attempting to connect to Playwright WS: %s',
          config.playwright.wsEndpoint
        );
        this.browser = await chromium.connect(config.playwright.wsEndpoint, {
          timeout: 10000,
        });
        logger.info(
          '[service.browser] Playwright browser connected to %s',
          config.playwright.wsEndpoint
        );
      } else {
        logger.info('[service.browser] Launching local browser instance...');
        this.browser = await chromium.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
          ],
          timeout: 10000,
        });
        logger.info('[service.browser] Playwright browser launched locally');
      }

      this.browser.on('disconnected', () => {
        logger.warn('[service.browser] Browser disconnected');
        this.browser = null;
        this.isDisconnected = true; // 标记为断开，后续 ensureInitialized 会触发重连
        if (config.exitWhenError) {
          process.exit(1);
        }
      });
    } catch (error) {
      const target = config.playwright.wsEndpoint || 'local instance';
      logger.error(
        '[service.browser] Failed to initialize browser (%s): %s',
        target,
        error
      );
      this.browser = null;
      this.initPromise = null;
      this.isDisconnected = true;
      throw error;
    }
  }

  private setupLifecycle() {
    const cleanup = async () => {
      await this.close();
      process.exit(0);
    };
    process.on('SIGINT', () => {
      void cleanup();
    });
    process.on('SIGTERM', () => {
      void cleanup();
    });
  }

  private async close() {
    if (this.browser) {
      this.browser.removeAllListeners('disconnected');
      await this.browser.close();
      this.browser = null;
      this.initPromise = null;
      logger.info('[service.browser] Browser closed');
    }
  }

  /**
   * 通用页面使用辅助函数，处理并发限制、Context 隔离和自动销毁
   * @param callback 在页面上下文中执行的异步函数
   * @param timeout 操作超时时间（毫秒）
   */
  public async usePage<T>(
    callback: (page: Page) => Promise<T>,
    timeout: number = 30000
  ): Promise<T> {
    return this.limit(async () => {
      await this.ensureInitialized();
      if (!this.browser || !this.browser.isConnected()) {
        throw new Error('Browser is not initialized or failed to connect');
      }

      const context = await this.browser.newContext({
        deviceScaleFactor: 2,
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
        viewport: { width: 1280, height: 720 },
      });

      try {
        const page = await context.newPage();
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });
        });

        // 资源拦截逻辑 (assets:// 协议) 并防止路径遍历
        void page.route(/^assets:\/\//, (route) => {
          const url = route.request().url();
          try {
            const parsedUrl = new URL(url);
            const relativePath = parsedUrl.pathname.replace(/^\/\//, ''); // 处理 assets:// 后面的路径
            const assetsRoot = resolve(process.cwd(), 'assets');
            const filePath = resolve(assetsRoot, relativePath);

            // 安全校验：確保路徑確實在 assets 目錄內（防止 .. 繞過）
            if (!filePath.startsWith(assetsRoot)) {
              logger.warn(
                '[service.browser] Security blocked path traversal attempt: %s',
                url
              );
              return void route.abort('accessdenied');
            }

            if (existsSync(filePath)) {
              const buffer = readFileSync(filePath);
              void route.fulfill({
                status: 200,
                body: buffer,
              });
            } else {
              logger.warn('[service.browser] Asset not found: %s', filePath);
              void route.abort('failed');
            }
          } catch {
            logger.error(
              '[service.browser] Failed to parse asset URL: %s',
              url
            );
            void route.abort('failed');
          }
        });

        return await Promise.race([
          callback(page),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          ),
        ]);
      } finally {
        await context.close();
      }
    });
  }

  /**
   * 渲染 HTML 并截图
   * @param html HTML 内容
   * @param selector 要截图的选择器，默认为 #render-target
   * @param timeout 超时时间（毫秒）
   */
  public async render(
    html: string,
    selector: string = '#render-target',
    timeout: number = 10000
  ): Promise<Buffer> {
    const startTime = performance.now();
    try {
      return await this.usePage(async (page) => {
        logger.debug('[service.browser] Setting page content...');
        // 优化：改用 domcontentloaded 并显式等待图片和选择器
        await page.setContent(html, { waitUntil: 'domcontentloaded' });

        await Promise.all([
          page.waitForSelector(selector, { timeout }),
          page.waitForFunction(
            () => {
              const images = Array.from(document.querySelectorAll('img'));
              return images.every((img) => (img as HTMLImageElement).complete);
            },
            { timeout }
          ),
        ]);

        logger.debug(
          '[service.browser] Content ready, taking screenshot of %s',
          selector
        );
        const buffer = await page.locator(selector).screenshot();

        const duration = (performance.now() - startTime).toFixed(2);
        logger.info(
          '[service.browser] Render completed in %s ms (selector: %s)',
          duration,
          selector
        );
        return buffer;
      }, timeout + 5000);
    } catch (error) {
      logger.error('[service.browser] Render failed: %s', error);
      throw error;
    }
  }
}

export const browserService = BrowserService.getInstance();
