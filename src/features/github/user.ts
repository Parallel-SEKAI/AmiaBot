import { RecvMessage } from '../../onebot/message/recv.entity';
import {
  SendMessage,
  SendImageMessage,
} from '../../onebot/message/send.entity';
import { octokit } from '../../service/github';
import { generatePage } from '../../service/enana';
import {
  WidgetComponent,
  ColumnComponent,
  RowComponent,
  TextComponent,
  ImageComponent,
  ContainerComponent,
} from '../../types/enana';
import { config } from '../../config';
import logger from '../../config/logger';

export async function getUserInfo(
  message: RecvMessage,
  username: string
): Promise<boolean> {
  let response;
  try {
    response = await octokit.rest.users.getByUsername({
      username,
    });
  } catch (error: any) {
    logger.error('[feature.github][User: %s] %s', username, error.message);
    return false;
  }
  logger.info(
    '[feature.github.user][User: %s] %s',
    username,
    response.data.name || response.data.login
  );

  const userData = response.data;

  // 构建用户信息UI组件
  const userInfoWidget: WidgetComponent = {
    type: 'Column',
    children: [],
    padding: {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    },
  } as ColumnComponent;

  // 用户头像
  const avatarSection: RowComponent = {
    type: 'Row',
    children: [
      {
        type: 'Image',
        url: userData.avatar_url,
        width: 80,
        height: 80,
        size: 'cover',
        border_radius: 40,
      } as ImageComponent,
    ],
  };
  userInfoWidget.children.push(avatarSection);

  // 用户基本信息：名称和用户名
  const headerSection: ColumnComponent = {
    type: 'Column',
    children: [
      {
        type: 'Text',
        text: userData.name || userData.login,
        font_size: 20,
        font: config.enana.font,
        text_align: 'center',
      } as TextComponent,
      {
        type: 'Text',
        text: `@${userData.login}`,
        font_size: 16,
        margin: {
          top: 4,
        },
        font: config.enana.font,
        text_align: 'center',
      } as TextComponent,
    ],
    margin: {
      top: 12,
      right: 0,
      bottom: 0,
      left: 0,
    },
  };
  userInfoWidget.children.push(headerSection);

  // 用户简介
  if (userData.bio) {
    const bioSection: ColumnComponent = {
      type: 'Column',
      children: [
        {
          type: 'Text',
          text: userData.bio,
          font_size: 14,
          font: config.enana.font,
          text_align: 'center',
          max_width: 400,
        } as TextComponent,
      ],
      margin: {
        top: 8,
        right: 0,
        bottom: 0,
        left: 0,
      },
    };
    userInfoWidget.children.push(bioSection);
  }

  // 分隔线
  userInfoWidget.children.push({
    type: 'Container',
    height: 2,
    margin: {
      top: 16,
      right: 0,
      bottom: 16,
      left: 0,
    },
    color: [0, 0, 0, 100],
    child: {
      type: 'Column',
      children: [],
    } as ColumnComponent,
  } as ContainerComponent);

  // 统计数据
  const statSection: RowComponent = {
    type: 'Row',
    margin: {
      top: 12,
      right: 0,
      bottom: 16,
      left: 0,
    },
    children: [
      {
        type: 'Column',
        children: [
          {
            type: 'Text',
            text: '仓库',
            font_size: 12,
            font: config.enana.font,
            text_align: 'center',
          } as TextComponent,
          {
            type: 'Text',
            text: userData.public_repos.toString(),
            font_size: 18,
            font: config.enana.font,
            text_align: 'center',
          } as TextComponent,
        ],
      } as ColumnComponent,
      {
        type: 'Column',
        children: [
          {
            type: 'Text',
            text: '关注',
            font_size: 12,
            font: config.enana.font,
            text_align: 'center',
          } as TextComponent,
          {
            type: 'Text',
            text: userData.following.toString(),
            font_size: 18,
            font: config.enana.font,
            text_align: 'center',
          } as TextComponent,
        ],
      } as ColumnComponent,
      {
        type: 'Column',
        children: [
          {
            type: 'Text',
            text: '粉丝',
            font_size: 12,
            font: config.enana.font,
            text_align: 'center',
          } as TextComponent,
          {
            type: 'Text',
            text: userData.followers.toString(),
            font_size: 18,
            font: config.enana.font,
            text_align: 'center',
          } as TextComponent,
        ],
      } as ColumnComponent,
    ],
  };
  userInfoWidget.children.push(statSection);

  // 分隔线
  userInfoWidget.children.push({
    type: 'Container',
    height: 2,
    margin: {
      top: 16,
      right: 0,
      bottom: 16,
      left: 0,
    },
    color: [0, 0, 0, 100],
    child: {
      type: 'Column',
      children: [],
    } as ColumnComponent,
  } as ContainerComponent);

  // 其他信息：位置、博客、公司
  const infoSection: ColumnComponent = {
    type: 'Column',
    children: [],
  };

  if (userData.location) {
    infoSection.children.push({
      type: 'Row',
      children: [
        {
          type: 'Text',
          text: '位置:',
          font_size: 14,
          font: config.enana.font,
        } as TextComponent,
        {
          type: 'Text',
          text: userData.location,
          font_size: 14,
          margin: {
            left: 8,
          },
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  if (userData.blog) {
    infoSection.children.push({
      type: 'Row',
      margin: {
        top: 8,
      },
      children: [
        {
          type: 'Text',
          text: '网站:',
          font_size: 14,
          font: config.enana.font,
        } as TextComponent,
        {
          type: 'Text',
          text: userData.blog,
          font_size: 14,
          margin: {
            left: 8,
          },
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  if (userData.company) {
    infoSection.children.push({
      type: 'Row',
      margin: {
        top: 8,
      },
      children: [
        {
          type: 'Text',
          text: '公司:',
          font_size: 14,
          font: config.enana.font,
        } as TextComponent,
        {
          type: 'Text',
          text: userData.company,
          font_size: 14,
          margin: {
            left: 8,
          },
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  if (infoSection.children.length > 0) {
    userInfoWidget.children.push(infoSection);
  }

  // 时间信息
  const timeSection: ColumnComponent = {
    type: 'Column',
    margin: {
      top: 12,
      right: 0,
      bottom: 0,
      left: 0,
    },
    children: [
      {
        type: 'Row',
        children: [
          {
            type: 'Text',
            text: '创建时间:',
            font_size: 14,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: new Date(userData.created_at).toLocaleString('zh-CN'),
            font_size: 14,
            margin: {
              left: 8,
            },
            font: config.enana.font,
          } as TextComponent,
        ],
      } as RowComponent,
      {
        type: 'Row',
        margin: {
          top: 8,
        },
        children: [
          {
            type: 'Text',
            text: '最后更新:',
            font_size: 14,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: new Date(userData.updated_at).toLocaleString('zh-CN'),
            font_size: 14,
            margin: {
              left: 8,
            },
            font: config.enana.font,
          } as TextComponent,
        ],
      } as RowComponent,
    ],
  };
  userInfoWidget.children.push(timeSection);

  // 调用 generatePage 函数生成图片
  const imageUrl = await generatePage(userInfoWidget);

  // 发送图片消息
  await new SendMessage({ message: new SendImageMessage(imageUrl) }).reply(
    message
  );
  return true;
}
