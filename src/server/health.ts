import * as http from 'node:http';
import { OneBotClient } from '../onebot/onebot.client.js';
import { Pool } from 'pg';
import logger from '../config/logger.js';

/**
 * 启动健康检查服务器
 * @param onebot OneBot 客户端实例
 * @param pool 数据库连接池
 */
export async function startHealthCheckServer(
  onebot: OneBotClient,
  pool: Pool
): Promise<void> {
  const port = 8080;

  const server = http.createServer(async (req, res) => {
    if (req.url === '/healthz') {
      try {
        // 1. 检查数据库连接
        await pool.query('SELECT 1');

        // 2. 检查 Bot 健康状态
        const botStatus = await onebot.getHealthStatus();

        // 如果 Bot 关键状态为 DOWN，则认为不健康
        const isBotHealthy =
          botStatus.ws.status === 'UP' &&
          botStatus.api.status === 'UP' &&
          botStatus.auth.status === 'UP';

        if (!isBotHealthy) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'DOWN',
              uptime: process.uptime(),
              timestamp: new Date().toISOString(),
              components: {
                db: 'UP',
                bot: botStatus,
              },
            })
          );
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'UP',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            components: {
              db: 'UP',
              bot: botStatus,
            },
          })
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error('[health-server] Health check failed: %s', error);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'DOWN',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            error: errorMessage,
          })
        );
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    logger.info(
      '[health-server] Health check server listening on port %d',
      port
    );
  });
}
