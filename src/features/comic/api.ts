import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXml = promisify(parseString);

const SEKAI_BEST_COMIC_LIST_URL =
  'https://storage.sekai.best/sekai-cn-assets/?delimiter=%2F&list-type=2&max-keys=1000&prefix=comic/one_frame/';

const MOESEKAI_MANGA_METADATA_URL =
  'https://raw.githubusercontent.com/moe-sekai/MoeSekai-Hub/main/mangas/mangas.json';

const COMIC_FETCH_TIMEOUT_MS = 10_000;

interface ListBucketResult {
  ListBucketResult: {
    Contents: Array<{
      Key: string[];
    }>;
  };
}

interface MoeSekaiMangaRaw {
  id?: unknown;
  title?: unknown;
  manga?: unknown;
  url?: unknown;
  contributors?: unknown;
}

export interface SekaiBestComic {
  source: 'sekai.best';
  imageUrl: string;
}

export interface MoeSekaiManga {
  source: 'moe-sekai';
  id: number;
  title: string;
  imageUrl: string;
  url: string;
  contributors: Record<string, string>;
}

export type Comic = SekaiBestComic | MoeSekaiManga;

type FetchLike = typeof fetch;

function createFetchSignal(): AbortSignal {
  return AbortSignal.timeout(COMIC_FETCH_TIMEOUT_MS);
}

function pickRandom<T>(items: T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (!item) {
    throw new Error('Cannot pick random item from empty list');
  }
  return item;
}

export async function getRandomComic(
  fetchImpl: FetchLike = fetch
): Promise<Comic> {
  const results = await Promise.allSettled([
    getSekaiBestComics(fetchImpl, createFetchSignal()),
    getMoeSekaiMangas(fetchImpl, createFetchSignal()),
  ]);

  const comicPools: Comic[][] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      comicPools.push(result.value);
    }
  }

  if (comicPools.length === 0) {
    const reasons = results
      .filter((result) => result.status === 'rejected')
      .map((result) => String(result.reason))
      .join('; ');
    throw new Error(`No comic images found${reasons ? `: ${reasons}` : ''}`);
  }

  return pickRandom(pickRandom(comicPools));
}

export async function getSekaiBestComics(
  fetchImpl: FetchLike = fetch,
  signal: AbortSignal = createFetchSignal()
): Promise<SekaiBestComic[]> {
  const response = await fetchImpl(SEKAI_BEST_COMIC_LIST_URL, { signal });

  if (!response.ok) {
    throw new Error(`sekai.best HTTP error: ${response.status}`);
  }

  const xmlContent = await response.text();
  const result = (await parseXml(xmlContent)) as unknown as ListBucketResult;

  const files = result?.ListBucketResult?.Contents || [];
  const comics = files
    .map((file) => file.Key[0])
    .filter((key: string) => key.endsWith('.png'))
    .map((key: string) => ({
      source: 'sekai.best' as const,
      imageUrl: `https://storage.sekai.best/sekai-cn-assets/${key}`,
    }));

  if (comics.length === 0) {
    throw new Error('No sekai.best comic images found');
  }

  return comics;
}

export async function getMoeSekaiMangas(
  fetchImpl: FetchLike = fetch,
  signal: AbortSignal = createFetchSignal()
): Promise<MoeSekaiManga[]> {
  const response = await fetchImpl(MOESEKAI_MANGA_METADATA_URL, { signal });

  if (!response.ok) {
    throw new Error(`MoeSekai HTTP error: ${response.status}`);
  }

  return normalizeMoeSekaiMangas(await response.json());
}

export function normalizeMoeSekaiMangas(data: unknown): MoeSekaiManga[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return [];
  }

  return Object.values(data)
    .map((value) => normalizeMoeSekaiManga(value))
    .filter((manga): manga is MoeSekaiManga => manga !== null);
}

function normalizeMoeSekaiManga(value: unknown): MoeSekaiManga | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as MoeSekaiMangaRaw;
  if (
    typeof raw.id !== 'number' ||
    typeof raw.title !== 'string' ||
    typeof raw.manga !== 'string' ||
    typeof raw.url !== 'string'
  ) {
    return null;
  }

  const contributors = normalizeContributors(raw.contributors);
  if (
    raw.title.trim().length === 0 ||
    raw.manga.trim().length === 0 ||
    raw.url.trim().length === 0 ||
    Object.keys(contributors).length === 0
  ) {
    return null;
  }

  return {
    source: 'moe-sekai',
    id: raw.id,
    title: raw.title.trim(),
    imageUrl: raw.manga.trim(),
    url: raw.url.trim(),
    contributors,
  };
}

function normalizeContributors(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, string] =>
          entry[0].trim().length > 0 &&
          typeof entry[1] === 'string' &&
          entry[1].trim().length > 0
      )
      .map(([role, name]) => [role.trim(), name.trim()])
  );
}
