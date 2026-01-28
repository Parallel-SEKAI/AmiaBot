import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const neteaseFeature: FeatureModule = {
  name: 'netease',
  description: '网易云音乐功能',
  init,
  needEnable: true,
};
