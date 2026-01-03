import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const chatFeature: FeatureModule = {
  name: 'chat',
  description: '聊天功能',
  init,
  needEnable: true,
};
