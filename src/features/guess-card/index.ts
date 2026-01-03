import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const guessCardFeature: FeatureModule = {
  name: 'guess-card',
  description: '猜卡片功能',
  init,
  needEnable: true,
};
