import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const comicFeature: FeatureModule = {
  name: 'comic',
  description: '漫画查询功能',
  init,
  needEnable: true,
};
