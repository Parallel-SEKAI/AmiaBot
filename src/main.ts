import { OneBotClient } from './onebot/onebot.client';
import { initDb } from './service/db';
import { config } from './config/index';
import { init as initFeatures } from './features/index';
import { browserService } from './service/browser';
import { onebot } from './onebot';

async function main(): Promise<void> {
  await initDb();
  await initFeatures();
  await onebot.run();
}

main();
