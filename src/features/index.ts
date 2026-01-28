import { featureManager } from './feature-manager';
import logger from '../config/logger';

// 导入所有功能模块
import { chatFeature } from './chat';
import { comicFeature } from './comic';
import { pjskStickerFeature } from './pjsk-sticker';
import { pokeFeature } from './poke';
import { queryFeature } from './query';
import { geminiFeature } from './gemini';
import { bilibiliFeature } from './bilibili';
import { githubFeature } from './github';
import { guessCardFeature } from './guess-card';
import { guessSongFeature } from './guess-song';
import { guessEventFeature } from './guess-event';
import { neteaseFeature } from './netease';
import { messageStatisticsFeature } from './message-statistics';
import { autoRecallFeature } from './auto-recall';
import { controllerFeature } from './controller';
import { helpFeature } from './help';

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
