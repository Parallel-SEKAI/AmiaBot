import logger from '../../config/logger';
import { onebot } from '../../main';
import { RecvMessage } from '../../onebot/message/recv.entity';
import {
  SendMessage,
  SendImageMessage,
  SendVideoMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';
import { generatePage } from '../../service/enana';
import { AvBvParams, VideoInfo } from './typing';
import { getBilibiliVideoInfo } from './video';
import {
  WidgetComponent,
  ColumnComponent,
  RowComponent,
  TextComponent,
  ImageComponent,
  ContainerComponent,
} from '../../types/enana';
import { AV_PATTERN, BV_PATTERN, SHORT_URL_PATTERN } from './const';
import { config } from '../../config';
import fetch from 'node-fetch';
import { downloadBilibiliVideo } from './download';
import * as fs from 'fs/promises';

export async function init() {
  logger.info('[feature] Init bilibili feature');
  onebot.on('message.group', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'bilibili')) {
      const message = RecvMessage.fromMap(data);

      let bvId: string | null = null;
      let avId: number | null = null;

      const avMatch = message.content.match(AV_PATTERN);
      if (avMatch) {
        logger.info(
          '[feature.bilibili][Group: %d][User: %d] %s',
          message.groupId,
          message.userId,
          message.rawMessage
        );
        avId = Number(avMatch[1]);
      }

      const bvMatch = message.content.match(BV_PATTERN);
      if (bvMatch) {
        logger.info(
          '[feature.bilibili][Group: %d][User: %d] %s',
          message.groupId,
          message.userId,
          message.rawMessage
        );
        bvId = bvMatch[1];
      }

      const shortUrlMatch = message.rawMessage.match(SHORT_URL_PATTERN);
      if (shortUrlMatch) {
        logger.info(
          '[feature.bilibili][Group: %d][User: %d] Detected short URL: %s',
          message.groupId,
          message.userId,
          message.rawMessage
        );
        const shortCode = shortUrlMatch[1];
        const resolvedUrl = await resolveB23ShortUrl(shortCode);
        if (resolvedUrl) {
          const avMatchFromUrl = resolvedUrl.match(AV_PATTERN);
          if (avMatchFromUrl) {
            avId = Number(avMatchFromUrl[1]);
          }

          const bvMatchFromUrl = resolvedUrl.match(BV_PATTERN);
          if (bvMatchFromUrl) {
            bvId = bvMatchFromUrl[1];
          }

          if (!avId && !bvId) {
            logger.info(
              '[feature.bilibili][Group: %d][User: %d] No BV/AV found in resolved URL: %s',
              message.groupId,
              message.userId,
              resolvedUrl
            );
          }
        } else {
          logger.warn(
            '[feature.bilibili][Group: %d][User: %d] Failed to resolve short URL: %s',
            message.groupId,
            message.userId,
            shortCode
          );
        }
      }

      if (avId || bvId) {
        const params: AvBvParams = {};
        if (avId) params.av = avId;
        if (bvId) params.bv = bvId;

        const retry = async <T>(
          fn: () => Promise<T>,
          retries: number,
          delay: number,
          context: string
        ): Promise<T> => {
          let lastError;
          for (let i = 0; i < retries; i++) {
            try {
              return await fn();
            } catch (e) {
              lastError = e;
              logger.error(
                '[feature.bilibili] %s attempt %d failed:',
                context,
                i + 1,
                e
              );
              if (i < retries - 1) {
                await new Promise((res) => setTimeout(res, delay));
              }
            }
          }
          throw lastError;
        };

        try {
          const info = await retry(
            () => getBilibiliVideoInfo(params),
            3,
            2000,
            'Get Video Info'
          );

          const sendInfoPromise = retry(
            async () => {
              let infoImage = await generateVideoInfoImage(info);
              // Convert data:image/png;base64,... to base64://...
              if (infoImage.startsWith('data:')) {
                const parts = infoImage.split(';base64,');
                if (parts.length === 2) {
                  infoImage = `base64://${parts[1]}`;
                }
              }
              await new SendMessage({
                message: new SendImageMessage(infoImage),
              }).reply(message);
            },
            3,
            2000,
            'Send Info Image'
          ).catch((e) => {
            logger.error(
              '[feature.bilibili] Failed to send info image after retries:',
              e
            );
          });

          const downloadVideoPromise = retry(
            async () => {
              if (info.bv) {
                const videoPath = await downloadBilibiliVideo(info.bv);
                if (videoPath) {
                  try {
                    const videoData = await fs.readFile(videoPath);
                    await new SendMessage({
                      message: new SendVideoMessage(
                        `base64://${videoData.toString('base64')}`
                      ),
                    }).send({
                      recvMessage: message,
                    });
                  } finally {
                    // Clean up the downloaded file
                    try {
                      await fs.unlink(videoPath);
                      logger.info(
                        '[feature.bilibili] Deleted cached video file: %s',
                        videoPath
                      );
                    } catch (e) {
                      logger.error(
                        '[feature.bilibili] Failed to delete cached video file: %s',
                        videoPath,
                        e
                      );
                    }
                  }
                }
              }
            },
            3,
            2000,
            'Download Video'
          ).catch(async (e) => {
            logger.error(
              '[feature.bilibili] Failed to download/send video after retries:',
              e
            );
          });

          await Promise.all([sendInfoPromise, downloadVideoPromise]);
        } catch (error) {
          logger.error(
            '[feature.bilibili] Failed to get video info after retries:',
            error
          );
        }
        return;
      }
    }
  });
}

