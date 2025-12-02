import { Octokit } from 'octokit';
import { config } from '../config';

export const octokit = new Octokit({
  auth: config.github.token,
});
