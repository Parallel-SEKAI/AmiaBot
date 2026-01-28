import React from 'react';
import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendImageMessage,
  SendVideoMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { checkFeatureEnabled } from '../../service/db.js';
import { ReactRenderer } from '../../service/render/react.js';
import { VideoCard } from '../../components/bilibili/VideoCard.js';
import { AvBvParams, VideoInfo } from './typing.js';
import { getBilibiliVideoInfo } from './video.js';
import { AV_PATTERN, BV_PATTERN, SHORT_URL_PATTERN } from './const.js';
import fetch from 'node-fetch';
import { downloadBilibiliVideo } from './download.js';
import { safeUnlink } from '../../utils/index.js';

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
              const infoImage = await generateVideoInfoImage(info);
              await new SendMessage({
                message: new SendImageMessage(infoImage),
              }).reply(message);
            },
            3,
            2000,
            'Send Info Image'
          ).catch(async (e) => {
            logger.error(
              '[feature.bilibili] Failed to send info image after retries:',
              e
            );
            await new SendMessage({
              message: new SendTextMessage('生成视频预览图失败了喵~'),
            }).send({ recvMessage: message });
          });

          const downloadVideoPromise = retry(
            async () => {
              if (info.bv) {
                const videoPath = await downloadBilibiliVideo(info.bv);
                if (videoPath) {
                  try {
                    const uploadedPath =
                      await onebot.uploadFileStream(videoPath);
                    await new SendMessage({
                      message: new SendVideoMessage(uploadedPath),
                    }).send({
                      recvMessage: message,
                    });
                  } finally {
                    await safeUnlink(videoPath);
                    logger.info(
                      '[feature.bilibili] Deleted cached video file: %s',
                      videoPath
                    );
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
            await new SendMessage({
              message: new SendTextMessage('视频下载失败了喵~'),
            }).send({ recvMessage: message });
          });

          await Promise.all([sendInfoPromise, downloadVideoPromise]);
        } catch (error) {
          logger.error(
            '[feature.bilibili] Failed to get video info after retries:',
            error
          );
          await new SendMessage({
            message: new SendTextMessage('获取视频信息失败了喵，请稍后再试喵~'),
          }).send({ recvMessage: message });
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

async function generateVideoInfoImage(info: VideoInfo): Promise<Buffer> {
  const formatDuration = (seconds: number) => {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const props = {
    coverUrl: info.cover,
    title: info.title,
    av: info.av,
    bv: info.bv,
    upperFaceUrl: info.upper.face,
    upperName: info.upper.name,
    play: info.cnt_info.play,
    thumbUp: info.cnt_info.thumb_up,
    coin: info.cnt_info.coin,
    collect: info.cnt_info.collect,
    danmaku: info.cnt_info.danmaku,
    reply: info.cnt_info.reply,
    share: info.cnt_info.share,
    intro: info.intro,
    totalPages: info.pages.length,
    pages: info.pages.slice(0, 5).map((p) => ({
      page: p.page,
      title: p.title,
      durationStr: formatDuration(p.duration),
    })),
    hasMorePages: info.pages.length > 5,
    remainingPages: info.pages.length - 5,
    totalEpisodes: info.total_episodes,
    seasons: info.ugc_season?.sections.slice(0, 2).map((s) => ({
      title: s.title,
      episodes: s.episodes.slice(0, 3).map((e) => ({
        title: e.title,
        durationStr: formatDuration(e.arc.duration),
      })),
      hasMoreEpisodes: s.episodes.length > 3,
      remainingEpisodes: s.episodes.length - 3,
    })),
    hasMoreSeasons: (info.ugc_season?.sections.length || 0) > 2,
    remainingSeasons: (info.ugc_season?.sections.length || 0) - 2,
  };

  return await ReactRenderer.renderToImage(
    React.createElement(VideoCard, props)
  );
}
