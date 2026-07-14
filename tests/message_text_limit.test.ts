import { describe, expect, it } from 'vitest';
import {
  assertMessageTextWithinLimit,
  getMessageTextLength,
  MAX_SEND_TEXT_LENGTH,
} from '../src/onebot/message/text-limit.js';

describe('message text limit', () => {
  it('counts a single text segment', () => {
    expect(
      getMessageTextLength([{ type: 'text', data: { text: 'hello' } }])
    ).toBe(5);
  });

  it('sums multiple text segments and ignores non-text', () => {
    expect(
      getMessageTextLength([
        { type: 'at', data: { qq: 123 } },
        { type: 'text', data: { text: 'ab' } },
        { type: 'image', data: { file: 'x.png' } },
        { type: 'text', data: { text: 'cde' } },
      ])
    ).toBe(5);
  });

  it('supports plain string and single segment payloads', () => {
    expect(getMessageTextLength('abc')).toBe(3);
    expect(getMessageTextLength({ type: 'text', data: { text: 'xyz' } })).toBe(
      3
    );
  });

  it('allows text length up to the max', () => {
    const text = 'a'.repeat(MAX_SEND_TEXT_LENGTH);
    expect(() =>
      assertMessageTextWithinLimit([{ type: 'text', data: { text } }])
    ).not.toThrow();
  });

  it('throws when text length exceeds the max', () => {
    const text = 'a'.repeat(MAX_SEND_TEXT_LENGTH + 1);
    expect(() =>
      assertMessageTextWithinLimit([{ type: 'text', data: { text } }])
    ).toThrow('Error: Text Too Long');
  });

  it('throws when multi-segment text exceeds the max', () => {
    const half = Math.ceil((MAX_SEND_TEXT_LENGTH + 1) / 2);
    expect(() =>
      assertMessageTextWithinLimit([
        { type: 'text', data: { text: 'a'.repeat(half) } },
        { type: 'text', data: { text: 'b'.repeat(half) } },
      ])
    ).toThrow('Error: Text Too Long');
  });
});
