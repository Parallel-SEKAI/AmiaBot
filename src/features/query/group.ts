import { config } from '../../config';
import logger from '../../config/logger';
import { onebot } from '../../onebot';
import { Group } from '../../onebot/group/group.entity';
import { RecvMessage } from '../../onebot/message/recv.entity';
import {
  SendImageMessage,
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity';
import { browserService } from '../../service/browser';
import { TemplateEngine } from '../../utils/template';

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

    const data = {
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

    const html = TemplateEngine.render('query/group.hbs', data);
    const imageBuffer = await browserService.render(html);

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
