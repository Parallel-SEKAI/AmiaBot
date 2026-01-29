import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const pingFeature: FeatureModule = {
  name: 'ping',
  description: '測試功能',
  init,
  needEnable: true,
};
