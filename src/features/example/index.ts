import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const exampleFeature: FeatureModule = {
  name: 'example',
  description: '示例功能',
  init,
  needEnable: true,
};
