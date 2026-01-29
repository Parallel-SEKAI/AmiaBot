import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const autoReplyFeature: FeatureModule = {
  name: 'auto-reply',
  description: '自動回復功能',
  init,
  needEnable: true,
};
