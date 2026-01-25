import Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import logger from '../config/logger';

// 注册常用 Helpers
Handlebars.registerHelper('json', (context) => {
  return JSON.stringify(context);
});

Handlebars.registerHelper('eq', (a, b) => {
  return a === b;
});

/**
 * Handlebars 模板工具类
 */
export class TemplateEngine {
  /**
   * 渲染本地模板文件
   * @param templatePath 模板相对于 assets 的路径
   * @param data 渲染数据
   */
  public static render(templatePath: string, data: any): string {
    const fullPath = join(process.cwd(), 'assets', templatePath);
    if (!existsSync(fullPath)) {
      logger.error('[utils.template] Template not found: %s', fullPath);
      throw new Error(`Template not found: ${templatePath}`);
    }

    const source = readFileSync(fullPath, 'utf-8');
    const template = Handlebars.compile(source);
    return template(data);
  }

  /**
   * 直接渲染字符串模板
   * @param source 模板源码
   * @param data 渲染数据
   */
  public static renderString(source: string, data: any): string {
    const template = Handlebars.compile(source);
    return template(data);
  }
}
