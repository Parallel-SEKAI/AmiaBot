import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const diceFeature: FeatureModule = {
  name: 'dice',
  description: '投掷骰子功能',
  init,
  needEnable: true,
};
