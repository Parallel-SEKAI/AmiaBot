import logger from '../../config/logger';
import { onebot } from '../../onebot';
import { RecvMessage } from '../../onebot/message/recv.entity';
import { emojilyric, search, play, download } from './commands';
import { FeatureModule } from '../feature-manager';

export async function init() {
  logger.info('[feature] Init netease feature');

  // 处理 /emojilyric 命令
  onebot.registerCommand(
    'emojilyric',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.emojilyric][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await emojilyric(message);
    },
    'netease'
  );

  // 处理 /search 命令
  onebot.registerCommand(
    'search',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.search][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await search(message);
    },
    'netease'
  );

  // 处理 /play 命令
  onebot.registerCommand(
    'play',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.play][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await play(message);
    },
    'netease'
  );

  // 处理 /download 命令
  onebot.registerCommand(
    'download',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.download][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await download(message);
    },
    'netease'
  );
}
