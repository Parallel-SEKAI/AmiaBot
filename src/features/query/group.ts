import React from 'react';
import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { Group } from '../../onebot/group/group.entity.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendImageMessage,
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { ReactRenderer } from '../../service/render/react.js';
import { QueryGroupCard } from '../../components/query/QueryGroupCard.js';

export async function init() {
  logger.info('[feature] Init query.group feature');
  onebot.registerCommand(
    'group',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.query.group][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await sendGroupInfo(message.groupId!, message);
    },
    'query'
  );
}

async function sendGroupInfo(groupId: number, message: RecvMessage) {
  try {
    const group = new Group(groupId);
    await group.init();

    const props = {
      avatarUrl: group.avatarUrl,
      name: group.name || `群聊 ${group.id}`,
      id: group.id,
      level: group.level,
      createTime: group.createTime?.toLocaleString('zh-CN'),
      memberCount: group.memberCount,
      maxMemberCount: group.maxMemberCount,
      activeMemberCount: group.activeMemberCount,
      ownerId: group.ownerId,
      rules: group.rules,
      joinQuestion: group.joinQuestion,
      isMutedAll: group.isMutedAll,
      description: group.description,
    };

    const imageBuffer = await ReactRenderer.renderToImage(
      React.createElement(QueryGroupCard, props)
    );

    await new SendMessage({
      message: new SendImageMessage(imageBuffer),
    }).reply(message);
  } catch (error) {
    logger.error(
      '[feature.query.group] Failed to render group info: %s',
      error
    );
    await new SendMessage({
      message: new SendTextMessage('获取群信息失败喵~'),
    }).reply(message);
  }
}
