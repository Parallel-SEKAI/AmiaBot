import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const queryFeature: FeatureModule = {
  name: 'query',
  description: '查询功能',
  init,
  needEnable: true,
};
