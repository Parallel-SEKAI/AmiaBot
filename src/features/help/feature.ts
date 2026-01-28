import React from 'react';
import { config } from '../../config/index.js';
import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendImageMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { ReactRenderer } from '../../service/render/react.js';
import { HelpCard } from '../../components/ui/HelpCard.js';

export async function init() {
  logger.info('[feature] Init help feature');
  onebot.registerCommand('help', async (data) => {
    const message = RecvMessage.fromMap(data);
    logger.info(
      '[feature.help][Group: %d][User: %d] %s',
      message.groupId,
      message.userId,
      message.rawMessage
    );

    const helpText = config.helpText.replace(/\\n/g, '\n');
    try {
      const imageBuffer = await ReactRenderer.renderToImage(
        React.createElement(HelpCard, { helpText })
      );

      void new SendMessage({
        message: new SendImageMessage(imageBuffer),
      }).reply(message);
    } catch (error) {
      logger.error('[feature.help] Failed to render help info: %s', error);
      void new SendMessage({
        message: new SendTextMessage(helpText),
      }).reply(message);
    }
  });
}
