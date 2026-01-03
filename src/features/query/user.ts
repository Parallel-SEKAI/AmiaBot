import { config } from '../../config';
import logger from '../../config/logger';
import { onebot } from '../../main';
import { User } from '../../onebot/user/user.entity';
import { RecvMessage } from '../../onebot/message/recv.entity';
import {
  SendImageMessage,
  SendMessage,
} from '../../onebot/message/send.entity';
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
  logger.info('[feature] Init query.user feature');
  onebot.registerCommand(
    'query',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.query.user][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await sendUserInfo(message);
    },
    'query'
  );
}

async function sendUserInfo(message: RecvMessage) {
  // 解析消息，提取用户ID
  let targetUserId: number;

  // 检查是否有@用户
  const atUser = message.message.find(
    (m) => m.type === 'at' && m.data.qq !== 'all'
  );
  if (atUser) {
    targetUserId = Number(atUser.data.qq);
  } else {
    // 默认获取发送者自己的信息
    targetUserId = message.userId;
  }

  // 获取用户信息
  const user = new User(targetUserId, message.groupId);
  await user.init();

  // 构建用户信息卡片
  const userInfoWidget: WidgetComponent = {
    type: 'Column',
    children: [],
  } as ColumnComponent;

  // 1. 用户头像和名称部分
  const headerSection: RowComponent = {
    type: 'Row',
    children: [
      {
        type: 'Image',
        url: user.avatarUrl,
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

  // 添加用户名称（必显示，因为用户ID已知）
  (headerSection.children[1] as ColumnComponent).children.push({
    type: 'Text',
    text: user.fullName,
    font_size: 24,
    font: config.enana.font,
  } as TextComponent);

  // 添加QQ号（必显示）
  (headerSection.children[1] as ColumnComponent).children.push({
    type: 'Text',
    text: `QQ号: ${user.id}`,
    font_size: 16,
    font: config.enana.font,
  } as TextComponent);

  userInfoWidget.children.push(headerSection);

  // 2. 第一部分分隔线
  userInfoWidget.children.push({
    type: 'Container',
    height: 2,
    color: [0, 0, 0, 255],
    margin: { top: 15, bottom: 15 },
  } as ContainerComponent);

  // 3. 用户信息部分
  const infoSection: ColumnComponent = {
    type: 'Column',
    children: [],
  };

  // 添加性别（仅当存在时显示）
  if (user.sex) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '性别:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text:
            user.sex === 'male' ? '男' : user.sex === 'female' ? '女' : '未知',
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加年龄（仅当存在时显示）
  if (user.age) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '年龄:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: user.age.toString(),
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加Q龄（仅当存在时显示）
  if (user.regYear) {
    const qAge = new Date().getFullYear() - user.regYear;
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: 'Q龄:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: `${qAge}年 (${user.regYear}年注册)`,
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加QQ等级（仅当存在时显示）
  if (user.qqLevel) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: 'QQ等级:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: user.qqLevel.toString(),
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加群名片（仅当存在时显示）
  if (user.card) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '群名片:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: user.card,
          font_size: 16,
          font: config.enana.font,
          max_width: 300,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加群角色（仅当存在时显示）
  if (user.role) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '群角色:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text:
            user.role === 'owner'
              ? '群主'
              : user.role === 'admin'
                ? '管理员'
                : '成员',
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加群等级（仅当存在时显示）
  if (user.groupLevel) {
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
          text: user.groupLevel,
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加群头衔（仅当存在时显示）
  if (user.title) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '群头衔:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: user.title,
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加加入时间（仅当存在时显示）
  if (user.joinTime) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '加入时间:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: user.joinTime.toLocaleString('zh-CN'),
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加最后发言时间（仅当存在时显示）
  if (user.lastSentTime) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '最后发言:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: user.lastSentTime.toLocaleString('zh-CN'),
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加VIP状态（仅当存在时显示）
  if (user.isVip !== null) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: 'VIP状态:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: user.isVip ? '是' : '否',
          font_size: 16,
          font: config.enana.font,
          color: user.isVip ? [255, 0, 0, 255] : [0, 0, 0, 255],
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加年费VIP状态（仅当存在时显示）
  if (user.isYearsVip !== null) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '年费VIP:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: user.isYearsVip ? '是' : '否',
          font_size: 16,
          font: config.enana.font,
          color: user.isYearsVip ? [255, 0, 0, 255] : [0, 0, 0, 255],
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 添加VIP等级（仅当存在时显示）
  if (user.vipLevel) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: 'VIP等级:',
          font_size: 16,
          font: config.enana.font,
          width: 100,
        } as TextComponent,
        {
          type: 'Text',
          text: user.vipLevel.toString(),
          font_size: 16,
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  // 只有当infoSection有内容时才添加到主组件
  if (infoSection.children.length > 0) {
    userInfoWidget.children.push(infoSection);
  }

  // 生成图片并发送
  new SendMessage({
    message: new SendImageMessage(await generatePage(userInfoWidget)),
  }).reply(message);
}
