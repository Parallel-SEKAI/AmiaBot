import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const pokeFeature: FeatureModule = {
  name: 'poke',
  description: '戳一戳功能',
  init,
  needEnable: true,
};
