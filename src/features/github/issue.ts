import React from 'react';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendImageMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { octokit } from '../../service/github.js';
import { ReactRenderer } from '../../service/render/react.js';
import { IssueCard } from '../../components/github/IssueCard.js';
import logger from '../../config/logger.js';

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

  const issueData = response.data;

  logger.info(
    '[feature.github.issue][Issue: %s/%s#%d] Title: %s',
    owner,
    repo,
    issueNumber,
    issueData.title
  );

  try {
    const props = {
      number: issueData.number,
      title: issueData.title,
      isOpen: issueData.state === 'open',
      authorAvatarUrl: issueData.user?.avatar_url ?? '',
      authorLogin: issueData.user?.login ?? 'unknown',
      createdAt: new Date(issueData.created_at).toLocaleString('zh-CN'),
      body: issueData.body ?? null,
      comments: issueData.comments,
    };

    const imageBuffer = await ReactRenderer.renderToImage(
      React.createElement(IssueCard, props)
    );

    await new SendMessage({
      message: new SendImageMessage(imageBuffer),
    }).reply(message);
    return true;
  } catch (error) {
    logger.error(
      '[feature.github.issue] Failed to render issue info: %s',
      error
    );
    await new SendMessage({
      message: new SendTextMessage('获取 Issue 信息失败喵~'),
    }).reply(message);
    return false;
  }
}
