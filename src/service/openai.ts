import OpenAI from 'openai';
import { config } from '../config/index.js';

/**
 * OpenAI API 客户端实例
 * 用于访问 Gemini 或其他兼容 OpenAI 接口的 AI 服务
 */
export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  baseURL: config.openai.baseUrl,
});
