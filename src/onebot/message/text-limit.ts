export const MAX_SEND_TEXT_LENGTH = 1000;

export interface MessageSegmentLike {
  type?: string;
  data?: {
    text?: unknown;
  };
}

/**
 * Sum character length of all text segments in an OneBot message payload.
 * Supports segment arrays, a single segment, or a plain string message.
 */
export function getMessageTextLength(message: unknown): number {
  if (typeof message === 'string') {
    return message.length;
  }

  if (Array.isArray(message)) {
    return message.reduce(
      (total, segment) => total + getSegmentTextLength(segment),
      0
    );
  }

  return getSegmentTextLength(message);
}

function getSegmentTextLength(segment: unknown): number {
  if (!segment || typeof segment !== 'object') {
    return 0;
  }

  const typed = segment as MessageSegmentLike;
  if (typed.type !== 'text') {
    return 0;
  }

  const text = typed.data?.text;
  return typeof text === 'string' ? text.length : 0;
}

/**
 * Throw when outbound message text exceeds the NapCat-safe limit.
 */
export function assertMessageTextWithinLimit(message: unknown): void {
  const length = getMessageTextLength(message);
  if (length > MAX_SEND_TEXT_LENGTH) {
    throw new Error('Error: Text Too Long');
  }
}
