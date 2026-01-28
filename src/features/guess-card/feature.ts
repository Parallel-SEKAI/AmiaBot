import logger from '../../config/logger';
import { onebot } from '../../onebot';
import { RecvMessage } from '../../onebot/message/recv.entity';
import {
  SendImageMessage,
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity';
import sharp from 'sharp';
import { FeatureModule } from '../feature-manager';
import * as fs from 'fs';
import * as path from 'path';
import { getGameState, setGameState, deleteGameState } from '../../service/db';

const difficulty = {
  ez: 160,
  no: 144,
  hd: 128,
  ex: 96,
  ma: 80,
  apd: 64,
};

const timeout = 40.0; // 40s

export async function init() {
  logger.info('[feature] Init guess-card feature');
  onebot.registerCommand(
    '猜卡面',
    async (data) => {
      await guessCard(data);
    },
    'guess-card'
  );
  onebot.on('message.group', async (data) => {
    const message = RecvMessage.fromMap(data);
    await checkAnswer(message);
  });
}

async function guessCard(data: Record<string, any>) {
  const message = RecvMessage.fromMap(data);
  logger.info(
    '[feature.guess-card][Group: %d][User: %d] %s',
    message.groupId,
    message.userId,
    message.rawMessage
  );

  // 检查当前群是否已有未结束的游戏
  const groupId = message.groupId;
  if (groupId === null) {
    return;
  }

  const existingGame = await getGameState(groupId, 'guess-card');
  if (existingGame) {
    // 已有未结束的游戏，发送提示
    await new SendMessage({
      message: new SendTextMessage('当前有未结束的猜卡面'),
    }).send({
      recvMessage: message,
    });
    return;
  }

  const cardInfo = await getRandomCard();
  let size = 128;
  for (const key in difficulty) {
    if (message.content.toLowerCase().includes(key)) {
      size = difficulty[key as keyof typeof difficulty];
      break;
    }
  }
  // 发送裁剪后的图片
  const croppedImageBuffer = await cropImage(
    cardInfo.imageUrl,
    Math.floor(size * 1.0)
  );
  // 存储答案
  const answer = {
    cardId: cardInfo.cardId,
    characterId: cardInfo.characterId,
  };
  await setGameState(groupId, 'guess-card', answer);

  // 获取正确答案并输出
  const characterName = await getCharacterName(cardInfo.characterId);
  logger.info(
    '[feature.guess-card] CardId: %d CharacterId: %d Answer: %s',
    cardInfo.cardId,
    cardInfo.characterId,
    characterName
  );

  await new SendMessage({
    message: [
      new SendTextMessage(`接下来你有${timeout}秒猜中这张卡面`),
      new SendImageMessage(croppedImageBuffer),
    ],
  }).send({
    recvMessage: message,
  });

  // 定时timeout后检查记录，如果还在且状态一致就发送答案并删除记录
  setTimeout(async () => {
    const gameState = await getGameState(groupId, 'guess-card');
    if (
      gameState &&
      gameState.answer_data.cardId === answer.cardId &&
      gameState.answer_data.characterId === answer.characterId
    ) {
      await sendAnswer(message, cardInfo, true);
      await deleteGameState(groupId, 'guess-card');
    }
  }, timeout * 1000);
}

/**
 * 读取角色别名文件
 * @returns Promise<Record<number, string[]>> - 角色ID到别名列表的映射
 */
async function getCharacterAliases(): Promise<Record<number, string[]>> {
  const aliasPath = path.join(
    process.cwd(),
    'assets/pjsk/character_alias.json'
  );
  const content = fs.readFileSync(aliasPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 根据角色ID获取角色名称
 * @param characterId - 角色ID
 * @returns Promise<string> - 角色名称
 */
async function getCharacterName(characterId: number): Promise<string> {
  const aliases = await getCharacterAliases();
  const aliasList = aliases[characterId] || [];
  return aliasList[0] || `角色${characterId}`;
}

/**
 * 发送完整答案
 * @param message - 接收消息对象
 * @param cardInfo - 卡片信息
 * @param isTimeout - 是否是时间到了自动发送
 */
async function sendAnswer(
  message: RecvMessage,
  cardInfo: CardInfo,
  isTimeout: boolean = false
): Promise<void> {
  const characterName = await getCharacterName(cardInfo.characterId);
  let answerMessage = `答案: ${characterName}\n卡面ID: ${cardInfo.cardId}`;

  // 如果是时间到了，加上前缀
  if (isTimeout) {
    answerMessage = `时间到了\n${answerMessage}`;
  }

  const sendMessage = new SendMessage({
    message: [
      new SendTextMessage(answerMessage),
      new SendImageMessage(cardInfo.imageUrl),
    ],
  });

  // 如果不是时间到了（即用户猜中），使用reply方法回复
  if (!isTimeout) {
    await sendMessage.reply(message);
  } else {
    // 否则使用send方法发送
    await sendMessage.send({
      recvMessage: message,
    });
  }
}

/**
 * 检查用户答案
 * @param message - 接收消息对象
 */
async function checkAnswer(message: RecvMessage): Promise<void> {
  const groupId = message.groupId;
  // 检查是否有记录
  if (groupId === null) {
    return;
  }

  const gameState = await getGameState(groupId, 'guess-card');
  if (!gameState) {
    return;
  }

  const answer = gameState.answer_data;
  const aliases = await getCharacterAliases();
  const characterAliases = aliases[answer.characterId] || [];

  // 检查消息是否包含正确角色的别名
  const lowerContent = message.content.toLowerCase();
  const isCorrect = characterAliases.some((alias) =>
    lowerContent.includes(alias.toLowerCase())
  );

  if (isCorrect) {
    // 获取完整卡片信息
    const cardsUrl =
      'https://sekai-world.github.io/sekai-master-db-diff/cards.json';
    const cards = (await fetch(cardsUrl).then((res) => res.json())) as Array<
      Record<string, any>
    >;
    const card = cards.find((c) => c.id === answer.cardId) as Record<
      string,
      any
    >;

    if (card) {
      const cardImageAfterTrainingUrl = `https://storage.sekai.best/sekai-jp-assets/character/member/${card.assetbundleName}/card_after_training.png`;
      const cardImageNormalUrl = `https://storage.sekai.best/sekai-cn-assets/character/member/${card.assetbundleName}/card_normal.png`;
      const cardImageRes = await fetch(cardImageAfterTrainingUrl);
      const imageUrl =
        cardImageRes.status === 200
          ? cardImageAfterTrainingUrl
          : cardImageNormalUrl;

      const cardInfo: CardInfo = {
        imageUrl,
        cardId: card.id,
        characterId: card.characterId,
        card,
      };

      // 发送正确答案
      await sendAnswer(message, cardInfo, false);
      // 删除记录
      await deleteGameState(groupId, 'guess-card');
    }
  }
}

interface CardInfo {
  imageUrl: string;
  cardId: number;
  characterId: number;
  card: Record<string, any>;
}

async function getRandomCard(): Promise<CardInfo> {
  const cardsUrl =
    'https://sekai-world.github.io/sekai-master-db-diff/cards.json';
  const cards = (await fetch(cardsUrl).then((res) => res.json())) as Array<
    Record<string, any>
  >;
  const card = cards[Math.floor(Math.random() * cards.length)] as Record<
    string,
    any
  >;
  const cardImageAfterTrainingUrl = `https://storage.sekai.best/sekai-jp-assets/character/member/${card.assetbundleName}/card_after_training.png`;
  const cardImageNormalUrl = `https://storage.sekai.best/sekai-jp-assets/character/member/${card.assetbundleName}/card_normal.png`;
  const cardImageChoiceUrl = [cardImageAfterTrainingUrl, cardImageNormalUrl][
    Math.floor(Math.random() * 2)
  ];
  const cardImageRes = await fetch(cardImageChoiceUrl);
  const imageUrl =
    cardImageRes.status === 200 ? cardImageChoiceUrl : cardImageNormalUrl;

  return {
    imageUrl,
    cardId: card.id,
    characterId: card.characterId,
    card,
  };
}

/**
 * 从图片随机选取指定大小的范围进行裁剪后返回 (使用 Sharp 提高性能)
 * @param imageUrl - 图片URL
 * @param cropSize - 裁剪大小
 * @returns Promise<Buffer> - 裁剪后的图片Buffer
 */
async function cropImage(imageUrl: string, cropSize: number): Promise<Buffer> {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Failed to get image dimensions');
    }

    const safeCropSize = Math.min(cropSize, metadata.width, metadata.height);
    const x = Math.floor(Math.random() * (metadata.width - safeCropSize));
    const y = Math.floor(Math.random() * (metadata.height - safeCropSize));

    return await image
      .extract({
        left: x,
        top: y,
        width: safeCropSize,
        height: safeCropSize,
      })
      .toBuffer();
  } catch (error) {
    logger.error(
      '[feature.guess-card] Failed to crop image with sharp:',
      error
    );
    // 兜底返回原图
    const response = await fetch(imageUrl);
    return Buffer.from(await response.arrayBuffer());
  }
}
