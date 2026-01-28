import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const pokeFeature: FeatureModule = {
  name: 'poke',
  description: '戳一戳功能',
  init,
  needEnable: true,
};
