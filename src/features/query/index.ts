import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const queryFeature: FeatureModule = {
  name: 'query',
  description: '查询功能',
  init,
  needEnable: true,
};
