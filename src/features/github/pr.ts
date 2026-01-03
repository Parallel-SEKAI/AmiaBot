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

export async function getPRInfo(
  message: RecvMessage,
  owner: string,
  repo: string,
  prNumber: number
): Promise<boolean> {
  let response;
  try {
    response = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
  } catch (error: any) {
    logger.error(
      '[feature.github.pr][PR: %s/%s#%d]',
      owner,
      repo,
      prNumber,
      error
    );
    return false;
  }
  logger.info(
    '[feature.github.pr][PR: %s/%s#%d] Title: %s',
    owner,
    repo,
    prNumber,
    response.data.title
  );

  const prData = response.data;

  // 构建PR信息UI组件
  const prInfoWidget: WidgetComponent = {
    type: 'Column',
    children: [],
    padding: {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    },
  } as ColumnComponent;

  // PR基本信息：标题、编号、状态
  const headerSection: ColumnComponent = {
    type: 'Column',
    children: [
      {
        type: 'Row',
        children: [
          {
            type: 'Text',
            text: `#${prData.number}`,
            font_size: 16,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: prData.title,
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
        text:
          prData.state === 'open'
            ? '开放'
            : prData.merged
              ? '已合并'
              : '已关闭',
        font_size: 14,
        margin: {
          top: 8,
        },
        font: config.enana.font,
        color: prData.merged
          ? [0, 128, 0, 255]
          : prData.state === 'open'
            ? [0, 0, 255, 255]
            : [128, 0, 0, 255],
      } as TextComponent,
    ],
  } as ColumnComponent;
  prInfoWidget.children.push(headerSection);

  // 分隔线
  prInfoWidget.children.push({
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
        url: prData.user.avatar_url,
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
            text: prData.user.login,
            font_size: 14,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: new Date(prData.created_at).toLocaleString('zh-CN'),
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
  prInfoWidget.children.push(authorSection);

  // 分支信息
  const branchSection: RowComponent = {
    type: 'Row',
    margin: {
      top: 12,
    },
    children: [
      {
        type: 'Text',
        text: '分支:',
        font_size: 14,
        font: config.enana.font,
      } as TextComponent,
      {
        type: 'Text',
        text: `${prData.head.ref} → ${prData.base.ref}`,
        font_size: 14,
        margin: {
          left: 8,
        },
        font: config.enana.font,
      } as TextComponent,
    ],
  } as RowComponent;
  prInfoWidget.children.push(branchSection);

  // PR描述
  if (prData.body) {
    prInfoWidget.children.push({
      type: 'Text',
      text: prData.body,
      font_size: 14,
      margin: {
        top: 12,
      },
      font: config.enana.font,
      max_width: 400,
    } as TextComponent);
  }

  // 分隔线
  prInfoWidget.children.push({
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
            text: prData.comments.toString(),
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
            text: '提交',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: prData.commits.toString(),
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
            text: '添加',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: prData.additions.toString(),
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
            text: '删除',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: prData.deletions.toString(),
            font_size: 16,
            margin: {
              top: 4,
            },
            font: config.enana.font,
          } as TextComponent,
        ],
      } as ColumnComponent,
    ],
  } as RowComponent;
  prInfoWidget.children.push(statsSection);

  // 时间信息
  const timeSection: ColumnComponent = {
    type: 'Column',
    margin: {
      top: 12,
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
            text: new Date(prData.created_at).toLocaleString('zh-CN'),
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
          top: 4,
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
            text: new Date(prData.updated_at).toLocaleString('zh-CN'),
            font_size: 14,
            margin: {
              left: 8,
            },
            font: config.enana.font,
          } as TextComponent,
        ],
      } as RowComponent,
    ],
  } as ColumnComponent;

  // 合并时间（如果PR已合并）
  if (prData.merged_at) {
    timeSection.children.push({
      type: 'Row',
      margin: {
        top: 4,
      },
      children: [
        {
          type: 'Text',
          text: '合并时间:',
          font_size: 14,
          font: config.enana.font,
        } as TextComponent,
        {
          type: 'Text',
          text: new Date(prData.merged_at).toLocaleString('zh-CN'),
          font_size: 14,
          margin: {
            left: 8,
          },
          font: config.enana.font,
        } as TextComponent,
      ],
    } as RowComponent);
  }

  prInfoWidget.children.push(timeSection);

  // 调用 generatePage 函数生成图片
  const imageUrl = await generatePage(prInfoWidget);

  // 发送图片消息
  await new SendMessage({ message: new SendImageMessage(imageUrl) }).reply(
    message
  );
  return true;
}