async function resolveB23ShortUrl(shortCode: string): Promise<string | null> {
  const shortUrl = `https://b23.tv/${shortCode}`;

  try {
    // 使用 fetch 发起请求，不跟随重定向
    const response = await fetch(shortUrl, {
      redirect: 'manual', // 不自动跟随重定向，以便获取重定向目标
    });

    // 检查是否为重定向状态码
    if (response.status === 301 || response.status === 302) {
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        return redirectUrl;
      }
    }

    // 如果不是重定向，返回原始URL
    return response.url;
  } catch (error) {
    logger.error('[feature.bilibili] Error resolving short URL: %s', error);
    return null;
  }
}

async function generateVideoInfoImage(info: VideoInfo): Promise<string> {
  const fetchImageAsBase64 = async (url: string) => {
    const response = await fetch(url);
    const imageBuffer = await response.buffer();
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  };

  const [coverDataUrl, upperFaceDataUrl] = await Promise.all([
    fetchImageAsBase64(info.cover),
    fetchImageAsBase64(info.upper.face),
  ]);

  // 构建视频信息UI组件
  const videoInfoWidget: WidgetComponent = {
    type: 'Column',
    children: [],
    padding: {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    },
  } as ColumnComponent;

  // 视频封面和标题
  const headerSection: RowComponent = {
    type: 'Row',
    children: [
      {
        type: 'Image',
        url: coverDataUrl,
        width: 120,
        height: 68,
        size: 'cover',
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
            text: info.title,
            font_size: 16,
            max_width: 300,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: `AV${info.av} / ${info.bv}`,
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
  videoInfoWidget.children.push(headerSection);

  // 分隔线
  videoInfoWidget.children.push({
    type: 'Container',
    height: 2,
    margin: {
      top: 12,
      bottom: 12,
    },
    color: [0, 0, 0, 100],
  } as ContainerComponent);

  // UP主信息
  const upperSection: RowComponent = {
    type: 'Row',
    children: [
      {
        type: 'Image',
        url: upperFaceDataUrl,
        width: 32,
        height: 32,
        size: 'cover',
        border_radius: 16,
      } as ImageComponent,
      {
        type: 'Text',
        text: info.upper.name,
        font_size: 14,
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 8,
        },
        font: config.enana.font,
      } as TextComponent,
    ],
  };
  videoInfoWidget.children.push(upperSection);

  // 视频统计数据
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
            text: '播放',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: info.cnt_info.play.toString(),
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
            text: '点赞',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: info.cnt_info.thumb_up.toString(),
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
            text: '硬币',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: info.cnt_info.coin.toString(),
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
            text: '收藏',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: info.cnt_info.collect.toString(),
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
            text: '弹幕',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: info.cnt_info.danmaku.toString(),
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
            text: '评论',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: info.cnt_info.reply.toString(),
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
            text: '分享',
            font_size: 12,
            font: config.enana.font,
          } as TextComponent,
          {
            type: 'Text',
            text: info.cnt_info.share.toString(),
            font_size: 16,
            font: config.enana.font,
          } as TextComponent,
        ],
      } as ColumnComponent,
    ],
  };
  // videoInfoWidget.children.push({
  //   type: 'Container',
  //   padding: 8,
  //   border_radius: 8,
  //   margin: {
  //     top: 8,
  //     right: 0,
  //     bottom: 8,
  //     left: 0,
  //   },
  //   color: hexToRgba('#f9daec'),
  //   child: statSection
  // });
  videoInfoWidget.children.push(statSection);

  // 简介
  const introSection: ColumnComponent = {
    type: 'Column',
    margin: {
      top: 8,
      right: 0,
      bottom: 8,
      left: 0,
    },
    children: [
      {
        type: 'Text',
        text: '视频简介',
        font_size: 14,
        margin: {
          bottom: 8,
        },
        font: config.enana.font,
      } as TextComponent,
      {
        type: 'Text',
        text: info.intro,
        font_size: 12,
        margin: {
          top: 4,
        },
        font: config.enana.font,
        max_width: 380,
      } as TextComponent,
    ],
  };
  videoInfoWidget.children.push(introSection);

  // 分P信息
  if (info.pages.length > 1) {
    const pagesSection: ColumnComponent = {
      type: 'Column',
      children: [
        {
          type: 'Text',
          text: `分P信息 (${info.pages.length})`,
          font_size: 14,
          margin: {
            bottom: 8,
          },
          font: config.enana.font,
        } as TextComponent,
      ],
    };

    for (const page of info.pages.slice(0, 5)) {
      // 只显示前5个分P
      pagesSection.children.push({
        type: 'Text',
        text: `P${page.page} ${page.title} (${Math.floor(
          page.duration / 60
        )}:${String(page.duration % 60).padStart(2, '0')})`,
        font_size: 12,
        margin: {
          top: 4,
        },
        font: config.enana.font,
        max_width: 380,
      } as TextComponent);
    }

    if (info.pages.length > 5) {
      pagesSection.children.push({
        type: 'Text',
        text: `... 还有 ${info.pages.length - 5} 个分P`,
        font_size: 12,
        margin: {
          top: 4,
        },
        font: config.enana.font,
      } as TextComponent);
    }

    videoInfoWidget.children.push(pagesSection);
  }

  // 合集信息
  if (info.ugc_season?.sections) {
    const seasonSection: ColumnComponent = {
      type: 'Column',
      margin: {
        top: 12,
        right: 0,
        bottom: 0,
        left: 0,
      },
      children: [
        {
          type: 'Text',
          text: `合集信息 (共${info.total_episodes}集)`,
          font_size: 14,
          margin: {
            bottom: 8,
          },
          font: config.enana.font,
        } as TextComponent,
      ],
    };

    for (const section of info.ugc_season.sections.slice(0, 2)) {
      // 只显示前2个章节
      seasonSection.children.push({
        type: 'Text',
        text: section.title,
        font_size: 13,
        margin: {
          top: 8,
        },
        font: config.enana.font,
        max_width: 380,
      } as TextComponent);

      for (const episode of section.episodes.slice(0, 3)) {
        // 每个章节只显示前3集
        seasonSection.children.push({
          type: 'Text',
          text: `  > ${episode.title} (${Math.floor(
            episode.arc.duration / 60
          )}:${String(episode.arc.duration % 60).padStart(2, '0')})`,
          font_size: 12,
          margin: {
            top: 4,
            left: 8,
          },
          font: config.enana.font,
          max_width: 380,
        } as TextComponent);
      }

      if (section.episodes.length > 3) {
        seasonSection.children.push({
          type: 'Text',
          text: `  > 还有 ${section.episodes.length - 3} 集...`,
          font_size: 12,
          margin: {
            top: 4,
            left: 8,
          },
          font: config.enana.font,
        } as TextComponent);
      }
    }

    if (info.ugc_season.sections.length > 2) {
      seasonSection.children.push({
        type: 'Text',
        text: `... 还有 ${info.ugc_season.sections.length - 2} 个章节`,
        font_size: 12,
        margin: {
          top: 8,
        },
        font: config.enana.font,
      } as TextComponent);
    }

    videoInfoWidget.children.push(seasonSection);
  }

  // 调用 generatePage 函数生成图片
  const imageUrl = await generatePage(videoInfoWidget);

  return imageUrl;
}
