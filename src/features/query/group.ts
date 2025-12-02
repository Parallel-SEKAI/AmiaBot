import { config } from '../../config';
import logger from '../../config/logger';
import { onebot } from '../../main';
import { Group } from '../../onebot/group/group.entity';
import { RecvMessage } from '../../onebot/message/recv.entity';
import {
  SendImageMessage,
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';
import { generatePage } from '../../service/enana';
import {
  WidgetComponent,
  ColumnComponent,
  RowComponent,
  TextComponent,
  ImageComponent,
  ContainerComponent,
} from '../../types/enana';

export async function init() {
  logger.info('[feature] Init query.group feature');
  onebot.on('message.command.group', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'query.group')) {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[query.group][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await sendGroupInfo(message.groupId!, message);
    }
  });
}

async function sendGroupInfo(groupId: number, message: RecvMessage) {
  const group = new Group(groupId);
  await group.init();

  // 构建群信息卡片
  const groupInfoWidget: WidgetComponent = {
    type: 'Column',
    children: [],
  } as ColumnComponent;

  // 1. 群头像和名称部分
  const headerSection: RowComponent = {
    type: 'Row',
    children: [
      {
        type: 'Image',
        url: group.avatarUrl,
        width: 80,
        height: 80,
        size: 'cover',
      } as ImageComponent,
      {
        type: 'Column',
        padding: { top: 0, right: 0, bottom: 0, left: 20 },
        children: [],
      } as ColumnComponent,
    ],
  };

  // 添加群名称（必显示，因为群ID已知）
  (headerSection.children[1] as ColumnComponent).children.push({
    type: 'Text',
    text: group.name || `群聊 ${group.id}`,
    font_size: 24,
    font: config.enana.font,
  } as TextComponent);

  // 添加群号（必显示）
  (headerSection.children[1] as ColumnComponent).children.push({
    type: 'Text',
    text: `群号: ${group.id}`,
    font_size: 16,
    font: config.enana.font,
  } as TextComponent);

  groupInfoWidget.children.push(headerSection);

  // 2. 第一部分分隔线
  groupInfoWidget.children.push({
    type: 'Container',
    height: 2,
    color: [0, 0, 0, 255],
    margin: { top: 15, bottom: 15 },
  } as ContainerComponent);

  // 3. 群信息部分
  const infoSection: ColumnComponent = {
    type: 'Column',
    children: [],
  };

  // 添加群等级（仅当存在时显示）
  if (group.level !== null) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '群等级:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: group.level.toString(),
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加创建时间（仅当存在时显示）
  if (group.createTime !== null) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '创建时间:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: group.createTime.toLocaleString('zh-CN'),
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加成员数量（仅当至少有一个值存在时显示）
  if (group.memberCount !== null || group.maxMemberCount !== null) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '成员数量:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: `${group.memberCount || 0}/${group.maxMemberCount || 0}`,
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加活跃成员（仅当存在时显示）
  if (group.activeMemberCount !== null) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '活跃成员:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: group.activeMemberCount.toString(),
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加群主ID（仅当存在时显示）
  if (group.ownerId !== null) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '群主ID:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: group.ownerId.toString(),
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加群规（仅当存在时显示）
  if (group.rules) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '群规:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: group.rules,
          font_size: 16,
          font: config.enana.font,
          max_width: 300,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加加群问题（仅当存在时显示）
  if (group.joinQuestion) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '加群问题:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: group.joinQuestion,
          font_size: 16,
          font: config.enana.font,
          max_width: 300,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加全员禁言状态
  infoSection.children.push({
    type: 'Row',
    children: [
      {
        type: 'Text',
        text: '全员禁言:',
        font_size: 16,
        font: config.enana.font,
        width: 100,
      } as TextComponent,
      {
        type: 'Text',
        text: group.isMutedAll ? '开启' : '关闭',
        font_size: 16,
        font: config.enana.font,
        color: group.isMutedAll ? [255, 0, 0, 255] : [0, 0, 0, 255],
      } as TextComponent,
    ],
  } as RowComponent);

  // 只有当infoSection有内容时才添加到主组件
  if (infoSection.children.length > 0) {
    groupInfoWidget.children.push(infoSection);

    // 4. 第二部分分隔线
    groupInfoWidget.children.push({
      type: 'Container',
      height: 2,
      color: [0, 0, 0, 0.1],
      margin: { top: 15, bottom: 15 },
    } as ContainerComponent);
  }

  // 5. 群描述部分（仅当存在时显示）
  if (group.description) {
    groupInfoWidget.children.push({
      type: 'Column',
      children: [
        {
          type: 'Text',
          text: '群描述:',
          font_size: 18,
          font: config.enana.font,
          font_weight: 'bold',
        } as TextComponent,
        {
          type: 'Text',
          text: group.description,
          font_size: 16,
          font: config.enana.font,
          max_width: 400,
        } as TextComponent,
      ],
    } as ColumnComponent);
  }

  // 生成图片并发送到群聊中
  new SendMessage({
    message: new SendImageMessage(await generatePage(groupInfoWidget)),
  }).reply(message);
}
