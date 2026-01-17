import { onebot } from '../../main';
import { RecvMessage } from '../../onebot/message/recv.entity';
import {
  SendMessage,
  SendTextMessage,
  SendImageMessage,
  SendForwardMessage,
  ForwardMessageNode,
} from '../../onebot/message/send.entity';
import { parseCommandLineArgs, hexToRgba } from '../../utils/index';
import logger from '../../config/logger';
import { generatePage } from '../../service/enana';
import {
  WidgetComponent,
  ColumnComponent,
  TextComponent,
  ContainerComponent,
} from '../../types/enana';
import { COLORS } from '../../const';
import { config } from '../../config';
import { FeatureModule } from '../feature-manager';
import { promises as fs } from 'fs';

const CHARACTERS = [
  'miku',
  'rin',
  'len',
  'luka',
  'meiko',
  'kaito',
  'ick',
  'saki',
  'hnm',
  'shiho',
  'mnr',
  'hrk',
  'airi',
  'szk',
  'khn',
  'an',
  'akt',
  'toya',
  'tks',
  'emu',
  'nene',
  'rui',
  'knd',
  'mfy',
  'ena',
  'mzk',
];

export async function init() {
  logger.info('[feature] init pjsk-sticker feature');
  onebot.registerCommand(
    'pjsk',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.pjsk-sticker][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      const [args, kwargs] = parseCommandLineArgs(message.content);
      if (args.length <= 1) return await help(message);
      let character = '';
      let content = '';
      let index = 0;
      if (args.length > 2) {
        character = args[1];
        if (character.match(/\d+$/)) {
          const match = character.match(/\d+$/);
          if (match) index = parseInt(match[0]);
          character = character.replace(/\d+$/, '');
        }
        content = args[2];
      } else {
        character = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        content = args[1];
      }
      // eg: /pjsk miku 你好 pos=(50,50) clr=(255,0,0) fs=50 stw=4 font=YurukaStd rot=50
      try {
        // 构建API请求URL
        const apiUrl = buildApiUrl(character, content, index, kwargs);

        // 发送图片消息
        new SendMessage({
          message: new SendImageMessage(apiUrl),
        }).reply(message);
      } catch (error) {
        logger.error(
          '[feature.pjsk-sticker] Failed to generate PJSK sticker:',
          error
        );
        new SendMessage({
          message: new SendTextMessage(
            '贴纸生成失败，请检查参数是否正确或稍后重试'
          ),
        }).reply(message);
      }
    },
    'pjsk-sticker'
  );
}

/**
 * 构建PJSK贴纸API请求URL
 * @param character 角色名称
 * @param text 要显示的文本内容
 * @param characterIndex 角色贴纸索引
 * @param kwargs 其他参数
 * @returns 完整的API请求URL
 */
function buildApiUrl(
  character: string,
  text: string,
  characterIndex: number,
  kwargs: Record<string, string>
): string {
  const baseUrl = 'https://api.parallel-sekai.org/pjsk-sticker';
  const params = new URLSearchParams();

  // 添加必需参数
  params.append('character', character);
  params.append('text', text);

  // 添加角色索引（如果提供）
  if (characterIndex > 0) {
    params.append('character_index', characterIndex.toString());
  }

  // 处理位置参数
  if (kwargs.pos) {
    const match = kwargs.pos.match(/\((\d+),(\d+)\)/);
    if (match) {
      params.append('position', match[1]);
      params.append('position', match[2]);
    }
  }

  // 处理颜色参数
  if (kwargs.clr) {
    const match = kwargs.clr.match(/\((\d+),(\d+),(\d+)\)/);
    if (match) {
      params.append('text_color', match[1]);
      params.append('text_color', match[2]);
      params.append('text_color', match[3]);
    }
  }

  // 处理字体大小
  if (kwargs.fs) {
    params.append('font_size', kwargs.fs);
  }

  // 处理字体路径
  if (kwargs.font) {
    params.append('font_path', kwargs.font);
  }

  // 处理旋转角度
  if (kwargs.rot) {
    params.append('rotation_angle', kwargs.rot);
  }

  return `${baseUrl}?${params.toString()}`;
}

