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

export async function getRepoInfo(
  message: RecvMessage,
  owner: string,
  repo: string
): Promise<boolean> {
  let response;
  try {
    response = await octokit.rest.repos.get({
      owner,
      repo,
    });
  } catch (error: any) {
    logger.error('[feature.github.repo][Repo: %s/%s]', owner, repo, error);
    return false;
  }
  logger.info(
    '[feature.github.repo][Repo: %s/%s] Description: %s',
    owner,
    repo,
    response.data.description
  );

  const repoData = response.data;

  // 构建仓库信息UI组件
  const repoInfoWidget: WidgetComponent = {
    type: 'Column',
    children: [],
    padding: {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    },
  } as ColumnComponent;

  // 仓库基本信息：名称和描述
  const headerSection: ColumnComponent = {
    type: 'Column',
    children: [
      {
        type: 'Text',
        text: repoData.full_name,
        font_size: 18,
        font: config.enana.font,
      } as TextComponent,
      {
        type: 'Text',
        text: repoData.description || '无描述',
        font_size: 14,
        margin: {
          top: 8,
          right: 0,
          bottom: 0,
          left: 0,
        },
        font: config.enana.font,
        max_width: 400,
      } as TextComponent,
    ],
  };
  repoInfoWidget.children.push(headerSection);

  // 分隔线
  repoInfoWidget.children.push({
    type: 'Container',
    height: 2,
    margin: {
      top: 12,
      bottom: 12,
    },
    color: [0, 0, 0, 100],
  } as ContainerComponent);

  // 所有者信息
  const ownerSection: RowComponent = {
    type: 'Row',
    children: [
      {
        type: 'Image',
        url: repoData.owner.avatar_url,
        width: 40,
        height: 40,
        size: 'cover',
        border_radius: 20,
      } as ImageComponent,
      {
        type: 'Column',
        padding: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 12,
        },
        children: [
          {
            type: 'Text',
            text: repoData.owner.login,
            font_size: 14,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: repoData.owner.type === 'Organization' ? '组织' : '用户',
            font_size: 12,
            margin: {
              top: 4,
              right: 0,
              bottom: 0,
              left: 0,
            },
            font: config.enana.font,
          } as TextComponent,
        ],
      } as ColumnComponent,
    ],
  };
  repoInfoWidget.children.push(ownerSection);

  // 统计数据
  const statSection: RowComponent = {
    type: 'Row',
    margin: {
      top: 12,
      right: 0,
      bottom: 12,
      left: 0,
    },
    children: [
      {
        type: 'Column',
        children: [
          {
            type: 'Text',
            text: '星标',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: repoData.stargazers_count.toString(),
            font_size: 16,
            font: config.enana.font,
          } as TextComponent,
        ],
      } as ColumnComponent,
      {
        type: 'Column',
        margin: {
          left: 20,
        },
        children: [
          {
            type: 'Text',
            text: '分支',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: repoData.forks_count.toString(),
            font_size: 16,
            font: config.enana.font,
          } as TextComponent,
        ],
      } as ColumnComponent,
      {
        type: 'Column',
        margin: {
          left: 20,
        },
        children: [
          {
            type: 'Text',
            text: '问题',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: repoData.open_issues_count.toString(),
            font_size: 16,
            font: config.enana.font,
          } as TextComponent,
        ],
      } as ColumnComponent,
      {
        type: 'Column',
        margin: {
          left: 20,
        },
        children: [
          {
            type: 'Text',
            text: '观察',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: repoData.watchers_count.toString(),
            font_size: 16,
            font: config.enana.font,
          } as TextComponent,
        ],
      } as ColumnComponent,
    ],
  };
  repoInfoWidget.children.push(statSection);

  // 分隔线
  repoInfoWidget.children.push({
    type: 'Container',
    height: 2,
    margin: {
      top: 12,
      bottom: 12,
    },
    color: [0, 0, 0, 100],
  } as ContainerComponent);

  // 其他信息：语言、许可证、默认分支
  const infoSection: ColumnComponent = {
    type: 'Column',
    children: [
      {
        type: 'Row',
        children: [
          {
            type: 'Text',
            text: '主要语言:',
            font_size: 14,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: repoData.language || '无',
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
            text: '许可证:',
            font_size: 14,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: repoData.license?.name || '无',
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
            text: '默认分支:',
            font_size: 14,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: repoData.default_branch,
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
            text: '可见性:',
            font_size: 14,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: repoData.visibility,
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
  repoInfoWidget.children.push(infoSection);

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
            text: new Date(repoData.created_at).toLocaleString('zh-CN'),
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
            text: new Date(repoData.updated_at).toLocaleString('zh-CN'),
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
  repoInfoWidget.children.push(timeSection);

  // 调用 generatePage 函数生成图片
  const imageUrl = await generatePage(repoInfoWidget);

  // 发送图片消息
  await new SendMessage({ message: new SendImageMessage(imageUrl) }).reply(
    message
  );
  return true;
}
