import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const socialFeature: FeatureModule = {
  name: 'social',
  description: '社交与好感度系统',
  init,
  needEnable: true,
};
