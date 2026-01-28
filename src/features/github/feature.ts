import logger from '../../config/logger';
import { onebot } from '../../onebot';
import { RecvMessage } from '../../onebot/message/recv.entity';
import { checkFeatureEnabled } from '../../service/db';
import { getRepoInfo } from './repo';
import { getUserInfo } from './user';
import { getIssueInfo } from './issue';
import { getPRInfo } from './pr';
import { FeatureModule } from '../feature-manager';

const repoRegex = /github.com\/([^/]+)\/([^/]+)/g;
const userRegex = /github.com\/([^/]+)/g;
const issueRegex = /github.com\/([^/]+)\/([^/]+)\/issues\/([0-9]+)/g;
const prRegex = /github.com\/([^/]+)\/([^/]+)\/pull\/([0-9]+)/g;

export async function init() {
  logger.info('[feature] Init github feature');
  onebot.on('message.group', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'github')) {
      const message = RecvMessage.fromMap(data);

      // issue 信息
      const issueMatch = message.content.matchAll(issueRegex);
      for (const match of issueMatch) {
        const owner = match[1];
        const repo = match[2];
        const issueNumber = parseInt(match[3]);
        const success = await getIssueInfo(message, owner, repo, issueNumber);
        if (success) {
          logger.info(
            '[feature.github.issue][Group: %d][User: %d] %s',
            message.groupId,
            message.userId,
            message.rawMessage
          );
          return;
        }
      }

      // pr 信息
      const prMatch = message.content.matchAll(prRegex);
      for (const match of prMatch) {
        const owner = match[1];
        const repo = match[2];
        const prNumber = parseInt(match[3]);
        const success = await getPRInfo(message, owner, repo, prNumber);
        if (success) {
          logger.info(
            '[feature.github.pr][Group: %d][User: %d] %s',
            message.groupId,
            message.userId,
            message.rawMessage
          );
          return;
        }
      }

      // repo 信息
      const repoMatch = message.content.matchAll(repoRegex);
      for (const match of repoMatch) {
        const owner = match[1];
        const repo = match[2];
        const success = await getRepoInfo(message, owner, repo);
        if (success) {
          logger.info(
            '[feature.github.repo][Group: %d][User: %d] %s',
            message.groupId,
            message.userId,
            message.rawMessage
          );
          return;
        }
      }

      // user 信息
      const userMatch = message.content.matchAll(userRegex);
      for (const match of userMatch) {
        const user = match[1];
        const success = await getUserInfo(message, user);
        if (success) {
          logger.info(
            '[feature.github.user][Group: %d][User: %d] %s',
            message.groupId,
            message.userId,
            message.rawMessage
          );
          return;
        }
      }

      if (message.content.includes('/')) {
        const splits = message.content.split('/');
        for (let i = 0; i < splits.length - 1; i++) {
          if (splits[i].length > 0) {
            const success = await getRepoInfo(
              message,
              splits[i],
              splits[i + 1]
            );
            if (success) {
              logger.info(
                '[feature.github.repo][Group: %d][User: %d] %s',
                message.groupId,
                message.userId,
                message.rawMessage
              );
              return;
            }
          }
        }
      }
    }
  });
}
