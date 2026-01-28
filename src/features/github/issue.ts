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
    const data = {
      number: issueData.number,
      title: issueData.title,
      isOpen: issueData.state === 'open',
      authorAvatarUrl: issueData.user.avatar_url,
      authorLogin: issueData.user.login,
      createdAt: new Date(issueData.created_at).toLocaleString('zh-CN'),
      body: issueData.body,
      comments: issueData.comments,
    };

    const html = TemplateEngine.render('github/issue.hbs', data);
    const imageBuffer = await browserService.render(html);

    void new SendMessage({
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
