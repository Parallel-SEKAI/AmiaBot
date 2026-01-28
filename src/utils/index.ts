import { promises as fs } from 'fs';
import { extname } from 'path';
import logger from '../config/logger';

/**
 * 安全地删除文件，如果失败则记录日志但不抛出异常
 */
export async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      logger.warn(
        '[utils.safeUnlink] Failed to delete file %s: %s',
        filePath,
        error.message
      );
    }
  }
}

export function parseCommandLineArgs(
  cmd: string
): [string[], Record<string, string>] {
  const args: string[] = [];
  const kwargs: Record<string, string> = {};

  const pattern =
    /(\w+)=(?:"([^"]*)"|'([^']*)'|([^\s]+))|(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;

  for (const match of cmd.matchAll(pattern)) {
    if (match[1]) {
      const key = match[1];
      const value = match[2] ?? match[3] ?? match[4];
      kwargs[key] = value;
    } else {
      const value = match[5] ?? match[6] ?? match[7];
      if (value) {
        args.push(value);
      }
    }
  }

  return [args, kwargs];
}

/**
 * Convert a local image file to a base64 data URL.
 * @param filePath Absolute or relative path to the image file.
 * @returns Promise resolving to the base64 data URL.
 */
export async function imageToBase64DataURL(
  filePath: string,
  noHeader = false
): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const ext = extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  const mime = mimeMap[ext] || 'application/octet-stream';
  const base64 = buffer.toString('base64');
  return noHeader ? base64 : `data:${mime};base64,${base64}`;
}

/**
 * Convert a remote image URL to a base64 data URL.
 * @param url Remote image URL.
 * @returns Promise resolving to the base64 data URL.
 */
export async function networkImageToBase64DataURL(
  url: string,
  noHeader = false
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType =
    res.headers.get('content-type') || 'application/octet-stream';
  const base64 = buffer.toString('base64');
  return noHeader ? base64 : `data:${contentType};base64,${base64}`;
}

/**
 * 颜色转换工具函数
 * 用于将十六进制颜色字符串转换为Enana API所需的RGBA颜色数组格式
 */

/**
 * 将十六进制颜色字符串转换为RGBA颜色数组
 * @param hex 十六进制颜色字符串，格式：#RRGGBB 或 #RRGGBBAA
 * @returns RGBA颜色数组，格式：[红, 绿, 蓝, 透明度]，所有值范围为0-255
 * @throws Error 当输入的十六进制颜色格式无效时抛出错误
 */
export function hexToRgba(hex: string): [number, number, number, number] {
  // 移除#符号
  const cleanHex = hex.replace('#', '');

  // 检查长度是否有效
  if (cleanHex.length !== 6 && cleanHex.length !== 8) {
    throw new Error(
      `无效的十六进制颜色格式: ${hex}。请使用#RRGGBB或#RRGGBBAA格式。`
    );
  }

  // 解析RGB值
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // 解析Alpha值（如果存在）
  const a =
    cleanHex.length === 8 ? parseInt(cleanHex.substring(6, 8), 16) : 255;

  return [r, g, b, a];
}

/**
 * 使用给定的数据对象渲染一个模板字符串。
 * 它会替换所有 {{key}} 格式的占位符。
 *
 * @param templateString - 包含占位符的模板字符串。
 * @param data - 一个对象，其键对应于模板中的占位符。
 * @returns {string} - 渲染后的字符串。
 */
export function renderTemplate(
  templateString: string,
  data: { [key: string]: any }
): string {
  // 正则表达式匹配 {{key}} 或 {{ key }} 格式的占位符
  // \s* 允许 key 的前后有任意空格
  // ([a-zA-Z0-9_]+) 捕获一个或多个字母、数字或下划线作为 key
  const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

  return templateString.replace(regex, (match, key) => {
    // match 是整个匹配的字符串, e.g., "{{ name }}"
    // key 是捕获组中的内容, e.g., "name"

    // Object.prototype.hasOwnProperty.call 是一种更安全的检查方式
    // 它可以避免 data 对象原型链上的属性干扰
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // 如果在 data 对象中找到了 key，则返回值
      return data[key.trim()];
    }

    // 如果没有找到对应的 key，则返回原始占位符
    // 这样便于调试，可以看到哪个占位符没有被替换
    return match;
  });
}

export function extractAfterCaseInsensitive(
  source: string,
  searchString: string
): string {
  const lowerSource = source.toLowerCase();
  const lowerSearchString = searchString.toLowerCase();
  const startIndex = lowerSource.indexOf(lowerSearchString);
  if (startIndex === -1) {
    return source;
  }
  const endIndex = startIndex + searchString.length;
  return source.substring(endIndex);
}
