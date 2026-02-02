import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const choiceFeature: FeatureModule = {
  name: 'choice',
  description: '多选一功能',
  init,
  needEnable: true,
};
