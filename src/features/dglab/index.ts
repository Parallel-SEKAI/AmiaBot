import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const dglabFeature: FeatureModule = {
  name: 'dglab',
  description: 'DG-Lab 电击指令',
  init,
  needEnable: false,
};
