import { describe, expect, it, vi } from 'vitest';
import {
  getRandomComic,
  getSekaiBestComics,
  normalizeMoeSekaiMangas,
} from '../src/features/comic/api.js';
import { createComicMessages } from '../src/features/comic/message.js';

function createResponse(
  body: string | object,
  ok = true,
  status = 200
): Response {
  return {
    ok,
    status,
    text: () =>
      Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    json: () =>
      Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body),
  } as Response;
}

describe('Comic Feature', () => {
  it('parses sekai.best comics from bucket XML', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(`
        <ListBucketResult>
          <Contents><Key>comic/one_frame/001.png</Key></Contents>
          <Contents><Key>comic/one_frame/readme.txt</Key></Contents>
          <Contents><Key>comic/one_frame/002.png</Key></Contents>
        </ListBucketResult>
      `)
    );

    await expect(getSekaiBestComics(fetchMock)).resolves.toEqual([
      {
        source: 'sekai.best',
        imageUrl:
          'https://storage.sekai.best/sekai-cn-assets/comic/one_frame/001.png',
      },
      {
        source: 'sekai.best',
        imageUrl:
          'https://storage.sekai.best/sekai-cn-assets/comic/one_frame/002.png',
      },
    ]);
  });

  it('normalizes MoeSekai manga metadata and drops invalid entries', () => {
    expect(
      normalizeMoeSekaiMangas({
        '367': {
          id: 367,
          title: ' 加油吧一日署长！ ',
          manga: ' http://i0.hdslb.com/bfs/new_dyn/example.png ',
          url: ' https://www.bilibili.com/opus/1220643737236930563 ',
          contributors: {
            翻译: ' 金诺佩蒂斯@金诺佩蒂斯 ',
            校对: '',
            嵌字: '无怨@WUYUANerror',
          },
        },
        invalid: {
          id: 368,
          title: '缺少贡献者',
          manga: 'https://example.com/manga.png',
          url: 'https://example.com/source',
          contributors: {},
        },
      })
    ).toEqual([
      {
        source: 'moe-sekai',
        id: 367,
        title: '加油吧一日署长！',
        imageUrl: 'http://i0.hdslb.com/bfs/new_dyn/example.png',
        url: 'https://www.bilibili.com/opus/1220643737236930563',
        contributors: {
          翻译: '金诺佩蒂斯@金诺佩蒂斯',
          嵌字: '无怨@WUYUANerror',
        },
      },
    ]);
  });

  it('formats sekai.best comics as image-only messages', () => {
    expect(
      createComicMessages({
        source: 'sekai.best',
        imageUrl: 'https://example.com/comic.png',
      }).map((message) => message.toMap())
    ).toEqual([
      {
        type: 'image',
        data: { file: 'https://example.com/comic.png' },
      },
    ]);
  });

  it('formats MoeSekai manga with title, image, source URL, and contributors', () => {
    expect(
      createComicMessages({
        source: 'moe-sekai',
        id: 367,
        title: '加油吧一日署长！',
        imageUrl: 'https://example.com/manga.png',
        url: 'https://www.bilibili.com/opus/1220643737236930563',
        contributors: {
          翻译: '金诺佩蒂斯@金诺佩蒂斯',
          校对: '未穹刑事@未穹_Mizora39',
          嵌字: '无怨@WUYUANerror',
        },
      }).map((message) => message.toMap())
    ).toEqual([
      {
        type: 'text',
        data: { text: '加油吧一日署长！' },
      },
      {
        type: 'image',
        data: { file: 'https://example.com/manga.png' },
      },
      {
        type: 'text',
        data: {
          text: 'https://www.bilibili.com/opus/1220643737236930563\n翻译: 金诺佩蒂斯@金诺佩蒂斯\n校对: 未穹刑事@未穹_Mizora39\n嵌字: 无怨@WUYUANerror',
        },
      },
    ]);
  });

  it('can return comics from either source', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createResponse(`
          <ListBucketResult>
            <Contents><Key>comic/one_frame/001.png</Key></Contents>
          </ListBucketResult>
        `)
      )
      .mockResolvedValueOnce(
        createResponse({
          '367': {
            id: 367,
            title: '加油吧一日署长！',
            manga: 'https://example.com/manga.png',
            url: 'https://www.bilibili.com/opus/1220643737236930563',
            contributors: {
              翻译: '金诺佩蒂斯@金诺佩蒂斯',
            },
          },
        })
      );

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.75);

    try {
      await expect(getRandomComic(fetchMock)).resolves.toMatchObject({
        source: 'moe-sekai',
        title: '加油吧一日署长！',
      });
    } finally {
      randomSpy.mockRestore();
    }
  });
});
