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

export async function getIssueInfo(
  message: RecvMessage,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<boolean> {
  let response;
  try {
    response = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });
  } catch (error: any) {
    logger.error(
      '[feature.github.issue][Issue: %s/%s#%d]',
      owner,
      repo,
      issueNumber,
      error
    );
    return false;
  }
  logger.info(
    '[feature.github.issue][Issue: %s/%s#%d] Title: %s',
    owner,
    repo,
    issueNumber,
    issueData.title
  );

  const issueData = response.data;

  // 构建Issue信息UI组件
  const issueInfoWidget: WidgetComponent = {
    type: 'Column',
    children: [],
    padding: {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    },
  } as ColumnComponent;

  // Issue基本信息：标题、编号、状态
  const headerSection: ColumnComponent = {
    type: 'Column',
    children: [
      {
        type: 'Row',
        children: [
          {
            type: 'Text',
            text: `#${issueData.number}`,
            font_size: 16,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: issueData.title,
            font_size: 18,
            margin: {
              left: 8,
            },
            font: config.enana.font,
            max_width: 400,
          } as TextComponent,
        ],
      } as RowComponent,
      {
        type: 'Text',
        text: issueData.state === 'open' ? '开放' : '关闭',
        font_size: 14,
        margin: {
          top: 8,
        },
        font: config.enana.font,
        color: issueData.state === 'open' ? [0, 128, 0, 255] : [128, 0, 0, 255],
      } as TextComponent,
    ],
  } as ColumnComponent;
  issueInfoWidget.children.push(headerSection);

  // 分隔线
  issueInfoWidget.children.push({
    type: 'Container',
    height: 2,
    margin: {
      top: 12,
      bottom: 12,
    },
    color: [0, 0, 0, 100],
    child: {
      type: 'Column',
      children: [],
    } as ColumnComponent,
  } as ContainerComponent);

  // 作者信息
  const authorSection: RowComponent = {
    type: 'Row',
    children: [
      {
        type: 'Image',
        url: issueData.user.avatar_url,
        width: 40,
        height: 40,
        size: 'cover',
        border_radius: 20,
      } as ImageComponent,
      {
        type: 'Column',
        margin: {
          left: 8,
        },
        children: [
          {
            type: 'Text',
            text: issueData.user.login,
            font_size: 14,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: new Date(issueData.created_at).toLocaleString('zh-CN'),
            font_size: 12,
            margin: {
              top: 4,
            },
            font: config.enana.font,
          } as TextComponent,
        ],
      } as ColumnComponent,
    ],
  } as RowComponent;
  issueInfoWidget.children.push(authorSection);

  // Issue描述
  if (issueData.body) {
    issueInfoWidget.children.push({
      type: 'Text',
      text: issueData.body,
      font_size: 14,
      margin: {
        top: 12,
      },
      font: config.enana.font,
      max_width: 400,
    } as TextComponent);
  }

  // 分隔线
  issueInfoWidget.children.push({
    type: 'Container',
    height: 2,
    margin: {
      top: 12,
      bottom: 12,
    },
    color: [0, 0, 0, 100],
  } as ContainerComponent);

  // 统计数据
  const statsSection: RowComponent = {
    type: 'Row',
    children: [
      {
        type: 'Column',
        children: [
          {
            type: 'Text',
            text: '评论',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: issueData.comments.toString(),
            font_size: 16,
            margin: {
              top: 4,
            },
            font: config.enana.font,
          } as TextComponent,
        ],
      } as ColumnComponent,
      {
        type: 'Column',
        margin: {
          left: 24,
        },
        children: [
          {
            type: 'Text',
            text: '状态',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: issueData.state === 'open' ? '开放' : '关闭',
            font_size: 16,
            margin: {
              top: 4,
            },
            font: config.enana.font,
            color:
              issueData.state === 'open' ? [0, 128, 0, 255] : [128, 0, 0, 255],
          } as TextComponent,
        ],
      } as ColumnComponent,
    ],
  } as RowComponent;
  issueInfoWidget.children.push(statsSection);

  // 调用 generatePage 函数生成图片
  const imageUrl = await generatePage(issueInfoWidget);

  // 发送图片消息
  await new SendMessage({ message: new SendImageMessage(imageUrl) }).reply(
    message
  );
  return true;
}
