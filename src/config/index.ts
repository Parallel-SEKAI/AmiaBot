import * as dotenv from 'dotenv';
import * as path from 'path';
import * as Joi from 'joi';

// 从项目根目录的 .env 文件加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 仅定义三个 OneBot 相关配置的验证规则
const envVarsSchema = Joi.object({
  ONEBOT_HTTP_URL: Joi.string().allow('').description('OneBot HTTP API URL'),
  ONEBOT_WS_URL: Joi.string().allow('').description('OneBot WebSocket URL'),
  ONEBOT_TOKEN: Joi.string().allow('').description('OneBot access token'),
}).unknown(); // 允许 .env 中存在其他未定义的变量（如果需要严格限制可移除 .unknown()）

// 验证环境变量
const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// 类型安全的配置接口（仅包含三个必要字段）
export interface IConfig {
  onebot: {
    httpUrl: string;
    wsUrl: string;
    token: string;
  };
}

// 导出最终配置对象
export const config: IConfig = {
  onebot: {
    httpUrl: envVars.ONEBOT_HTTP_URL || '',
    wsUrl: envVars.ONEBOT_WS_URL || '',
    token: envVars.ONEBOT_TOKEN || '',
  },
};
