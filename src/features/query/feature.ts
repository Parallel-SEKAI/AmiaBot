import { init as initGroup } from './group.js';
import { init as initUser } from './user.js';

export async function init() {
  await Promise.all([initGroup(), initUser()]);
}
