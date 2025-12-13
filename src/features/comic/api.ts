import { parseString } from 'xml2js';
import { promisify } from 'util';

// 将xml2js的parseString转换为Promise形式
const parseXml = promisify(parseString);

export async function getRandomComic(): Promise<string> {
  const response = await fetch(
    'https://storage.sekai.best/sekai-cn-assets/?delimiter=%2F&list-type=2&max-keys=1000&prefix=comic/one_frame/'
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // 获取XML内容
  const xmlContent = await response.text();

  // 解析XML
  const result = (await parseXml(xmlContent)) as any;

  // 提取漫画图片的URL列表
  const files = result?.ListBucketResult?.Contents || [];
  const imageUrls = files
    .map((file: any) => file.Key[0])
    .filter((key: string) => key.endsWith('.webp'))
    .map((key: string) => `https://storage.sekai.best/sekai-cn-assets/${key}`);

  if (imageUrls.length === 0) {
    throw new Error('No comic images found');
  }

  // 随机选择一个图片URL
  return imageUrls[Math.floor(Math.random() * imageUrls.length)];
}
