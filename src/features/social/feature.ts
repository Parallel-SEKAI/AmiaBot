/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import {
  RecvMessage,
  RecvAtMessage,
} from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
  SendImageMessage,
} from '../../onebot/message/send.entity.js';
import { User } from '../../onebot/user/user.entity.js';
import { SocialService } from '../../service/social.js';
import { ReactRenderer } from '../../service/render/react.js';
import {
  SocialCard,
  InteractionType,
} from '../../components/social/SocialCard.js';
import { SocialLeaderboard } from '../../components/social/SocialLeaderboard.js';

/**
 * 初始化社交系统功能模块
 * 注册 '娶群友'、'送礼物'、'闹离婚' 及 '好感度列表' 指令
 */
export async function init() {
  logger.info('[feature] Init social feature');

  // 娶群友
  onebot.registerCommand(
    'social',
    '娶群友',
    '随机抽取一名群友作为今日伴侣',
    '娶群友',
    async (data: Record<string, any>) => {
      const message = RecvMessage.fromMap(data);
      if (!message.groupId) return;

      try {
        const result = await SocialService.marry(
          message.groupId,
          message.userId
        );
        if (!result) {
          await message.reply(
            new SendMessage({
              message: new SendTextMessage(
                '群里已经没有可以娶的人了（或者人都被娶光了）~'
              ),
            })
          );
          return;
        }

        const { targetId, isNew, bonus, favorability } = result;

        // 使用 User 类获取目标信息
        const targetUser = new User(targetId, message.groupId);
        const currentUser = new User(message.userId, message.groupId);
        await Promise.all([targetUser.init(), currentUser.init()]);

        const image = await renderSocialCard({
          type: 'MARRY',
          userNick: currentUser.fullName,
          userAvatar: currentUser.avatarUrl,
          targetNick: targetUser.fullName,
          targetAvatar: targetUser.avatarUrl,
          favorability: favorability || 0,
          changeAmount: isNew ? bonus : undefined,
          message: isNew
            ? '恭喜！你们今天配对成功了！'
            : '你们今天已经是夫妻啦，不用重复娶哦~',
        });

        await message.reply(
          new SendMessage({ message: new SendImageMessage(image) })
        );
      } catch (err) {
        logger.error('[feature.social.marry] Error:', err);
        await message.reply(
          new SendMessage({
            message: new SendTextMessage('娶群友时发生了一点意外...'),
          })
        );
      }
    }
  );

  // 送礼物
  onebot.registerCommand(
    'social',
    '送礼物',
    '给你的伴侣或指定群友送礼物增加好感度',
    '送礼物 [at] [礼物名称]',
    async (data: Record<string, any>) => {
      const message = RecvMessage.fromMap(data);
      if (!message.groupId) return;

      // 提取被提到的用户
      const atMsg = message.message.find((m) => m instanceof RecvAtMessage) as
        | RecvAtMessage
        | undefined;
      let targetId: number | null = null;

      if (atMsg) {
        targetId = parseInt(atMsg.qq);
      } else {
        // 如果没有艾特，尝试获取今日娶的对象
        targetId = await SocialService.getTodayPartner(
          message.groupId,
          message.userId
        );
      }

      if (!targetId) {
        await message.reply(
          new SendMessage({
            message: new SendTextMessage(
              '请艾特你要送礼物的对象，或者先通过「娶群友」脱单后再直接送礼物哦~'
            ),
          })
        );
        return;
      }

      if (targetId === message.userId) {
        await message.reply(
          new SendMessage({
            message: new SendTextMessage('不能送礼物给自己哦~'),
          })
        );
        return;
      }
      if (targetId === onebot.qq) {
        await message.reply(
          new SendMessage({
            message: new SendTextMessage(
              '哎呀，谢谢你的心意，不过这些礼物你还是留给更重要的人吧~'
            ),
          })
        );
        return;
      }

      // 提取礼物名称
      let giftText = message.content.replace('送礼物', '').trim();
      if (!giftText) giftText = '神秘礼物';

      try {
        const result = await SocialService.gift(
          message.groupId,
          message.userId,
          targetId
        );
        if (!result.success) {
          if (result.reason === 'COOLDOWN') {
            await message.reply(
              new SendMessage({
                message: new SendTextMessage(
                  '送得太频繁啦，休息一下吧（每小时限送3次）。'
                ),
              })
            );
          }
          return;
        }

        const targetUser = new User(targetId, message.groupId);
        const currentUser = new User(message.userId, message.groupId);
        await Promise.all([targetUser.init(), currentUser.init()]);

        const image = await renderSocialCard({
          type: 'GIFT',
          userNick: currentUser.fullName,
          userAvatar: currentUser.avatarUrl,
          targetNick: targetUser.fullName,
          targetAvatar: targetUser.avatarUrl,
          favorability: result.newFavor ?? 0,
          changeAmount: result.bonus,
          isSurprise: result.isSurprise,
          message: `送出了礼物：${giftText}`,
        });

        await message.reply(
          new SendMessage({ message: new SendImageMessage(image) })
        );
      } catch (err) {
        logger.error('[feature.social.gift] Error:', err);
        await message.reply(
          new SendMessage({
            message: new SendTextMessage(
              '送礼物时发生了一点意外，请稍后再试～'
            ),
          })
        );
      }
    }
  );

  const divorceHandler = async (data: any) => {
    const message = RecvMessage.fromMap(data);
    if (!message.groupId) return;

    try {
      const result = await SocialService.divorce(
        message.groupId,
        message.userId
      );
      if (!result) {
        await message.reply(
          new SendMessage({
            message: new SendTextMessage('你今天还没娶过人呢，离什么婚呀？'),
          })
        );
        return;
      }

      const { targetId, penalty, newFavor } = result;
      const targetUser = new User(targetId, message.groupId);
      const currentUser = new User(message.userId, message.groupId);
      await Promise.all([targetUser.init(), currentUser.init()]);

      const image = await renderSocialCard({
        type: 'DIVORCE',
        userNick: currentUser.fullName,
        userAvatar: currentUser.avatarUrl,
        targetNick: targetUser.fullName,
        targetAvatar: targetUser.avatarUrl,
        favorability: newFavor,
        changeAmount: -penalty,
        message: '感情破裂，协议离婚。',
      });

      await message.reply(
        new SendMessage({ message: new SendImageMessage(image) })
      );
    } catch (err) {
      logger.error('[feature.social.divorce] Error:', err);
      await message.reply(
        new SendMessage({
          message: new SendTextMessage(
            '离婚失败了，看来你们缘分未尽？（请稍后再试～）'
          ),
        })
      );
    }
  };

  onebot.registerCommand(
    'social',
    '闹离婚',
    '与当前伴侣离婚',
    '闹离婚',
    divorceHandler
  );
  onebot.registerCommand(
    'social',
    '分手',
    '与当前伴侣分手',
    '分手',
    divorceHandler
  );

  onebot.registerCommand(
    'social',
    '好感度列表',
    '查看本群好感度排行榜',
    '好感度列表',
    async (data: Record<string, any>) => {
      const message = RecvMessage.fromMap(data);
      if (!message.groupId) return;

      try {
        const items = await SocialService.getLeaderboard(
          message.groupId,
          message.userId
        );

        // 并行初始化所有相关用户信息
        const leaderboardItems = await Promise.all(
          items.map(async (item) => {
            const user = new User(item.userId, message.groupId);
            await user.init();
            return {
              userId: item.userId,
              nickname: user.fullName,
              favorability: item.favorability,
              tags: item.tags,
            };
          })
        );

        const currentUser = new User(message.userId, message.groupId);
        await currentUser.init();

        const image = await renderSocialLeaderboard({
          userNick: currentUser.fullName,
          userAvatar: currentUser.avatarUrl,
          items: leaderboardItems,
        });

        await message.reply(
          new SendMessage({ message: new SendImageMessage(image) })
        );
      } catch (err) {
        logger.error('[feature.social.leaderboard] Error:', err);
        await message.reply(
          new SendMessage({
            message: new SendTextMessage('获取好感度列表失败，请稍后再试～'),
          })
        );
      }
    }
  );
}

/**
 * 渲染社交关系卡片（如结婚、送礼）
 * @param props 包含用户头像、昵称、好感度变动等属性
 * @returns 渲染后的图片 Buffer
 */
async function renderSocialCard(props: {
  type: InteractionType;
  userNick: string;
  userAvatar: string;
  targetNick: string;
  targetAvatar: string;
  favorability: number;
  changeAmount?: number;
  message?: string;
  isSurprise?: boolean;
}) {
  return await ReactRenderer.renderToImage(
    React.createElement(SocialCard, props)
  );
}

async function renderSocialLeaderboard(props: {
  userNick: string;
  userAvatar: string;
  items: any[];
}) {
  return await ReactRenderer.renderToImage(
    React.createElement(SocialLeaderboard, props)
  );
}
