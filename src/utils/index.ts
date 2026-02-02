import { promises as fs } from 'fs';
import { extname } from 'path';
import logger from '../config/logger.js';

/**
 * 通用工具函数库
 * 包含文件操作、命令行解析、图像转换、模板渲染等实用功能
 */

/**
 * 安全地删除文件，如果失败则记录日志但不抛出异常
 */
export async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code !== 'ENOENT'
    ) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(
        '[utils.safeUnlink] Failed to delete file %s: %s',
        filePath,
        errorMessage
      );
    }
  }
}

/**
 * 解析类命令行参数字符串
 * 支持 key=value 格式的命名参数以及普通位置参数
 * @param cmd 待解析的指令字符串
 * @returns [位置参数数组, 命名参数对象]
 */
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
  data: Record<string, string | number | null | undefined>
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
      return String(data[key.trim()]);
    }

    // 如果没有找到对应的 key，则返回原始占位符
    // 这样便于调试，可以看到哪个占位符没有被替换
    return match;
  });
}

/**
 * 不区分大小写地提取匹配字符串之后的内容
 * @param source 源字符串
 * @param searchString 要匹配的子串
 * @returns 匹配点之后的内容，若未匹配则返回原串
 */
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

/**
 * Levenshtein Distance Algorithm
 * Calculate the similarity between two strings
 * @param s1 String 1
 * @param s2 String 2
 * @returns Similarity (0-1)
 */
export function levenshtein_similarity(s1: string, s2: string): number {
  if (!s1 && !s2) {
    return 1.0; // Both are empty strings
  }
  if (!s1 || !s2) {
    return 0.0; // One is empty
  }

  // Ensure s1 is the longer string
  if (s1.length < s2.length) {
    return levenshtein_similarity(s2, s1);
  }

  // Initialize previous row
  const prevRow = Array.from({ length: s2.length + 1 }, (_, i) => i);

  for (let i = 1; i <= s1.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    prevRow.splice(0, prevRow.length, ...currRow);
  }

  // Edit distance
  const editDistance = prevRow[prevRow.length - 1];

  // Normalize to [0, 1]
  const maxLen = Math.max(s1.length, s2.length);
  const similarity = 1.0 - editDistance / maxLen;

  return similarity;
}

/**
 * Extract content within XML-style tags from a string.
 * @param text The input string containing the tags
 * @param tagName The name of the tag to extract (e.g., 'dialogue')
 * @returns The content inside the tag, or null if not found
 */
export function extractXmlTag(text: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}
