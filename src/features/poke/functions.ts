// oxlint-disable no-unused-vars
import {
  SendMessage,
  SendImageMessage,
  SendTextMessage,
  SendRecordMessage,
} from '../../onebot/message/send.entity';
import { getRandomComic } from '../comic/api';

export const functions = [sendComic, sendDialog, sendCard];

async function sendComic(groupId: number, _userId: number) {
  const comicUrl = await getRandomComic();
  void new SendMessage({ message: new SendImageMessage(comicUrl) }).send({
    groupId: groupId,
  });
}

async function sendDialog(groupId: number, _userId: number) {
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
  void new SendMessage({ message: new SendTextMessage(talk.Body) }).send({
    groupId: groupId,
  });
  void new SendMessage({
    message: new SendRecordMessage(
      `https://storage.sekai.best/sekai-jp-assets/sound/scenario/voice/${scenarioId}/${talk.Voices[0].VoiceId}.mp3`
    ),
  }).send({
    groupId: groupId,
  });
}

async function sendCard(groupId: number, _userId: number) {
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
  void new SendMessage({
    message: new SendTextMessage(
      `${card.prefix}\n${card.cardSkillName}\n${card.gachaPhrase}`
    ),
  }).send({
    groupId: groupId,
  });
  const cardImageAfterTrainingUrl = `https://storage.sekai.best/sekai-cn-assets/character/member/${card.assetbundleName}/card_after_training.png`;
  const cardImageNormalUrl = `https://storage.sekai.best/sekai-cn-assets/character/member/${card.assetbundleName}/card_normal.png`;
  const cardImageChoiceUrl = [cardImageAfterTrainingUrl, cardImageNormalUrl][
    Math.floor(Math.random() * 2)
  ];
  const cardImageRes = await fetch(cardImageChoiceUrl);
  if (cardImageRes.status === 200) {
    void new SendMessage({
      message: new SendImageMessage(cardImageChoiceUrl),
    }).send({
      groupId: groupId,
    });
    return;
  } else {
    void new SendMessage({ message: new SendImageMessage(cardImageNormalUrl) }).send(
      {
        groupId: groupId,
      }
    );
    return;
  }
}
