import { init as initGroup } from './group';
import { init as initUser } from './user';
import { FeatureModule } from '../feature-manager';

export async function init() {
  initGroup();
  initUser();
}
