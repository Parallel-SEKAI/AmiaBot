/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs/promises';
import path from 'path';
import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendBaseMessage,
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';

const CONFIG_PATH = path.resolve(process.cwd(), 'assets/auto-reply/reply.json');

interface ResponseSegment {
  type: string;
  data: Record<string, unknown>;
}

interface AutoReplyRule {
  trigger: {
    value: string;
  };
  responses: ResponseSegment[][];
}

let rules: AutoReplyRule[] = [];

/**
 * 解析正則表達式字符串，支持 /pattern/flags 格式
 */
function parseRegex(value: string): RegExp {
  const match = value.match(/^\/(.+)\/([gimsuy]*)$/);
  if (match) {
    return new RegExp(match[1], match[2]);
  }
  return new RegExp(value);
}

/**
 * 加載自動回復配置
 */
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    rules = JSON.parse(data);
    logger.info('[feature.auto-reply] Loaded %d rules', rules.length);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      logger.warn(
        '[feature.auto-reply] Config file not found, initializing empty rules'
      );
      rules = [];
      return;
    }
    logger.error('[feature.auto-reply] Failed to load config: %s', error);
  }
}

/**
 * 初始化自動回復功能
 */
export async function init() {
  await loadConfig();

  // 監聽所有消息事件
  onebot.on('message', async (data: Record<string, unknown>) => {
    if (data.user_id === onebot.qq) return;

    const message = RecvMessage.fromMap(data);
    const content = message.content;
    if (!content) return;

    for (const rule of rules) {
      let matched = false;

      try {
        const regex = parseRegex(rule.trigger.value);
        matched = regex.test(content);
      } catch (e: unknown) {
        logger.error(
          '[feature.auto-reply] Invalid regex "%s": %s',
          rule.trigger.value,
          e
        );
        continue;
      }

      if (matched) {
        logger.info('[feature.auto-reply] Matched rule for: %s', content);
        const randomIndex = Math.floor(Math.random() * rule.responses.length);
        const responseSegments = rule.responses[randomIndex];

        try {
          const messages = responseSegments.map(
            (seg) =>
              new SendBaseMessage(seg.type, seg.data as Record<string, any>)
          );
          await new SendMessage({
            message: messages,
          }).send({ recvMessage: message });
        } catch (e: unknown) {
          logger.error('[feature.auto-reply] Failed to send reply: %s', e);
        }

        // 匹配到第一條後停止，避免多重回復
        break;
      }
    }
  });

  // 註冊重載命令
  onebot.registerCommand(
    'auto-reply',
    'reload-reply',
    '重新加載自動回復配置',
    'reload-reply',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      await loadConfig();
      await new SendMessage({
        message: [
          new SendTextMessage(
            `✅ 自動回復配置已重新加載，共 ${rules.length} 條規則。`
          ),
        ],
      }).reply(message);
    }
  );
}
