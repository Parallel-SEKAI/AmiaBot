import { init as initGroup } from './group';
import { init as initUser } from './user';

export async function init() {
  initGroup();
  initUser();
}
