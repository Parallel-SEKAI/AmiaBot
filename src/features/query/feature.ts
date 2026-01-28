import { init as initGroup } from './group.js';
import { init as initUser } from './user.js';
import { FeatureModule } from '../feature-manager.js';

export async function init() {
  await Promise.all([initGroup(), initUser()]);
}
