import { init as initChat } from './chat/index';
import { init as initComic } from './comic/index';
import { init as initPjskSticker } from './pjsk-sticker/index';
import { init as initPoke } from './poke/index';

export async function init() {
  await initChat();
  await initComic();
  await initPjskSticker();
  await initPoke();
}
