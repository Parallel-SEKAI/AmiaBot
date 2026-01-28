import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const guessEventFeature: FeatureModule = {
  name: 'guess-event',
  description: '猜事件功能',
  init,
  needEnable: true,
};
