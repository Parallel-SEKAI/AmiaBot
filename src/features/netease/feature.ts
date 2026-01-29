import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import { emojilyric, search, play, download } from './commands.js';

export async function init() {
  logger.info('[feature] Init netease feature');

  // 处理 /emojilyric 命令
  onebot.registerCommand(
    'netease',
    'emojilyric',
    '生成歌曲的 Emoji 歌词',
    'emojilyric [关键词]',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.emojilyric][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await emojilyric(message);
    }
  );

  // 处理 /search 命令
  onebot.registerCommand(
    'netease',
    'search',
    '搜索网易云音乐歌曲',
    'search [关键词]',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.search][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await search(message);
    }
  );

  // 处理 /play 命令
  onebot.registerCommand(
    'netease',
    'play',
    '点歌并发送音频文件',
    'play [关键词]',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.play][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await play(message);
    }
  );

  // 处理 /download 命令
  onebot.registerCommand(
    'netease',
    'download',
    '下载歌曲文件',
    'download [关键词]',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.netease.download][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      await download(message);
    }
  );
}
