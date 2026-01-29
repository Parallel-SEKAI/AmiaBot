import { Octokit } from 'octokit';
import { config } from '../config/index.js';

/**
 * GitHub API 客户端实例
 * 使用配置文件中的 token 进行身份验证
 */
export const octokit: Octokit = new Octokit({
  auth: config.github.token,
});
