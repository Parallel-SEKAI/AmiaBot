import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const exampleFeature: FeatureModule = {
  name: 'example',
  description: '示例功能',
  init,
  needEnable: true,
};
