import { FeatureManager } from './feature-manager';

// 导入各个功能模块
import * as chatFeature from './chat/index';
import * as comicFeature from './comic/index';
import * as pjskStickerFeature from './pjsk-sticker/index';
import * as pokeFeature from './poke/index';
import * as queryFeature from './query/index';
import * as geminiFeature from './gemini/index';
import * as bilibiliFeature from './bilibili/index';
import * as githubFeature from './github/index';
import * as guessCardFeature from './guess-card/index';
import * as guessSongFeature from './guess-song/index';
import * as guessEventFeature from './guess-event/index';
import * as neteaseFeature from './netease/index';
import * as messageStatisticsFeature from './message-statistics/index';
import * as autoRecallFeature from './auto-recall/index';

const featureManager = FeatureManager.getInstance();

// 注册所有功能模块
featureManager.registerFeature({
  name: 'chat',
  description: '聊天功能',
  init: chatFeature.init,
});

featureManager.registerFeature({
  name: 'comic',
  description: '漫画查询功能',
  init: comicFeature.init,
});

featureManager.registerFeature({
  name: 'pjsk-sticker',
  description: 'PJSK贴纸功能',
  init: pjskStickerFeature.init,
});

featureManager.registerFeature({
  name: 'poke',
  description: '戳一戳功能',
  init: pokeFeature.init,
});

featureManager.registerFeature({
  name: 'query',
  description: '查询功能',
  init: queryFeature.init,
});

featureManager.registerFeature({
  name: 'gemini',
  description: 'Gemini AI功能',
  init: geminiFeature.init,
});

featureManager.registerFeature({
  name: 'bilibili',
  description: 'B站功能',
  init: bilibiliFeature.init,
});

featureManager.registerFeature({
  name: 'github',
  description: 'GitHub功能',
  init: githubFeature.init,
});

featureManager.registerFeature({
  name: 'guess-card',
  description: '猜卡片功能',
  init: guessCardFeature.init,
});

featureManager.registerFeature({
  name: 'guess-song',
  description: '猜歌曲功能',
  init: guessSongFeature.init,
});

featureManager.registerFeature({
  name: 'guess-event',
  description: '猜事件功能',
  init: guessEventFeature.init,
});

featureManager.registerFeature({
  name: 'netease',
  description: '网易云音乐功能',
  init: neteaseFeature.init,
});

featureManager.registerFeature({
  name: 'message-statistics',
  description: '消息统计功能',
  init: messageStatisticsFeature.init,
});

featureManager.registerFeature({
  name: 'auto-recall',
  description: '自动撤回功能',
  init: autoRecallFeature.init,
});

export async function init() {
  // 初始化所有功能模块
  await featureManager.initializeAllFeatures();
}
