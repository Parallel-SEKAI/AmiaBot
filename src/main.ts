import { initDb } from './service/db';
import { config } from './config/index';
import logger from './config/logger';
import { init as initFeatures } from './features/index';
import { onebot } from './onebot';

async function main(): Promise<void> {
  await initDb();
  await initFeatures();
  await onebot.run();
}

main().catch((e) => {
  logger.error('[main] Fatal error during startup: %s', e);
  process.exit(1);
});
