import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const envVarsSchema = z
  .object({
    PREFIXES: z.string().optional().default(''),
    HELP_TEXT: z.string().optional().default(''),
    FEATURES_DEFAULT_ENABLED: z.string().optional().default('true'),
    EXIT_WHEN_ERROR: z.string().optional().default('true'),
    ONEBOT_HTTP_URL: z.string().optional().default(''),
    ONEBOT_WS_URL: z.string().optional().default(''),
    ONEBOT_TOKEN: z.string().optional().default(''),
    APP_DB_HOST: z.string().optional().default(''),
    APP_DB_PORT: z.coerce.number().optional().default(0), // 自动将字符串转换为数字
    APP_DB_NAME: z.string().optional().default(''),
    APP_DB_USER: z.string().optional().default(''),
    APP_DB_PASSWORD: z.string().optional().default(''),
    OPENAI_API_KEY: z.string().optional().default(''),
    OPENAI_BASEURL: z.string().optional().default(''),
    OPENAI_MODEL: z.string().optional().default(''),
    OPENAI_MAX_TOKEN: z.coerce.number().optional().default(0),
    GITHUB_TOKEN: z.string().optional().default(''),
    NETEASE_COOKIES: z.string().optional().default(''),
    BILIBILI_COOKIES: z.string().optional().default(''),
    PLAYWRIGHT_WS_ENDPOINT: z.string().optional().default(''),
    PLAYWRIGHT_CONCURRENCY: z.coerce.number().optional().default(5),
  })
  .loose();

const envVars = envVarsSchema.parse(process.env);

export interface IConfig {
  prefixes: string[];
  helpText: string;
  featuresDefaultEnabled: boolean;
  exitWhenError: boolean;
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
  openai: {
    apiKey: string;
    baseUrl: string;
    model: string;
    maxToken: number;
  };
  github: {
    token: string;
  };
  netease: {
    cookies: string;
  };
  bilibili: {
    cookies: string;
  };
  playwright: {
    wsEndpoint: string;
    concurrency: number;
  };
}

export const config: IConfig = {
  prefixes: JSON.parse(envVars.PREFIXES || '["/"]'),
  helpText: envVars.HELP_TEXT || '',
  featuresDefaultEnabled:
    envVars.FEATURES_DEFAULT_ENABLED.toLowerCase() === 'true',
  exitWhenError: envVars.EXIT_WHEN_ERROR.toLowerCase() === 'true',
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
  openai: {
    apiKey: envVars.OPENAI_API_KEY || '',
    baseUrl: envVars.OPENAI_BASEURL || '',
    model: envVars.OPENAI_MODEL || '',
    maxToken: envVars.OPENAI_MAX_TOKEN || 0,
  },
  github: {
    token: envVars.GITHUB_TOKEN || '',
  },
  netease: {
    cookies: envVars.NETEASE_COOKIES || '',
  },
  bilibili: {
    cookies: envVars.BILIBILI_COOKIES || '',
  },
  playwright: {
    wsEndpoint: envVars.PLAYWRIGHT_WS_ENDPOINT || '',
    concurrency: envVars.PLAYWRIGHT_CONCURRENCY,
  },
};
