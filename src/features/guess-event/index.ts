import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const guessEventFeature: FeatureModule = {
  name: 'guess-event',
  description: '猜事件功能',
  init,
  needEnable: true,
};
