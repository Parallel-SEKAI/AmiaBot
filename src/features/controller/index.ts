import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const controllerFeature: FeatureModule = {
  name: 'controller',
  description: '功能控制器',
  init,
  needEnable: false,
};
