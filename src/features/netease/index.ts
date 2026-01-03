import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const neteaseFeature: FeatureModule = {
  name: 'netease',
  description: '网易云音乐功能',
  init,
  needEnable: true,
};
