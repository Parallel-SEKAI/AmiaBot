import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const guessCardFeature: FeatureModule = {
  name: 'guess-card',
  description: '猜卡片功能',
  init,
  needEnable: true,
};
