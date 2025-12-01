import { OneBotClient } from './onebot/onebot.client';
import { initDb } from './service/db';
import { config } from './config/index';
import { init as initFeatures } from './features/index';

export const onebot = new OneBotClient(
  config.onebot.httpUrl,
  config.onebot.wsUrl,
  config.onebot.token
);

async function main(): Promise<void> {
  await initDb();
  await initFeatures();
  await onebot.run();
}

main();
