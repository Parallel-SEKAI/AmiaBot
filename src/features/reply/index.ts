import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const replyFeature: FeatureModule = {
  name: 'reply',
  description: '回应功能 - 自动对特定用户的消息进行表情回应',
  init,
  needEnable: true,
};