async function help(message: RecvMessage) {
  // 创建帮助信息的组件结构
  const helpWidget: WidgetComponent = {
    type: 'Column',
    children: [
      // 标题
      {
        type: 'Text',
        text: 'PJSK 贴纸生成器帮助',
        font_size: 24,
        font_weight: 'bold',
        font: config.enana.font,
        color: hexToRgba(COLORS.primary), // primary 颜色
      } as TextComponent,
      // 说明文本
      {
        type: 'Text',
        text: '使用方法:',
        font_size: 18,
        font: config.enana.font,
        color: hexToRgba(COLORS.secondary), // secondary 颜色
      } as TextComponent,
      {
        type: 'Text',
        text: '/pjsk <角色名> <文本内容> [参数]',
        font_size: 16,
        font: config.enana.font,
        color: hexToRgba(COLORS.onSurface), // onSurface 颜色
      } as TextComponent,
      {
        type: 'Text',
        text: '可选参数:',
        font_size: 18,
        font: config.enana.font,
        color: hexToRgba(COLORS.secondary), // secondary 颜色
      } as TextComponent,
      {
        type: 'Text',
        text: 'pos=(x,y) - 文本位置',
        font_size: 14,
        font: config.enana.font,
        color: hexToRgba(COLORS.onSurface), // onSurface 颜色
      } as TextComponent,
      {
        type: 'Text',
        text: 'clr=(r,g,b) - 文本颜色',
        font_size: 14,
        font: config.enana.font,
        color: hexToRgba(COLORS.onSurface), // onSurface 颜色
      } as TextComponent,
      {
        type: 'Text',
        text: 'fs=大小 - 字体大小',
        font_size: 14,
        font: config.enana.font,
        color: hexToRgba(COLORS.onSurface), // onSurface 颜色
      } as TextComponent,
      {
        type: 'Text',
        text: 'font=字体 - 字体类型',
        font_size: 14,
        font: config.enana.font,
        color: hexToRgba(COLORS.onSurface), // onSurface 颜色
      } as TextComponent,
      {
        type: 'Text',
        text: 'rot=角度 - 旋转角度',
        font_size: 14,
        font: config.enana.font,
        color: hexToRgba(COLORS.onSurface), // onSurface 颜色
      } as TextComponent,
      // 示例
      {
        type: 'Text',
        text: '示例:',
        font_size: 18,
        font: config.enana.font,
        color: hexToRgba(COLORS.secondary), // secondary 颜色
      } as TextComponent,
      {
        type: 'Text',
        text: '/pjsk miku 你好',
        font_size: 14,
        font: config.enana.font,
        color: hexToRgba(COLORS.onSurface), // onSurface 颜色
      } as TextComponent,
      {
        type: 'Text',
        text: '/pjsk rin 测试 pos=(50,50) clr=(255,0,0)',
        font_size: 14,
        font: config.enana.font,
        color: hexToRgba(COLORS.onSurface), // onSurface 颜色
      } as TextComponent,
    ],
  } as ColumnComponent;

  // 使用 Enana API 生成帮助图片
  const helpImageBuffer = await generatePage(helpWidget);

  // 发送生成的帮助图片
  await new SendMessage({
    message: new SendForwardMessage([
      {
        type: 'node',
        data: {
          userId: onebot.qq,
          nickname: onebot.nickname,
          content: [new SendImageMessage(helpImageBuffer)],
        },
      } as ForwardMessageNode,
      {
        type: 'node',
        data: {
          userId: onebot.qq,
          nickname: onebot.nickname,
          content: [
            new SendImageMessage(await fs.readFile('assets/pjsk-sticker/vs.png')),
          ],
        },
      } as ForwardMessageNode,
      {
        type: 'node',
        data: {
          userId: onebot.qq,
          nickname: onebot.nickname,
          content: [
            new SendImageMessage(await fs.readFile('assets/pjsk-sticker/ln.png')),
          ],
        },
      } as ForwardMessageNode,
      {
        type: 'node',
        data: {
          userId: onebot.qq,
          nickname: onebot.nickname,
          content: [
            new SendImageMessage(
              await fs.readFile('assets/pjsk-sticker/mmj.png')
            ),
          ],
        },
      } as ForwardMessageNode,
      {
        type: 'node',
        data: {
          userId: onebot.qq,
          nickname: onebot.nickname,
          content: [
            new SendImageMessage(
              await fs.readFile('assets/pjsk-sticker/vbs.png')
            ),
          ],
        },
      } as ForwardMessageNode,
      {
        type: 'node',
        data: {
          userId: onebot.qq,
          nickname: onebot.nickname,
          content: [
            new SendImageMessage(await fs.readFile('assets/pjsk-sticker/ws.png')),
          ],
        },
      } as ForwardMessageNode,
      {
        type: 'node',
        data: {
          userId: onebot.qq,
          nickname: onebot.nickname,
          content: [
            new SendImageMessage(await fs.readFile('assets/pjsk-sticker/25.png')),
          ],
        },
      } as ForwardMessageNode,
    ]),
  }).reply(message);
}
