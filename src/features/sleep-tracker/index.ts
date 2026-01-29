import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const sleepTracker: FeatureModule = {
  name: 'sleep-tracker',
  description: '睡眠追踪功能，记录用户的睡眠和起床时间',
  init,
  needEnable: false,
};
