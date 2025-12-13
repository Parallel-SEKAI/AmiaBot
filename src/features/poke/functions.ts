// oxlint-disable no-unused-vars
import {
  SendMessage,
  SendImageMessage,
  SendTextMessage,
  SendRecordMessage,
} from '../../onebot/message/send.entity';
import { getRandomComic } from '../comic/api';

export const functions = [sendComic, sendDialog, sendCard];

async function sendComic(groupId: number, userId: number) {
  const comicUrl = await getRandomComic();
  new SendMessage({ message: new SendImageMessage(comicUrl) }).send({
    groupId: groupId,
  });
}

async function sendDialog(groupId: number, userId: number) {
  const scenarioId = 'self_mizuki_2nd';
  // GET JSON https://storage.sekai.best/sekai-cn-assets/scenario/profile/self_mizuki_2nd.asset
  const scenarioUrl = `https://storage.sekai.best/sekai-cn-assets/scenario/profile/${scenarioId}.asset`;
  const scenario = (await fetch(scenarioUrl).then((res) =>
    res.json()
  )) as Record<string, any>;
  const talkData = scenario.TalkData as Array<Record<string, any>>;
  const talk = talkData[Math.floor(Math.random() * talkData.length)] as Record<
    string,
    any
  >;
  new SendMessage({ message: new SendTextMessage(talk.Body) }).send({
    groupId: groupId,
  });
  new SendMessage({
    message: new SendRecordMessage(
      `https://storage.sekai.best/sekai-jp-assets/sound/scenario/voice/${scenarioId}/${talk.Voices[0].VoiceId}.mp3`
    ),
  }).send({
    groupId: groupId,
  });
}

async function sendCard(groupId: number, userId: number) {
  const characterId = 20;
  const cardsUrl =
    'https://sekai-world.github.io/sekai-master-db-cn-diff/cards.json';
  const cards = (
    (await fetch(cardsUrl).then((res) => res.json())) as Array<
      Record<string, any>
    >
  ).filter((card: Record<string, any>) => card.characterId === characterId);
  const card = cards[Math.floor(Math.random() * cards.length)] as Record<
    string,
    any
  >;
  new SendMessage({
    message: new SendTextMessage(`${card.prefix}\n${card.cardSkillName}`),
  }).send({
    groupId: groupId,
  });
  const cardImageAfterTrainingUrl = `https://storage.sekai.best/sekai-cn-assets/character/member/${card.assetbundleName}/card_after_training.webp`;
  const cardImageRes = await fetch(cardImageAfterTrainingUrl);
  if (cardImageRes.status === 200) {
    new SendMessage({
      message: new SendImageMessage(cardImageAfterTrainingUrl),
    }).send({
      groupId: groupId,
    });
    return;
  } else {
    const cardImageNormalUrl = `https://storage.sekai.best/sekai-cn-assets/character/member/${card.assetbundleName}/card_normal.webp`;
    new SendMessage({ message: new SendImageMessage(cardImageNormalUrl) }).send(
      {
        groupId: groupId,
      }
    );
    return;
  }
}
