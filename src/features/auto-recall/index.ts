import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const autoRecallFeature: FeatureModule = {
  name: 'auto-recall',
  description: '自动撤回功能',
  init,
  needEnable: false,
};
