import { initDb } from './service/db.js';
import { config } from './config/index.js';
import logger from './config/logger.js';
import { init as initFeatures } from './features/index.js';
import { onebot } from './onebot/index.js';

async function main(): Promise<void> {
  await initDb();
  await initFeatures();
  await onebot.run();
}

main().catch((e) => {
  logger.error('[main] Fatal error during startup: %s', e);
  process.exit(1);
});
