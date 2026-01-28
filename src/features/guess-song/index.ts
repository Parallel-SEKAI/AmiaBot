import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const guessSongFeature: FeatureModule = {
  name: 'guess-song',
  description: '猜歌曲功能',
  init,
  needEnable: true,
};
