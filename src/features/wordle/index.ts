import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const wordleFeature: FeatureModule = {
  name: 'wordle',
  description: 'Wordle 猜单词游戏',
  init,
  needEnable: true,
};
