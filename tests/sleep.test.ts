import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
  getDayStart,
  getAdjustedHour,
  calculateDuration,
  toDatabaseTimestamp,
  SleepService,
} from '../src/service/sleep.js';
import { init } from '../src/features/sleep-tracker/feature.js';
import { onebot } from '../src/onebot/index.js';
import { RecvMessage } from '../src/onebot/message/recv.entity.js';
import logger from '../src/config/logger.js';

// Mock dependencies
vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../src/onebot/index.js', () => ({
  onebot: {
    on: vi.fn(),
    qq: 123456,
  },
}));

vi.mock('../src/onebot/message/recv.entity.js', () => ({
  RecvMessage: {
    fromMap: vi.fn(),
  },
}));

vi.mock('../src/onebot/message/send.entity.js', () => ({
  SendMessage: class {
    public messages: unknown[];
    constructor(args: { message: unknown | unknown[] }) {
      this.messages = Array.isArray(args.message)
        ? args.message
        : [args.message];
    }
  },
  SendTextMessage: class {
    constructor(public text: string) {}
  },
}));

vi.mock('../src/service/sleep.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/service/sleep.js')>();
  return {
    ...actual,
    SleepService: {
      recordWakeTime: vi.fn(),
      recordSleepTime: vi.fn(),
    },
  };
});

describe('Sleep Service Logic', () => {
  describe('getDayStart', () => {
    it('should return 4 AM of the same day if current time is after 4 AM (Shanghai)', () => {
      // 2024-02-01 10:00:00 +08:00
      const date = new Date('2024-02-01T10:00:00+08:00');
      const start = getDayStart(date);
      // Expected: 2024-02-01 04:00:00 +08:00
      const expected = new Date('2024-02-01T04:00:00+08:00');
      expect(start.getTime()).toBe(expected.getTime());
    });

    it('should return 4 AM of the previous day if current time is before 4 AM (Shanghai)', () => {
      // 2024-02-01 02:00:00 +08:00
      const date = new Date('2024-02-01T02:00:00+08:00');
      const start = getDayStart(date);
      // Expected: 2024-01-31 04:00:00 +08:00
      const expected = new Date('2024-01-31T04:00:00+08:00');
      expect(start.getTime()).toBe(expected.getTime());
    });

    it('should handle month rollover correctly', () => {
      // 2024-03-01 02:00:00 +08:00
      const date = new Date('2024-03-01T02:00:00+08:00');
      const start = getDayStart(date);
      // Expected: 2024-02-29 04:00:00 +08:00 (Leap year 2024)
      const expected = new Date('2024-02-29T04:00:00+08:00');
      expect(start.getTime()).toBe(expected.getTime());
    });
  });

  describe('getAdjustedHour', () => {
    it('should return the hour as is if >= 4', () => {
      const date = new Date('2024-02-01T10:00:00+08:00');
      expect(getAdjustedHour(date)).toBe(10);
    });

    it('should add 24 to the hour if < 4', () => {
      const date = new Date('2024-02-01T02:00:00+08:00');
      expect(getAdjustedHour(date)).toBe(26);
    });

    it('should handle 00:00 as 24', () => {
      const date = new Date('2024-02-01T00:00:00+08:00');
      expect(getAdjustedHour(date)).toBe(24);
    });
  });

  describe('calculateDuration', () => {
    // 2 hours threshold

    it('should calculate duration correctly within same day', () => {
      const sleep = new Date('2024-02-01T23:00:00+08:00');
      const wake = new Date('2024-02-02T07:00:00+08:00');
      // 8 hours
      const duration = calculateDuration(wake, sleep);
      expect(duration).toBe(8);
    });

    it('should return undefined if sleep time is null', () => {
      const wake = new Date();
      expect(calculateDuration(wake, null)).toBeUndefined();
    });

    it('should return undefined if duration is less than min threshold (2h)', () => {
      const sleep = new Date('2024-02-01T23:00:00+08:00');
      const wake = new Date('2024-02-02T00:30:00+08:00'); // 1.5 hours
      expect(calculateDuration(wake, sleep)).toBeUndefined();
    });

    it('should return undefined if duration is excessive (> 24h)', () => {
      const sleep = new Date('2024-02-01T23:00:00+08:00');
      const wake = new Date('2024-02-03T07:00:00+08:00'); // > 24 hours
      expect(calculateDuration(wake, sleep)).toBeUndefined();
    });

    it('should validate against dayStart if provided', () => {
      const dayStart = new Date('2024-02-01T04:00:00+08:00');
      // Sleep time too early (more than 18 hours before dayStart)
      // 18 hours before 4 AM is 10 AM previous day.
      // Let's try 9 AM previous day.
      const sleep = new Date('2024-01-31T09:00:00+08:00');
      const wake = new Date('2024-02-01T05:00:00+08:00');

      expect(calculateDuration(wake, sleep, dayStart)).toBeUndefined();
    });

    it('should accept valid sleep time relative to dayStart', () => {
      const dayStart = new Date('2024-02-01T04:00:00+08:00');
      // Sleep at 20:00 previous day (within 18 hours window)
      const sleep = new Date('2024-01-31T20:00:00+08:00');
      const wake = new Date('2024-02-01T06:00:00+08:00');
      // Duration: 10 hours
      expect(calculateDuration(wake, sleep, dayStart)).toBe(10);
    });
  });

  describe('toDatabaseTimestamp', () => {
    it('should format date to Asia/Shanghai string with timezone offset', () => {
      // 2024-02-01 12:34:56 UTC
      // Shanghai is +8, so 20:34:56
      const date = new Date('2024-02-01T12:34:56Z');
      const timestamp = toDatabaseTimestamp(date);
      // Expected format: YYYY-MM-DD HH:MM:SS+08:00
      expect(timestamp).toBe('2024-02-01 20:34:56+08:00');
    });
  });
});

