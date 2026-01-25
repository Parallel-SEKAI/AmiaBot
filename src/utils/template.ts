import Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import logger from '../config/logger';

// 缓存已编译的模板
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

// 注册常用 Helpers
Handlebars.registerHelper('json', (context) => {
  // 基础 XSS 防护：转义 </script> 标签
  const json = JSON.stringify(context).replace(/<\/script>/gi, '<\\/script>');
  return new Handlebars.SafeString(json);
});

Handlebars.registerHelper('eq', (a, b) => {
  return a === b;
});

/**
 * Handlebars 模板引擎工具类
 * 提供模板缓存、路径解析以及 XSS 安全防护
 */
export class TemplateEngine {
  /**
   * 渲染本地模板文件，支持自动缓存编译后的模板
   * @param templatePath 模板相对于 assets 的路径 (例如 'github/pr.hbs')
   * @param data 传递给 Handlebars 的渲染上下文数据
   * @returns 渲染后的 HTML 字符串
   */
  public static render(templatePath: string, data: any): string {
    const assetsDir =
      process.env.ASSETS_DIR || resolve(__dirname, '../../assets');
    const fullPath = resolve(assetsDir, templatePath);

    let template = templateCache.get(fullPath);
    if (!template) {
      if (!existsSync(fullPath)) {
        logger.error('[utils.template] Template not found: %s', fullPath);
        throw new Error(`Template not found: ${templatePath}`);
      }

      const source = readFileSync(fullPath, 'utf-8');
      template = Handlebars.compile(source);
      templateCache.set(fullPath, template);
    }

    return template(data);
  }

  /**
   * 直接渲染字符串模板
   * @param source 模板源码字符串
   * @param data 渲染数据
   * @returns 渲染后的字符串
   */
  public static renderString(source: string, data: any): string {
    const template = Handlebars.compile(source);
    return template(data);
  }
}
