import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import pLimit from 'p-limit';
import logger from '../config/logger';
import { join, resolve, relative, isAbsolute } from 'path';
import { readFileSync, existsSync } from 'fs';
import { config } from '../config';

export class BrowserService {
  private static instance: BrowserService;
  private browser: Browser | null = null;
  private initPromise: Promise<void> | null = null;
  public limit = pLimit(config.playwright.concurrency);

  private constructor() {
    this.ensureInitialized();
    this.setupLifecycle();
  }

  public static getInstance(): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService();
    }
    return BrowserService.instance;
  }

  private async ensureInitialized() {
    if (this.browser && this.browser.isConnected()) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.init();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

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
    }
  }

  private setupLifecycle() {
    const cleanup = async () => {
      await this.close();
      process.exit(0);
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  private async close() {
    if (this.browser) {
      this.browser.removeAllListeners('disconnected');
      await this.browser.close();
      this.browser = null;
      logger.info('[service.browser] Browser closed');
    }
  }

  /**
   * 通用页面使用辅助函数，处理并发限制、Context 隔离和自动销毁
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
        await page.route(/^assets:\/\//, (route) => {
          const url = route.request().url();
          try {
            const parsedUrl = new URL(url);
            const relativePath = parsedUrl.pathname.replace(/^\/\//, ''); // 处理 assets:// 后面的路径
            const assetsRoot = resolve(process.cwd(), 'assets');
            const filePath = resolve(assetsRoot, relativePath);

            // 安全校验：确保请求路径在 assets 目录内
            const relativeFromRoot = relative(assetsRoot, filePath);
            const isInside =
              !relativeFromRoot.startsWith('..') &&
              !isAbsolute(relativeFromRoot);

            if (!isInside) {
              logger.warn(
                '[service.browser] Security blocked path traversal attempt: %s',
                url
              );
              return route.abort('accessdenied');
            }

            if (existsSync(filePath)) {
              const buffer = readFileSync(filePath);
              route.fulfill({
                status: 200,
                body: buffer,
              });
            } else {
              logger.warn('[service.browser] Asset not found: %s', filePath);
              route.abort('failed');
            }
          } catch (e) {
            logger.error(
              '[service.browser] Failed to parse asset URL: %s',
              url
            );
            route.abort('failed');
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
