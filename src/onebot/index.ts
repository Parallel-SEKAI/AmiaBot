import { OneBotClient } from './onebot.client';
import { config } from '../config';

export const onebot = new OneBotClient(
  config.onebot.httpUrl,
  config.onebot.wsUrl,
  config.onebot.token
);
