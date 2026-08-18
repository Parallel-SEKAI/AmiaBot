/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';

const TARGET_GROUP = 753850881;
const PULSE_API = 'https://mizukichan.riverfrozer.me/api/sendPulse';
const DEFAULT_DURATION = 10000;
const INTENSITY = 5;

/**
 * 从原始消息数据中提取第一个 at 类型的 QQ 号
 */
function extractAtQQ(data: Record<string, any>): string | null {
  const message = data.message;
  if (!Array.isArray(message)) return null;
  for (const seg of message) {
    if (seg.type === 'at' && seg.data?.qq) {
      return String(seg.data.qq);
    }
  }
  return null;
}

interface PulseResult {
  success: boolean;
  deviceNotFound: boolean;
}

/**
 * 调用 DG-Lab 电击脉冲 API
 * @param qq 目标 QQ 号
 * @param duration 持续时间（毫秒）
 * @returns 脉冲发送结果
 */
async function sendPulse(qq: string, duration: number): Promise<PulseResult> {
  try {
    const url = `${PULSE_API}?QQ=${qq}&intensity=${INTENSITY}&duration=${duration}`;
    const response = await fetch(url);
    const result = (await response.json()) as {
      success: boolean;
      message?: string;
      error?: string;
    };
    logger.info('[feature.dglab] API response: %s', JSON.stringify(result));

    if (result.success) {
      return { success: true, deviceNotFound: false };
    }

    const deviceNotFound =
      typeof result.error === 'string' && result.error.includes('Device not found');
    return { success: false, deviceNotFound };
  } catch (error) {
    logger.error('[feature.dglab] Failed to send pulse: %s', error);
    return { success: false, deviceNotFound: false };
  }
}

/**
 * 初始化 DG-Lab 电击功能模块
 * 仅在指定群聊中生效，支持以下指令：
 * - 电我：对发送者施加电击
 * - 电@xxx：对被 at 的用户施加电击
 * - 惩罚@xxx [持续时间]：对被 at 的用户施加指定持续时间的电击
 */
export async function init() {
  logger.info('[feature] Init dglab feature');

  // 指令1: 电我
  onebot.registerCommand(
    'dglab',
    '电我',
    '电击自己',
    '电我',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      if (message.groupId !== TARGET_GROUP) return;

      const qq = String(message.userId);
      logger.info(
        '[feature.dglab][Group: %d][User: %d] 电我',
        message.groupId,
        message.userId
      );
      void new SendMessage({
        message: new SendTextMessage('那Amia可不客气了哦'),
      }).reply(message);
      const result = await sendPulse(qq, DEFAULT_DURATION);
      if (result.deviceNotFound) {
        void new SendMessage({
          message: new SendTextMessage('没有对应设备呢'),
        }).reply(message);
      } else if (result.success) {
        void new SendMessage({
          message: new SendTextMessage('电波已传输给' + qq),
        }).reply(message);
      }
    },
    { isHidden: true }
  );

  // 指令2: 电@xxx
  onebot.registerCommand(
    'dglab',
    '电',
    '电击指定用户',
    '电@xxx',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      if (message.groupId !== TARGET_GROUP) return;

      // "电我" 已由上一个命令处理，跳过
      if (message.content === '电我') return;

      const atQQ = extractAtQQ(data);
      if (!atQQ) return;

      logger.info(
        '[feature.dglab][Group: %d][User: %d] 电 %s',
        message.groupId,
        message.userId,
        atQQ
      );
      void new SendMessage({
        message: new SendTextMessage('那Amia可要发动电之力量了哦'),
      }).reply(message);
      const result = await sendPulse(atQQ, DEFAULT_DURATION);
      if (result.deviceNotFound) {
        void new SendMessage({
          message: new SendTextMessage('没有对应设备呢'),
        }).reply(message);
      }else if (result.success) {
        void new SendMessage({
          message: new SendTextMessage('电波已传输给' + atQQ),
        }).reply(message);
      }
    },
    { isHidden: true }
  );

  // 指令3: 惩罚@xxx [持续时间]
  onebot.registerCommand(
    'dglab',
    /^惩罚/,
    '惩罚指定用户',
    '惩罚@xxx [持续时间]',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      if (message.groupId !== TARGET_GROUP) return;

      const atQQ = extractAtQQ(data);
      if (!atQQ) return;

      const durationMatch = message.content.match(/(\d+)/);
      const duration = durationMatch
        ? parseInt(durationMatch[1])
        : DEFAULT_DURATION;

      logger.info(
        '[feature.dglab][Group: %d][User: %d] 惩罚 %s, duration: %d',
        message.groupId,
        message.userId,
        atQQ,
        duration
      );
      void new SendMessage({
        message: new SendTextMessage('嘿嘿，交给Amia吧。'),
      }).reply(message);
      const result = await sendPulse(atQQ, duration);
      if (result.deviceNotFound) {
        void new SendMessage({
          message: new SendTextMessage('没有对应设备呢'),
        }).reply(message);
      }else if (result.success) {
        void new SendMessage({
          message: new SendTextMessage('电波已传输给' + atQQ),
        }).reply(message);
      }
    },
    { isHidden: true }
  );
}
