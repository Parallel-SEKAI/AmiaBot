import logger from '../../config/logger';
import { onebot } from '../../main';
import { RecvMessage } from '../../onebot/message/recv.entity';
import { checkFeatureEnabled } from '../../service/db';
import { emojilyric, search, play, download } from './commands';
import { FeatureModule } from '../feature-manager';

export async function init() {
  logger.info('[feature] Init netease feature');

  // 处理 /emojilyric 命令
  onebot.registerCommand('emojilyric', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'netease')) {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.emojilyric][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await emojilyric(message);
    }
  });

  // 处理 /search 命令
  onebot.registerCommand('search', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'netease')) {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.search][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await search(message);
    }
  });

  // 处理 /play 命令
  onebot.registerCommand('play', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'netease')) {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.play][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await play(message);
    }
  });

  // 处理 /download 命令
  onebot.registerCommand('download', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'netease')) {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.download][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await download(message);
    }
  });
}
