import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const controllerFeature: FeatureModule = {
  name: 'controller',
  description: '功能控制器',
  init,
  needEnable: false,
};
