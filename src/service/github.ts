import { Octokit } from 'octokit';
import { config } from '../config/index.js';

export const octokit: Octokit = new Octokit({
  auth: config.github.token,
});
