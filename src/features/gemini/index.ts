import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const geminiFeature: FeatureModule = {
  name: 'gemini',
  description: 'Gemini AI功能',
  init,
  needEnable: true,
};
