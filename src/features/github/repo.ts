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

  try {
    const data = {
      fullName: repoData.full_name,
      description: repoData.description || '无描述',
      ownerAvatarUrl: repoData.owner.avatar_url,
      ownerLogin: repoData.owner.login,
      ownerType: repoData.owner.type === 'Organization' ? '组织' : '用户',
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      issues: repoData.open_issues_count,
      watchers: repoData.watchers_count,
      language: repoData.language || '无',
      license: repoData.license?.name || '无',
      defaultBranch: repoData.default_branch,
      visibility: repoData.visibility,
      createdAt: new Date(repoData.created_at).toLocaleString('zh-CN'),
      updatedAt: new Date(repoData.updated_at).toLocaleString('zh-CN'),
    };

    const html = TemplateEngine.render('github/repo.hbs', data);
    const imageBuffer = await browserService.render(html);

    await new SendMessage({
      message: new SendImageMessage(imageBuffer),
    }).reply(message);
    return true;
  } catch (error) {
    logger.error('[feature.github.repo] Failed to render repo info: %s', error);
    await new SendMessage({
      message: new SendTextMessage('获取仓库信息失败喵~'),
    }).reply(message);
    return false;
  }
}
