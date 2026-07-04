export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  maxDelay?: number;
  backoff?: 'fixed' | 'exponential';
  shouldRetry?: (error: Error) => boolean;
  logger?: {
    debug?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
  };
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
    logger,
  } = options;

  const log = logger || console;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (log.debug) log.debug(`[retry] Attempt ${attempt}/${maxAttempts}`);
      return await operation();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message;

      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        if (log.error)
          log.error(`[retry] All attempts failed: ${errorMessage}`);
        throw lastError;
      }

      const currentDelay = calculateDelay(attempt, delay, maxDelay, backoff);
      if (log.warn) {
        log.warn(
          `[retry] Attempt ${attempt} failed: ${errorMessage}. Retrying in ${currentDelay}ms...`
        );
      }

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
 * 返回 true 表示允许重试
 */
function defaultRetryPredicate(_error: Error): boolean {
  return true;
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
