import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import {
  RecvMessage,
  RecvFaceMessage,
} from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
  SendFaceMessage,
} from '../../onebot/message/send.entity.js';
import {
  parseCommandLineArgs,
  emojiToFaceId,
  faceIdToEmoji,
} from '../../utils/index.js';
import {
  addReplyFace,
  removeReplyFace,
  clearUserReplyFaces,
  getUserReplyFaces,
  getUserReplyFaceIds,
  bulkAddReplyFaces,
  bulkRemoveReplyFaces,
} from './db.js';

/**
 * 初始化 回应 功能模块
 * 支持设置对特定用户的表情回应
 */
export async function init() {
  // 注册回应命令
  onebot.registerCommand(
    'reply',
    '回应',
    '自动表情回应功能',
    '/回应',
    async (data) => {
      const message = RecvMessage.fromMap(data);

      logger.info(
        '[feature.reply][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );

      try {
        // 解析命令
        const text = message.content.trim();
        const [args] = parseCommandLineArgs(text);
        const command = args[1]?.toLowerCase();

        if (command === 'on') {
          // 提取消息中的表情
          const faceIds = message.message
            .filter((msg) => msg.type === 'face')
            .map((msg) => (msg as RecvFaceMessage).id);

          const emojis =
            message.content.match(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu) || [];
          const emojiIds = emojis.map((emoji) => `e:${emojiToFaceId(emoji)}`);

          const finalFaceIds = [...new Set([...faceIds, ...emojiIds])];

          if (finalFaceIds.length > 0) {
            // 批量添加回应表情
            await bulkAddReplyFaces(message.userId, finalFaceIds);

            const responseMessages = [
              new SendTextMessage('已设置对您的消息使用以下表情进行回应： '),
            ];

            for (const faceId of finalFaceIds) {
              if (faceId.startsWith('e:')) {
                responseMessages.push(
                  new SendTextMessage(faceIdToEmoji(faceId.slice(2)))
                );
              } else {
                const id = parseInt(faceId);
                responseMessages.push(new SendFaceMessage(id));
              }
              responseMessages.push(new SendTextMessage(' '));
            }

            await new SendMessage({
              message: responseMessages,
            }).reply(message);

            logger.info(
              '[feature.reply] User %d set reply faces %s',
              message.userId,
              finalFaceIds.join(', ')
            );
          } else {
            await new SendMessage({
              message: [new SendTextMessage('请在命令后添加要回应的表情')],
            }).reply(message);
          }
        } else if (command === 'off') {
          // 提取消息中的表情
          const faceIds = message.message
            .filter((msg) => msg.type === 'face')
            .map((msg) => (msg as RecvFaceMessage).id);

          const emojis =
            message.content.match(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu) || [];
          const emojiIds = emojis.map((emoji) => `e:${emojiToFaceId(emoji)}`);

          const finalFaceIds = [...new Set([...faceIds, ...emojiIds])];

          if (finalFaceIds.length > 0) {
            // 批量删除回应表情
            await bulkRemoveReplyFaces(message.userId, finalFaceIds);

            const responseMessages = [
              new SendTextMessage('已关闭以下表情的回应功能： '),
            ];

            for (const faceId of finalFaceIds) {
              if (faceId.startsWith('e:')) {
                responseMessages.push(
                  new SendTextMessage(faceIdToEmoji(faceId.slice(2)))
                );
              } else {
                const id = parseInt(faceId);
                responseMessages.push(new SendFaceMessage(id));
              }
              responseMessages.push(new SendTextMessage(' '));
            }

            await new SendMessage({
              message: responseMessages,
            }).reply(message);

            logger.info(
              '[feature.reply] User %d removed reply faces %s',
              message.userId,
              finalFaceIds.join(', ')
            );
          } else {
            await new SendMessage({
              message: [new SendTextMessage('请在命令后添加要关闭的回应表情')],
            }).reply(message);
          }
        } else if (command === 'clear') {
          // 清除所有回应表情
          await clearUserReplyFaces(message.userId);

          await new SendMessage({
            message: [new SendTextMessage('已清除所有回应表情设置')],
          }).reply(message);

          logger.info(
            '[feature.reply] User %d cleared all reply faces',
            message.userId
          );
        } else if (command === 'list') {
          // 查看当前已启用的回应表情
          const replyFaces = await getUserReplyFaces(message.userId);

          if (replyFaces.length > 0) {
            // 创建表情消息数组
            const faceMessages = [
              new SendTextMessage('当前已设置的回应表情：\n'),
            ];

            for (const face of replyFaces) {
              const faceId = face.face_id;
              if (faceId.startsWith('e:')) {
                faceMessages.push(
                  new SendTextMessage(faceIdToEmoji(faceId.slice(2)))
                );
              } else {
                const id = parseInt(faceId);
                faceMessages.push(new SendFaceMessage(id));
              }
              faceMessages.push(new SendTextMessage(' ')); // 添加空格分隔
            }

            await new SendMessage({
              message: faceMessages,
            }).reply(message);
          } else {
            await new SendMessage({
              message: [new SendTextMessage('当前未设置任何回应表情')],
            }).reply(message);
          }
        } else {
          // 显示帮助信息
          await new SendMessage({
            message: [
              new SendTextMessage(
                '回应功能使用方法：\n' +
                  '/回应 on [表情] - 开启对特定表情的回应\n' +
                  '/回应 off [表情] - 关闭对特定表情的回应\n' +
                  '/回应 clear - 清除所有回应设置\n' +
                  '/回应 list - 查看当前已设置的回应表情'
              ),
            ],
          }).reply(message);
        }
      } catch (error) {
        logger.error('[feature.reply] Error processing reply command:', error);
        await new SendMessage({
          message: [new SendTextMessage('操作失败，请重试')],
        }).reply(message);
      }
    }
  );

  // 监听所有消息事件，检查是否需要回应
  onebot.registerCommand(
    'reply',
    /.*/,
    '自动表情回应',
    undefined,
    async (data) => {
      const message = RecvMessage.fromMap(data);

      // 只处理群消息
      if (message.messageType === 'group') {
        try {
          // 获取用户的所有回应表情ID（使用缓存）
          const faceIds = await getUserReplyFaceIds(message.userId);

          // 如果用户设置了回应表情，则进行回应
          if (faceIds.length > 0) {
            // 使用所有设置的表情进行回应
            for (const faceId of faceIds) {
              // 使用表情回应消息
              const success = await message.like(faceId);

              if (success) {
                logger.info(
                  '[feature.reply] Liked message from user %d with face %s',
                  message.userId,
                  faceId
                );
              } else {
                logger.error(
                  '[feature.reply] Failed to like message from user %d with face %s',
                  message.userId,
                  faceId
                );
              }
            }
          }
        } catch (error) {
          logger.error('[feature.reply] Error checking reply faces:', error);
        }
      }
    },
    { suppressLike: true }
  );

  logger.info('[feature.reply] Reply feature initialized');
}
