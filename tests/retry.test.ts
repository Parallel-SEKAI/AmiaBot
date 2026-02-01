import { describe, it, expect, vi } from 'vitest';
import { retry } from '../src/utils/retry.js';

describe('Retry Utility', () => {
  it('should return result immediately if operation succeeds', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await retry(operation, { maxAttempts: 3, delay: 10 });
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    // Override shouldRetry to allow all errors for this test
    const shouldRetry = () => true;

    const result = await retry(operation, {
      maxAttempts: 3,
      delay: 10,
      shouldRetry,
    });
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should throw last error if all attempts fail', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('always fail'));

    // Override shouldRetry to allow all errors for this test
    const shouldRetry = () => true;

    await expect(
      retry(operation, { maxAttempts: 3, delay: 10, shouldRetry })
    ).rejects.toThrow('always fail');

    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry if shouldRetry returns false', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('fatal error'));
    const shouldRetry = (err: Error) => err.message !== 'fatal error';

    await expect(
      retry(operation, { maxAttempts: 3, delay: 10, shouldRetry })
    ).rejects.toThrow('fatal error');

    expect(operation).toHaveBeenCalledTimes(1);
  });
});
