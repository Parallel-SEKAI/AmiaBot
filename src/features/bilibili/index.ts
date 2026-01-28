import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const bilibiliFeature: FeatureModule = {
  name: 'bilibili',
  description: 'B站功能',
  init,
  needEnable: true,
};
