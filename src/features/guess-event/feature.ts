/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendImageMessage,
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import sharp from 'sharp';
import {
  getGameState,
  setGameState,
  deleteGameState,
} from '../../service/db.js';
import { levenshtein_similarity } from '../../utils/index.js';

// 难度映射表
const difficulty = {
  ez: 1024, // 简单难度，不裁剪
  no: 1024, // 普通难度，1024x1024
  hd: 768, // 困难难度，768x768
  ex: 512, // 专家难度，512x512
  ma: 256, // 大师难度，256x256
  apd: 128, // 噩梦难度，128x128
};

const timeout = 60.0; // 60秒超时
const targetSimilarity = 0.5; // 相似度阈值

interface PjskEvent {
  id: number;
  name: string;
  assetbundleName: string;
}

interface EventInfo {
  imageUrl: string; // 活动背景图URL
  eventId: number; // 活动ID
  name: string; // 活动名称
  answers: string[]; // 活动名称和别名
  assetbundleName: string; // 活动资源包名称
  server: string; // 服务器（cn/jp）
  event: PjskEvent; // 完整活动数据
}

// 获取随机活动
async function getRandomEvent(server: string = 'cn'): Promise<EventInfo> {
  // 从API获取活动数据
  const eventsUrl = `https://sekai-world.github.io/sekai-master-db-${server}-diff/events.json`;
  const events = (await fetch(eventsUrl).then((res) =>
    res.json()
  )) as Array<PjskEvent>;

  // 随机选择一个活动
  const event = events[Math.floor(Math.random() * events.length)];

  // 构建活动信息
  return {
    imageUrl: `https://storage.sekai.best/sekai-${server}-assets/event/${event.assetbundleName}/screen/bg.png`,
    eventId: event.id,
    name: event.name,
    answers: [event.name], // 目前只有活动名称，后续可以添加别名
    assetbundleName: event.assetbundleName,
    server: server,
    event: event,
  };
}

// 根据活动ID获取活动信息
async function getEventInfoById(
  eventId: number,
  server: string = 'cn'
): Promise<EventInfo> {
  // 从API获取活动数据
  const eventsUrl = `https://sekai-world.github.io/sekai-master-db-${server}-diff/events.json`;
  const events = (await fetch(eventsUrl).then((res) =>
    res.json()
  )) as Array<PjskEvent>;

  // 找到对应的活动
  const event = events.find((e) => e.id === eventId);
  if (!event) {
    throw new Error(`未找到活动ID: ${eventId}`);
  }

  // 构建活动信息
  return {
    imageUrl: `https://storage.sekai.best/sekai-${server}-assets/event/${event.assetbundleName}/screen/bg.png`,
    eventId: event.id,
    name: event.name,
    answers: [event.name], // 目前只有活动名称，后续可以添加别名
    assetbundleName: event.assetbundleName,
    server: server,
    event: event,
  };
}

// 从图片随机选取指定大小的范围进行裁剪后返回
async function cutImage(imageUrl: string, cropSize: number): Promise<Buffer> {
  try {
    // 获取原始图片
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    // 获取图片信息
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Failed to get image dimensions');
    }

    // 确保裁剪大小不超过图片尺寸
    const safeCropSize = Math.min(cropSize, metadata.width, metadata.height);

    // 随机生成裁剪区域的起始坐标
    const x = Math.floor(Math.random() * (metadata.width - safeCropSize));
    const y = Math.floor(Math.random() * (metadata.height - safeCropSize));

    // 裁剪图片
    const croppedBuffer = await image
      .extract({
        left: x,
        top: y,
        width: safeCropSize,
        height: safeCropSize,
      })
      .toBuffer();

    logger.info(
      '[feature.guess-event] Crop image - Original size: %dx%d, Crop size: %dx%d, Crop area: (%d,%d)',
      metadata.width,
      metadata.height,
      safeCropSize,
      safeCropSize,
      x,
      y
    );

    return croppedBuffer;
  } catch (error: unknown) {
    logger.error('[feature.guess-event] Failed to crop image:', error);
    // 失败时返回原始图片
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }
}

// 发送答案
async function sendAnswer(
  message: RecvMessage,
  eventInfo: EventInfo,
  isTimeout: boolean = false
): Promise<void> {
  let answerMessage = `答案: ${eventInfo.name}`;

  // 如果是时间到了，加上前缀
  if (isTimeout) {
    answerMessage = `时间到了\n${answerMessage}`;
  } else {
    answerMessage = `恭喜你猜对了！\n${answerMessage}`;
  }

  // 发送消息
  const sendMessage = new SendMessage({
    message: [
      new SendTextMessage(answerMessage),
      new SendImageMessage(eventInfo.imageUrl),
    ],
  });

  if (!isTimeout) {
    await sendMessage.reply(message);
  } else {
    await sendMessage.send({
      recvMessage: message,
    });
  }
}

