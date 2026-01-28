import { RecvMessage } from '../../onebot/message/recv.entity';
import {
  SendMessage,
  SendImageMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity';
import { octokit } from '../../service/github';
import { browserService } from '../../service/browser';
import { TemplateEngine } from '../../utils/template';
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
    const data = {
      avatarUrl: userData.avatar_url,
      name: userData.name || userData.login,
      login: userData.login,
      bio: userData.bio,
      publicRepos: userData.public_repos,
      following: userData.following,
      followers: userData.followers,
      location: userData.location,
      blog: userData.blog,
      company: userData.company,
      createdAt: new Date(userData.created_at).toLocaleString('zh-CN'),
      updatedAt: new Date(userData.updated_at).toLocaleString('zh-CN'),
    };

    const html = TemplateEngine.render('github/user.hbs', data);
    const imageBuffer = await browserService.render(html);

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
