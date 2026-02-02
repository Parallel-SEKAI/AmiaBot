import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const likeFeature: FeatureModule = {
  name: 'like',
  description: '点赞功能',
  init,
  needEnable: true,
};
