import { beforeEach, describe, expect, it, vi } from 'vitest';

const websocketState = vi.hoisted(() => {
  class MockWebSocket {
    public static readonly OPEN = 1;
    public readyState = MockWebSocket.OPEN;
    public onopen: (() => void) | null = null;
    public onmessage: ((event: { data: string }) => void) | null = null;
    public onclose: ((event: { code: number; reason: string }) => void) | null =
      null;
    public onerror: ((error: Error) => void) | null = null;

    constructor(url: string, options?: object) {
      void url;
      void options;
      instances.push(this);
    }

    public on(event: string, handler: () => void): void {
      void event;
      void handler;
    }
    public ping(): void {}
    public terminate(): void {}
  }

  const instances: MockWebSocket[] = [];
  return { instances, MockWebSocket };
});

vi.mock('ws', () => ({ default: websocketState.MockWebSocket }));
vi.mock('../src/onebot/index.js', () => ({
  onebot: { action: vi.fn() },
}));
vi.mock('../src/service/db.js', () => ({
  checkFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

import { OneBotClient } from '../src/onebot/onebot.client.js';

type ConnectableClient = OneBotClient & {
  connectWebSocket(): void;
};

let nextMessageId = 0;

function createClient(): {
  client: OneBotClient;
  receive: (content: string, userId?: number, groupId?: number) => void;
} {
  const client = new OneBotClient('', 'ws://test', '');
  (client as ConnectableClient).connectWebSocket();
  const socket = websocketState.instances.at(-1);
  if (!socket?.onmessage) throw new Error('WebSocket message handler not set');

  return {
    client,
    receive(content, userId = 1001, groupId = 2001) {
      nextMessageId += 1;
      socket.onmessage?.({
        data: JSON.stringify({
          post_type: 'message',
          message_type: 'group',
          sub_type: 'normal',
          self_id: 9999,
          user_id: userId,
          group_id: groupId,
          message_id: nextMessageId,
          raw_message: content,
          message: [{ type: 'text', data: { text: content } }],
          sender: { nickname: 'tester' },
        }),
      });
    },
  };
}

async function flushHandlers(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('OneBot command dispatch', () => {
  beforeEach(() => {
    websocketState.instances.length = 0;
    vi.restoreAllMocks();
  });

  it('runs general listeners and all matching specific commands for one message', async () => {
    const { client, receive } = createClient();
    const general = vi.fn().mockResolvedValue(undefined);
    const specificRegex = vi.fn().mockResolvedValue(undefined);
    const specificString = vi.fn().mockResolvedValue(undefined);

    client.registerCommand(undefined, /.*/, undefined, undefined, general, {
      isGeneral: true,
    });
    client.registerCommand(
      undefined,
      /^选择.+还是.+$/,
      undefined,
      undefined,
      specificRegex
    );
    client.registerCommand(
      undefined,
      '选择',
      undefined,
      undefined,
      specificString
    );

    receive('选择 A 还是 B');
    await flushHandlers();

    expect(general).toHaveBeenCalledOnce();
    expect(specificRegex).toHaveBeenCalledOnce();
    expect(specificString).toHaveBeenCalledOnce();
  });

  it('keeps general listeners active while cooling down specific commands', async () => {
    let now = 10_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const { client, receive } = createClient();
    const general = vi.fn().mockResolvedValue(undefined);
    const specific = vi.fn().mockResolvedValue(undefined);

    client.registerCommand(undefined, /.*/, undefined, undefined, general);
    client.registerCommand(
      undefined,
      /^r1d6$/i,
      undefined,
      undefined,
      specific
    );

    receive('r1d6');
    now += 500;
    receive('r1d6');
    now += 501;
    receive('r1d6');
    await flushHandlers();

    expect(general).toHaveBeenCalledTimes(3);
    expect(specific).toHaveBeenCalledTimes(2);
  });

  it('does not let general messages consume the specific-command cooldown', async () => {
    let now = 20_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const { client, receive } = createClient();
    const general = vi.fn().mockResolvedValue(undefined);
    const specific = vi.fn().mockResolvedValue(undefined);

    client.registerCommand(undefined, /.*/, undefined, undefined, general);
    client.registerCommand(undefined, /^点赞$/, undefined, undefined, specific);

    receive('普通聊天');
    now += 100;
    receive('点赞');
    await flushHandlers();

    expect(general).toHaveBeenCalledTimes(2);
    expect(specific).toHaveBeenCalledOnce();
  });

  it('isolates cooldowns by user and group', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(30_000);
    const { client, receive } = createClient();
    const specific = vi.fn().mockResolvedValue(undefined);
    client.registerCommand(undefined, 'ping', undefined, undefined, specific);

    receive('ping', 1001, 2001);
    receive('ping', 1002, 2001);
    receive('ping', 1001, 2002);
    receive('ping', 1001, 2001);
    await flushHandlers();

    expect(specific).toHaveBeenCalledTimes(3);
  });

  it('ignores self messages without blocking the next user command', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(40_000);
    const { client, receive } = createClient();
    const specific = vi.fn().mockResolvedValue(undefined);
    client.registerCommand(undefined, '晚安', undefined, undefined, specific);

    receive('晚安', 9999, 2001);
    receive('晚安', 1001, 2001);
    await flushHandlers();

    expect(specific).toHaveBeenCalledOnce();
  });

  it('does not suppress user text that matches a previous bot response', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(50_000);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ retcode: 0 }),
      })
    );
    const { client, receive } = createClient();
    const specific = vi.fn().mockResolvedValue(undefined);
    client.registerCommand(undefined, '晚安', undefined, undefined, specific);

    await client.action('send_group_msg', {
      group_id: 2001,
      message: [{ type: 'text', data: { text: '晚安' } }],
    });
    receive('晚安', 1001, 2001);
    await flushHandlers();

    expect(specific).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
