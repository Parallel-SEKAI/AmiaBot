import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const guessSongFeature: FeatureModule = {
  name: 'guess-song',
  description: '猜歌曲功能',
  init,
  needEnable: true,
};
