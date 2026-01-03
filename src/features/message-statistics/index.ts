import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const messageStatisticsFeature: FeatureModule = {
  name: 'message-statistics',
  description: '消息统计功能',
  init,
  needEnable: true,
};
