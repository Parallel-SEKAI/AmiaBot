import { init as initChat } from './chat/index';
import { init as initComic } from './comic/index';
import { init as initPjskSticker } from './pjsk-sticker/index';
import { init as initPoke } from './poke/index';
import { init as initQuery } from './query/index';
import { init as initGemini } from './gemini/index';
import { init as initBilibili } from './bilibili/index';
import { init as initGithub } from './github/index';
import { init as initGuessCard } from './guess-card/index';
import { init as initGuessSong } from './guess-song/index';


export async function init() {
  await initChat();
  await initComic();
  await initPjskSticker();
  await initPoke();
  await initQuery();
  await initGemini();
  await initBilibili();
  await initGithub();
  await initGuessCard();
  await initGuessSong();
}
