import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const diceFeature: FeatureModule = {
  name: 'dice',
  description: '投掷骰子功能',
  init,
  needEnable: true,
};
