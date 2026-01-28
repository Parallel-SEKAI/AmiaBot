import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const messageStatisticsFeature: FeatureModule = {
  name: 'message-statistics',
  description: '消息统计功能',
  init,
  needEnable: true,
};
