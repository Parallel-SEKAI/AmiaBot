import { init } from './feature.js';
import { FeatureModule } from '../feature-manager.js';

export const pjskStickerFeature: FeatureModule = {
  name: 'pjsk-sticker',
  description: 'PJSK贴纸功能',
  init,
  needEnable: true,
};
