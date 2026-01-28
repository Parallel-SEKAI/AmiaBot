import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const helpFeature: FeatureModule = {
  name: 'help',
  description: '帮助功能',
  init,
  needEnable: false,
};
