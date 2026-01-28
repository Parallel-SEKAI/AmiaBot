import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const chatFeature: FeatureModule = {
  name: 'chat',
  description: '聊天功能',
  init,
  needEnable: true,
};
