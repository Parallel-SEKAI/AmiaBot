import { init } from './feature';
import { FeatureModule } from '../feature-manager';

export const pjskStickerFeature: FeatureModule = {
  name: 'pjsk-sticker',
  description: 'PJSK贴纸功能',
  init,
  needEnable: true,
};
