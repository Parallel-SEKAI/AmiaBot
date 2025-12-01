import * as dotenv from 'dotenv';
import * as path from 'path';
import * as Joi from 'joi';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envVarsSchema = Joi.object({
  ONEBOT_HTTP_URL: Joi.string().allow('').description('OneBot HTTP API URL'),
  ONEBOT_WS_URL: Joi.string().allow('').description('OneBot WebSocket URL'),
  ONEBOT_TOKEN: Joi.string().allow('').description('OneBot access token'),
  APP_DB_HOST: Joi.string().allow('').description('Database host'),
  APP_DB_PORT: Joi.number().allow('').description('Database port'),
  APP_DB_NAME: Joi.string().allow('').description('Database name'),
  APP_DB_USER: Joi.string().allow('').description('Database user'),
  APP_DB_PASSWORD: Joi.string().allow('').description('Database password'),
  ENANA_BASEURL: Joi.string().allow('').description('Enana API base URL'),
  ENANA_TOKEN: Joi.string().allow('').description('Enana API token'),
  ENANA_SCALE: Joi.number().allow('').description('Enana image scale'),
  ENANA_FONT: Joi.string().allow('').description('Enana font file path'),
  GEMINI_API_KEY: Joi.string().allow('').description('Gemini API key'),
  GEMINI_BASEURL: Joi.string().allow('').description('Gemini API base URL'),
  GEMINI_MODEL: Joi.string().allow('').description('Gemini model name'),
}).unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

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
};
