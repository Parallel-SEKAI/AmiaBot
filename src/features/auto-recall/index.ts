import logger from '../../config/logger';
import { onebot } from '../../main';
import {
  recalledMessageIds,
  messageHistory,
} from '../../onebot/message/send.entity';

export async function init() {
  logger.info('[feature] Init auto-recall feature');
  onebot.on('notice.group_recall', async (data) => {
    try {
      const { message_id: recalledMsgId } = data;
      if (!recalledMsgId) {
        logger.warn(
          '[auto-recall] Received group_recall notice without message_id'
        );
        return;
      }

      const msgId = Number(recalledMsgId);
      logger.info('[auto-recall] Processing recall for message %d', msgId);

      // 将原消息ID加入撤回集合，禁止后续关联消息发送
      recalledMessageIds.add(msgId);

      // 递归撤回所有关联消息
      await recallRelatedMessages(msgId);
    } catch (error) {
      logger.error(
        '[auto-recall] Error processing group_recall: %s',
        error instanceof Error ? error.message : String(error)
      );
    }
  });
}

/**
 * 递归撤回所有关联消息
 * @param originalMsgId 被撤回的原始消息ID
 */
async function recallRelatedMessages(originalMsgId: number) {
  try {
    const relatedMessages = messageHistory[originalMsgId];
    if (!relatedMessages || relatedMessages.length === 0) {
      logger.info(
        '[auto-recall] No related messages found for %d',
        originalMsgId
      );
      return;
    }

    logger.info(
      '[auto-recall] Found %d related messages for %d',
      relatedMessages.length,
      originalMsgId
    );

    // 遍历所有关联消息，依次撤回
    for (const relatedMsg of relatedMessages) {
      try {
        const relatedMsgId = relatedMsg.messageId;
        if (!relatedMsgId) continue;

        logger.info('[auto-recall] Recalling related message %s', relatedMsgId);

        // 调用OneBot API撤回消息
        await onebot.action('delete_msg', {
          message_id: relatedMsgId,
        });

        logger.info(
          '[auto-recall] Successfully recalled message %s',
          relatedMsgId
        );

        // 递归撤回该关联消息的关联消息
        await recallRelatedMessages(Number(relatedMsgId));
      } catch (error) {
        logger.error(
          '[auto-recall] Failed to recall message %s: %s',
          relatedMsg.messageId,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  } catch (error) {
    logger.error(
      '[auto-recall] Error recalling related messages: %s',
      error instanceof Error ? error.message : String(error)
    );
  }
}
