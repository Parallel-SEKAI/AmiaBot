import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const githubFeature: FeatureModule = {
  name: 'github',
  description: 'GitHub功能',
  init,
  needEnable: true,
};
