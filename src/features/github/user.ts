import React from 'react';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendImageMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { octokit } from '../../service/github.js';
import { ReactRenderer } from '../../service/render/react.js';
import { UserCard } from '../../components/github/UserCard.js';
import logger from '../../config/logger.js';

export async function getUserInfo(
  message: RecvMessage,
  username: string
): Promise<boolean> {
  let response;
  try {
    response = await octokit.rest.users.getByUsername({
      username,
    });
  } catch (error: unknown) {
    logger.error('[feature.github.user][User: %s]', username, error);
    return false;
  }
  logger.info(
    '[feature.github.user][User: %s] Name: %s',
    username,
    response.data.name || response.data.login
  );

  const userData = response.data;

  try {
    const props = {
      avatarUrl: userData.avatar_url,
      name: userData.name || userData.login,
      login: userData.login,
      bio: userData.bio ?? null,
      publicRepos: userData.public_repos,
      following: userData.following,
      followers: userData.followers,
      location: userData.location ?? null,
      blog: userData.blog ?? null,
      company: userData.company ?? null,
      createdAt: new Date(userData.created_at).toLocaleString('zh-CN'),
      updatedAt: new Date(userData.updated_at).toLocaleString('zh-CN'),
    };

    const imageBuffer = await ReactRenderer.renderToImage(
      React.createElement(UserCard, props)
    );

    await new SendMessage({
      message: new SendImageMessage(imageBuffer),
    }).reply(message);
    return true;
  } catch (error) {
    logger.error('[feature.github.user] Failed to render user info: %s', error);
    await new SendMessage({
      message: new SendTextMessage('获取 GitHub 用户信息失败喵~'),
    }).reply(message);
    return false;
  }
}
