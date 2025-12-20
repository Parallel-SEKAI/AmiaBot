import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envVarsSchema = z
  .object({
    ONEBOT_HTTP_URL: z.string().optional().default(''),
    ONEBOT_WS_URL: z.string().optional().default(''),
    ONEBOT_TOKEN: z.string().optional().default(''),
    APP_DB_HOST: z.string().optional().default(''),
    APP_DB_PORT: z.coerce.number().optional().default(0), // 自动将字符串转换为数字
    APP_DB_NAME: z.string().optional().default(''),
    APP_DB_USER: z.string().optional().default(''),
    APP_DB_PASSWORD: z.string().optional().default(''),
    ENANA_BASEURL: z.string().optional().default(''),
    ENANA_TOKEN: z.string().optional().default(''),
    ENANA_SCALE: z.coerce.number().optional().default(0), // 自动将字符串转换为数字
    ENANA_FONT: z.string().optional().default(''),
    GEMINI_API_KEY: z.string().optional().default(''),
    GEMINI_BASEURL: z.string().optional().default(''),
    GEMINI_MODEL: z.string().optional().default(''),
    GITHUB_TOKEN: z.string().optional().default(''),
    NETEASE_COOKIES: z.string().optional().default(''),
  })
  .loose();

const envVars = envVarsSchema.parse(process.env);

export interface IConfig {
  onebot: {
    httpUrl: string;
    wsUrl: string;
    token: string;
  };
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  enana: {
    baseUrl: string;
    token: string;
    scale: number;
    font: string;
  };
  gemini: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  github: {
    token: string;
  };
  netease: {
    cookies: string;
  };
}

export const config: IConfig = {
  onebot: {
    httpUrl: envVars.ONEBOT_HTTP_URL || '',
    wsUrl: envVars.ONEBOT_WS_URL || '',
    token: envVars.ONEBOT_TOKEN || '',
  },
  db: {
    host: envVars.APP_DB_HOST || '',
    port: envVars.APP_DB_PORT || 0,
    name: envVars.APP_DB_NAME || '',
    user: envVars.APP_DB_USER || '',
    password: envVars.APP_DB_PASSWORD || '',
  },
  enana: {
    baseUrl: envVars.ENANA_BASEURL || '',
    token: envVars.ENANA_TOKEN || '',
    scale: envVars.ENANA_SCALE || 0,
    font: envVars.ENANA_FONT || '',
  },
  gemini: {
    apiKey: envVars.GEMINI_API_KEY || '',
    baseUrl: envVars.GEMINI_BASEURL || '',
    model: envVars.GEMINI_MODEL || '',
  },
  github: {
    token: envVars.GITHUB_TOKEN || '',
  },
  netease: {
    cookies: envVars.NETEASE_COOKIES || '',
  },
};
