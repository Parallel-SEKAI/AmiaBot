import {
  SendBaseMessage,
  SendImageMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { Comic, MoeSekaiManga } from './api.js';

export function createComicMessages(comic: Comic): SendBaseMessage[] {
  if (comic.source === 'sekai.best') {
    return [new SendImageMessage(comic.imageUrl)];
  }

  return [
    new SendTextMessage(comic.title),
    new SendImageMessage(comic.imageUrl),
    new SendTextMessage(`${comic.url}\n${formatContributors(comic)}`),
  ];
}

export function formatContributors(comic: MoeSekaiManga): string {
  return Object.entries(comic.contributors)
    .map(([role, name]) => `${role}: ${name}`)
    .join('\n');
}
