import { onebot } from '../../main';
import {
  SendMessage,
  SendImageMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { RecvMessage } from '../../onebot/message/recv.entity';
import logger from '../../config/logger';

// 将xml2js的parseString转换为Promise形式
const parseXml = promisify(parseString);

export async function init() {
  logger.info('[feature] Init comic feature');
  onebot.on('message.command.comic', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'comic')) {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.comic][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      try {
        const response = await fetch(
          'https://storage.sekai.best/sekai-cn-assets/?delimiter=%2F&list-type=2&max-keys=1000&prefix=comic/one_frame/'
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 获取XML内容
        const xmlContent = await response.text();

        // 解析XML
        const result = (await parseXml(xmlContent)) as any;

        // 提取漫画图片的URL列表
        const files = result?.ListBucketResult?.Contents || [];
        const imageUrls = files
          .map((file: any) => file.Key[0])
          .filter((key: string) => key.endsWith('.webp'))
          .map(
            (key: string) => `https://storage.sekai.best/sekai-cn-assets/${key}`
          );

        if (imageUrls.length === 0) {
          throw new Error('No comic images found');
        }

        // 随机选择一个图片URL
        const randomImageUrl =
          imageUrls[Math.floor(Math.random() * imageUrls.length)];

        // 发送图片消息
        new SendMessage({
          message: new SendImageMessage(randomImageUrl),
        }).reply(message);
      } catch (error) {
        console.error('Error in comic feature:', error);
        // 发送错误提示
        new SendMessage({
          message: new SendTextMessage('获取漫画失败，请稍后重试'),
        }).reply(message);
      }
    }
  });
}
