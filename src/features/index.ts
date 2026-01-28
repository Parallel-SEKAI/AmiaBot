import { featureManager } from './feature-manager.js';
import logger from '../config/logger.js';

// 导入所有功能模块
import { chatFeature } from './chat/index.js';
import { comicFeature } from './comic/index.js';
import { pjskStickerFeature } from './pjsk-sticker/index.js';
import { pokeFeature } from './poke/index.js';
import { queryFeature } from './query/index.js';
import { geminiFeature } from './gemini/index.js';
import { bilibiliFeature } from './bilibili/index.js';
import { githubFeature } from './github/index.js';
import { guessCardFeature } from './guess-card/index.js';
import { guessSongFeature } from './guess-song/index.js';
import { guessEventFeature } from './guess-event/index.js';
import { neteaseFeature } from './netease/index.js';
import { messageStatisticsFeature } from './message-statistics/index.js';
import { autoRecallFeature } from './auto-recall/index.js';
import { controllerFeature } from './controller/index.js';
import { helpFeature } from './help/index.js';

const FEATURES = [
  chatFeature,
  comicFeature,
  pjskStickerFeature,
  pokeFeature,
  queryFeature,
  geminiFeature,
  bilibiliFeature,
  githubFeature,
  guessCardFeature,
  guessSongFeature,
  guessEventFeature,
  neteaseFeature,
  messageStatisticsFeature,
  autoRecallFeature,
  controllerFeature,
  helpFeature,
];

export async function init() {
  logger.info('[feature] Registering %d features...', FEATURES.length);

  for (let i = 0; i < FEATURES.length; i++) {
    const feature = FEATURES[i];
    if (!feature) {
      logger.error('[feature] Found undefined feature at index %d', i);
      continue;
    }
    featureManager.registerFeature(feature);
  }

  await featureManager.initializeAllFeatures();
}
