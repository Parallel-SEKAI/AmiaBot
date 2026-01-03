import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const helpFeature: FeatureModule = {
  name: 'help',
  description: '帮助功能',
  init,
  needEnable: false,
};