describe('Sleep Feature Tracker', () => {
  let messageHandler: (data: unknown) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Capture the message handler when init is called
    vi.mocked(onebot.on).mockImplementation(
      (event: string | symbol, handler: unknown) => {
        if (event === 'message') {
          messageHandler = handler as (data: unknown) => Promise<void>;
        }
        return onebot;
      }
    );

    await init();
  });

  it('should ignore messages from self', async () => {
    const data = {
      user_id: 123456, // Same as bot.qq
      raw_message: '早',
    };

    await messageHandler(data);
    expect(RecvMessage.fromMap).not.toHaveBeenCalled();
  });

  it('should process wake up messages', async () => {
    const mockReply = vi.fn();
    (RecvMessage.fromMap as unknown as Mock).mockReturnValue({
      userId: 1001,
      groupId: 2001,
      content: '早安',
      reply: mockReply,
    });

    (SleepService.recordWakeTime as unknown as Mock).mockResolvedValue({
      status: 'NORMAL',
      rank: 1,
      globalRank: 5,
      sleepDuration: 8,
    });

    const data = {
      user_id: 1001,
      group_id: 2001,
      raw_message: '早安',
    };

    await messageHandler(data);

    expect(SleepService.recordWakeTime).toHaveBeenCalledWith(1001, 2001);
    expect(mockReply).toHaveBeenCalled();
    // Verify reply content contains rank and duration
    const sentMessage = mockReply.mock.calls[0][0];
    const textMsg = sentMessage.messages[0];
    expect(textMsg.text).toContain('第 1 个起床');
    expect(textMsg.text).toContain('睡了 8 小时');
  });

  it('should process sleep messages', async () => {
    const mockReply = vi.fn();
    (RecvMessage.fromMap as unknown as Mock).mockReturnValue({
      userId: 1002,
      groupId: 2001,
      content: '晚安',
      reply: mockReply,
    });

    (SleepService.recordSleepTime as unknown as Mock).mockResolvedValue({
      status: 'NORMAL',
      rank: 2,
      globalRank: 10,
      wakeDuration: 14,
    });

    const data = {
      user_id: 1002,
      group_id: 2001,
      raw_message: '晚安',
    };

    await messageHandler(data);

    expect(SleepService.recordSleepTime).toHaveBeenCalledWith(1002, 2001);
    expect(mockReply).toHaveBeenCalled();
    const sentMessage = mockReply.mock.calls[0][0];
    const textMsg = sentMessage.messages[0];
    expect(textMsg.text).toContain('第 2 个睡觉');
    expect(textMsg.text).toContain('清醒了 14 小时');
  });

  it('should reply with mock if time is unreasonable (wake)', async () => {
    const mockReply = vi.fn();
    (RecvMessage.fromMap as unknown as Mock).mockReturnValue({
      userId: 1003,
      groupId: 2001,
      content: '早',
      reply: mockReply,
    });

    (SleepService.recordWakeTime as unknown as Mock).mockResolvedValue({
      status: 'UNREASONABLE',
      rank: 0,
      globalRank: 0,
    });

    const data = {
      user_id: 1003,
      group_id: 2001,
      raw_message: '早',
    };

    await messageHandler(data);
    expect(mockReply).toHaveBeenCalled();
    // Should contain a mock message (we don't check exact text as it is random, but we check it was sent)
    const sentMessage = mockReply.mock.calls[0][0];
    const textMsg = sentMessage.messages[0];
    expect(typeof textMsg.text).toBe('string');
  });

  it('should ignore irrelevant messages', async () => {
    const mockReply = vi.fn();
    (RecvMessage.fromMap as unknown as Mock).mockReturnValue({
      userId: 1004,
      groupId: 2001,
      content: 'Hello World',
      reply: mockReply,
    });

    const data = {
      user_id: 1004,
      group_id: 2001,
      raw_message: 'Hello World',
    };

    await messageHandler(data);
    expect(SleepService.recordWakeTime).not.toHaveBeenCalled();
    expect(SleepService.recordSleepTime).not.toHaveBeenCalled();
    expect(mockReply).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    (RecvMessage.fromMap as unknown as Mock).mockReturnValue({
      userId: 1005,
      groupId: 2001,
      content: '早',
      reply: vi.fn(),
    });

    (SleepService.recordWakeTime as unknown as Mock).mockRejectedValue(
      new Error('DB Error')
    );

    const data = {
      user_id: 1005,
      group_id: 2001,
      raw_message: '早',
    };

    // Should not throw
    await messageHandler(data);
    expect(logger.error).toHaveBeenCalled();
  });
});
