import { OneBotClient } from './onebot/onebot.client';
import { config } from './config/index';


async function main(): Promise<void> {
  const onebot = new OneBotClient(
    config.onebot.httpUrl,
    config.onebot.wsUrl,
    config.onebot.token
  );
  await onebot.run();
}

main()
