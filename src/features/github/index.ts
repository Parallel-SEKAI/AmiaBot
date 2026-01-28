import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const githubFeature: FeatureModule = {
  name: 'github',
  description: 'GitHub功能',
  init,
  needEnable: true,
};
