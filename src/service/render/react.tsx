import React from 'react';
import { renderToString } from 'react-dom/server';
import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { browserService } from '../browser.js';
import logger from '../../config/logger.js';
import { retry, RetryOptions } from '../../utils/retry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * React 渲染引擎服务
 * 将 React 组件转换为 HTML 字符串，并由 BrowserService 渲染为图片
 */
export class ReactRenderer {
  private static cssCache: string | null = null;

  /**
   * 获取编译后的 Tailwind CSS
   */
  private static async getStyles(): Promise<string> {
    if (this.cssCache) return this.cssCache;

    try {
      // 在生产环境中，我们会读取预编译的 CSS 文件
      // 这里使用基于文件路径的绝对路径解析
      const cssPath = resolve(__dirname, '../../../assets/styles.css');
      this.cssCache = await fs.readFile(cssPath, 'utf-8');
      return this.cssCache;
    } catch (e) {
      logger.error('[service.render.react] Failed to load styles: %s', e);
      return '';
    }
  }

  /**
   * 将 React 组件渲染为图片 Buffer
   * @param component React 组件实例
   * @param selector 截图目标选择器，默认截图 #app 容器
   * @param retryOptions 重试配置
   */
  public static async renderToImage(
    component: React.ReactElement,
    selector: string = '#screenshot-wrapper',
    retryOptions?: RetryOptions
  ): Promise<Buffer> {
    const contentHtml = renderToString(component);
    const styles = await this.getStyles();

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>${styles}</style>
          <style>
            /* 确保字体和基础样式 */
            body { margin: 0; padding: 0; background: transparent; }
            * { transition: none !important; animation: none !important; }
          </style>
        </head>
        <body>
          <div id="screenshot-wrapper" style="display: inline-block; padding: 20px;">
            ${contentHtml}
          </div>
        </body>
      </html>
    `;

    const operation = () => browserService.render(fullHtml, selector);
    const defaultOptions: RetryOptions = {
      maxAttempts: 3,
      delay: 1000,
      backoff: 'exponential',
    };

    return await retry(operation, retryOptions || defaultOptions);
  }
}
