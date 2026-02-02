import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const welcomeFeature: FeatureModule = {
  name: 'welcome',
  description: '群欢迎功能',
  init,
  needEnable: true,
};
