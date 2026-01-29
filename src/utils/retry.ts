import logger from '../config/logger.js';

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  maxDelay?: number;
  backoff?: 'fixed' | 'exponential';
  shouldRetry?: (error: Error) => boolean;
}

/**
 * 通用重试函数
 * @param operation 要重试的操作
 * @param options 重试配置
 * @returns 重试操作的结果
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    delay,
    maxDelay = delay * 10,
    backoff = 'exponential',
    shouldRetry = defaultRetryPredicate,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`[retry] Attempt ${attempt}/${maxAttempts}`);
      return await operation();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        logger.error(`[retry] All attempts failed: ${error.message}`);
        throw error;
      }

      const currentDelay = calculateDelay(attempt, delay, maxDelay, backoff);
      logger.warn(
        `[retry] Attempt ${attempt} failed: ${error.message}. Retrying in ${currentDelay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error('Retry failed');
}

/**
 * 默认的重试条件判断
 * 只对连接错误、超时错误和特定渲染错误重试
 */
function defaultRetryPredicate(error: Error): boolean {
  const retryableMessages = [
    'Browser is not initialized',
    'Operation timeout',
    'Failed to initialize browser',
    'Render failed',
    'accessdenied',
    'failed',
  ];

  return retryableMessages.some((message) =>
    error.message.toLowerCase().includes(message.toLowerCase())
  );
}

/**
 * 计算延迟时间
 * @param attempt 当前尝试次数
 * @param baseDelay 基础延迟
 * @param maxDelay 最大延迟
 * @param backoff 退避策略
 * @returns 当前延迟时间
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  backoff: 'fixed' | 'exponential'
): number {
  if (backoff === 'fixed') {
    return baseDelay;
  }

  // 指数退避，最大延迟限制
  const delay = baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, maxDelay);
}
