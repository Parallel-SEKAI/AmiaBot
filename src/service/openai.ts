import OpenAI from 'openai';
import { config } from '../config';

export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  baseURL: config.openai.baseUrl,
});
