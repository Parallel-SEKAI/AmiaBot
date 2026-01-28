import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const comicFeature: FeatureModule = {
  name: 'comic',
  description: '漫画查询功能',
  init,
  needEnable: true,
};
