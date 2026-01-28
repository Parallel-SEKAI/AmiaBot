import React from 'react';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendImageMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { octokit } from '../../service/github.js';
import { ReactRenderer } from '../../service/render/react.js';
import { PRCard } from '../../components/github/PRCard.js';
import logger from '../../config/logger.js';

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

  try {
    const props = {
      number: prData.number,
      title: prData.title,
      isOpen: prData.state === 'open',
      isMerged: !!prData.merged,
      authorAvatarUrl: prData.user?.avatar_url ?? null,
      authorLogin: prData.user?.login ?? 'ghost',
      createdAt: new Date(prData.created_at).toLocaleString('zh-CN'),
      updatedAt: new Date(prData.updated_at).toLocaleString('zh-CN'),
      mergedAt: prData.merged_at
        ? new Date(prData.merged_at).toLocaleString('zh-CN')
        : null,
      headBranch: prData.head.ref,
      baseBranch: prData.base.ref,
      body: prData.body ?? null,
      comments: prData.comments,
      commits: prData.commits,
      additions: prData.additions,
      deletions: prData.deletions,
    };

    const imageBuffer = await ReactRenderer.renderToImage(
      React.createElement(PRCard, props)
    );

    await new SendMessage({
      message: new SendImageMessage(imageBuffer),
    }).reply(message);
    return true;
  } catch (error) {
    logger.error('[feature.github.pr] Failed to render PR info: %s', error);
    await new SendMessage({
      message: new SendTextMessage('获取 PR 信息失败喵~'),
    }).reply(message);
    return false;
  }
}
