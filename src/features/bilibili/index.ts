import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const bilibiliFeature: FeatureModule = {
  name: 'bilibili',
  description: 'B站功能',
  init,
  needEnable: true,
};