// 检查用户答案
async function checkAnswer(message: RecvMessage): Promise<void> {
  const groupId = message.groupId;
  // 检查是否有记录
  if (groupId === null) {
    return;
  }

  const gameState = await getGameState(groupId, 'guess-event');
  if (!gameState) {
    return;
  }

  const answer = gameState.answer_data;
  const userInput = message.content.toLowerCase();

  // 计算相似度
  let maxSimilarity = 0;
  for (const ans of answer.answers) {
    const similarity = levenshtein_similarity(userInput, ans.toLowerCase());
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  if (maxSimilarity >= targetSimilarity) {
    // 获取完整活动信息
    const eventInfo = await getEventInfoById(answer.eventId, answer.server);

    // 发送正确答案
    await sendAnswer(message, eventInfo, false);

    // 删除记录
    await deleteGameState(groupId, 'guess-event');
  }
}

// 猜活动主函数
async function guessEvent(data: Record<string, any>) {
  const message = RecvMessage.fromMap(data);
  logger.info(
    '[feature.guess-event][Group: %d][User: %d] %s',
    message.groupId,
    message.userId,
    message.rawMessage
  );

  // 检查当前群是否已有未结束的游戏

  const groupId = message.groupId;

  if (groupId === null) {
    return;
  }

  const existingGame = await getGameState(groupId, 'guess-event');

  if (existingGame) {
    // 已有未结束的游戏，发送提示

    await new SendMessage({
      message: new SendTextMessage('当前有未结束的猜活动'),
    }).send({
      recvMessage: message,
    });

    return;
  }

  // 解析服务器（默认cn）

  let server = 'cn';

  if (message.content.toLowerCase().includes('jp')) {
    server = 'jp';
  }

  // 解析难度

  let cropSize = difficulty.hd; // 默认困难难度

  for (const key in difficulty) {
    if (message.content.toLowerCase().includes(key)) {
      cropSize = difficulty[key as keyof typeof difficulty];

      break;
    }
  }

  try {
    // 获取随机活动信息

    const eventInfo = await getRandomEvent(server);

    logger.info(
      '[feature.guess-event][Group: %d][User: %d] Answer: %s',

      message.groupId,

      message.userId,

      eventInfo.name
    );

    // 裁剪图片

    const croppedImageBuffer = await cutImage(eventInfo.imageUrl, cropSize);

    // 存储答案

    const answer = {
      eventId: eventInfo.eventId,

      name: eventInfo.name,

      answers: eventInfo.answers,

      assetbundleName: eventInfo.assetbundleName,

      server: server,
    };

    await setGameState(groupId, 'guess-event', answer);

    // 发送裁剪后的图片

    await new SendMessage({
      message: [
        new SendTextMessage(`接下来你有${timeout}秒猜中这个活动`),

        new SendImageMessage(croppedImageBuffer),
      ],
    }).send({
      recvMessage: message,
    });

    // 定时timeout后检查记录，如果还在且状态一致就发送答案并删除记录

    setTimeout(async () => {
      const gameState = await getGameState(groupId, 'guess-event');

      if (
        gameState &&
        gameState.answer_data.eventId === answer.eventId &&
        gameState.answer_data.name === answer.name
      ) {
        await sendAnswer(message, eventInfo, true);

        await deleteGameState(groupId, 'guess-event');
      }
    }, timeout * 1000);
  } catch (error: unknown) {
    logger.error('[feature.guess-event] Failed to process event:', error);
    await new SendMessage({
      message: new SendTextMessage('处理活动失败，请稍后再试'),
    }).send({
      recvMessage: message,
    });
  }
}

// 初始化猜活动功能
/**
 * 初始化“猜活动”功能模块
 * 注册 '猜活动' 指令，截取 PJSK 活动背景图让用户通过活动名称进行竞猜
 */
export async function init() {
  logger.info('[feature] Init guess-event feature');
  onebot.registerCommand(
    'guess-event',
    '猜活动',
    '开始一轮 PJSK 猜活动背景游戏',
    '猜活动 [难度:ez/no/hd/ex/ma/apd] [server:cn/jp]',
    async (data) => {
      await guessEvent(data);
    }
  );
  onebot.on('message.group', async (data) => {
    const message = RecvMessage.fromMap(data);
    await checkAnswer(message);
  });
}
