import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const autoRecallFeature: FeatureModule = {
  name: 'auto-recall',
  description: '自动撤回功能',
  init,
  needEnable: false,
};
