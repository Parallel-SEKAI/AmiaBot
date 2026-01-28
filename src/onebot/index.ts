import { OneBotClient } from './onebot.client.js';
import { config } from '../config/index.js';

export const onebot = new OneBotClient(
  config.onebot.httpUrl,
  config.onebot.wsUrl,
  config.onebot.token
);
