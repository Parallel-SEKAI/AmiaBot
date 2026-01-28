import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const geminiFeature: FeatureModule = {
  name: 'gemini',
  description: 'Gemini AI功能',
  init,
  needEnable: true,
};
