import { config } from '../../config';
import logger from '../../config/logger';
import { onebot } from '../../onebot';
import { User } from '../../onebot/user/user.entity';
import { RecvMessage } from '../../onebot/message/recv.entity';
import {
  SendImageMessage,
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity';
import { browserService } from '../../service/browser';
import { TemplateEngine } from '../../utils/template';

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
  try {
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

    const data = {
      avatarUrl: user.avatarUrl,
      fullName: user.fullName,
      id: user.id,
      sex: user.sex,
      sexText:
        user.sex === 'male' ? '男' : user.sex === 'female' ? '女' : '未知',
      age: user.age,
      regYear: user.regYear,
      qAge: user.regYear ? new Date().getFullYear() - user.regYear : null,
      qqLevel: user.qqLevel,
      card: user.card,
      role: user.role,
      roleText:
        user.role === 'owner'
          ? '群主'
          : user.role === 'admin'
            ? '管理员'
            : '成员',
      groupLevel: user.groupLevel,
      title: user.title,
      joinTime: user.joinTime?.toLocaleString('zh-CN'),
      lastSentTime: user.lastSentTime?.toLocaleString('zh-CN'),
      hasVipInfo: user.isVip !== null,
      isVip: user.isVip,
      isYearsVip: user.isYearsVip,
      vipLevel: user.vipLevel,
    };

    const html = TemplateEngine.render('query/user.hbs', data);
    const imageBuffer = await browserService.render(html);

    await new SendMessage({
      message: new SendImageMessage(imageBuffer),
    }).reply(message);
  } catch (error) {
    logger.error('[feature.query.user] Failed to render user info: %s', error);
    await new SendMessage({
      message: new SendTextMessage('获取用户信息失败喵~'),
    }).reply(message);
  }
}
