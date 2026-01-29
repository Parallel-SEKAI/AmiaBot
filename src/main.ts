import { initDb } from './service/db.js';
import logger from './config/logger.js';
import { init as initFeatures } from './features/index.js';
import { onebot } from './onebot/index.js';

/**
 * 应用程序主入口函数
 * 负责顺序初始化数据库、功能模块并启动 OneBot 客户端
 */
async function main(): Promise<void> {
  await initDb();
  await initFeatures();
  await onebot.run();
}

main().catch((e) => {
  logger.error('[main] Fatal error during startup: %s', e);
  process.exit(1);
});
