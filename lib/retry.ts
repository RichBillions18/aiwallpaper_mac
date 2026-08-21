/**
 * 【网络抖动重试】lib/retry.ts
 *
 * 本项目依赖三个外部服务：Clerk（登录）、Postgres（Supabase）、OpenAI 代理。
 * 在慢链路上它们会偶发断连，日志里长这样：
 *   ECONNRESET / fetch failed              → 连接被重置
 *   Connection terminated unexpectedly     → 连接池里的空闲连接已经死了
 *   clerkError: true, status: undefined    → 请求根本没到 Clerk
 *
 * 这类错误「重试一次就好了」，不该直接 500 给用户看。
 * 注意只重试网络层错误：业务错误（比如积分不足）重试没有意义。
 */

/** 明确属于网络层的错误码 */
const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_TIMEOUT",
]);

/** 错误信息里出现这些字样，也当成网络问题 */
const TRANSIENT_MESSAGES = [
  "fetch failed",
  "connection terminated",
  "socket hang up",
  "socket disconnected",
  "network",
  "timeout",
  "timed out",
];

/**
 * 判断是不是「值得重试」的错误。
 * Node 的 fetch 会把底层错误包在 cause 里，所以要顺着 cause 链一层层看。
 */
export function isTransientError(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 4) {
    return false;
  }

  const err = error as {
    code?: unknown;
    message?: unknown;
    cause?: unknown;
    clerkError?: unknown;
    status?: unknown;
  };

  if (typeof err.code === "string" && TRANSIENT_CODES.has(err.code)) {
    return true;
  }

  // Clerk 的错误对象：clerkError 为真但没有 HTTP 状态码 = 请求没发出去
  if (err.clerkError === true && err.status === undefined) {
    return true;
  }

  if (typeof err.message === "string") {
    const message = err.message.toLowerCase();
    if (TRANSIENT_MESSAGES.some((keyword) => message.includes(keyword))) {
      return true;
    }
  }

  return isTransientError(err.cause, depth + 1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 失败自动重试，只对网络类错误生效
 *
 * @param label   日志前缀，出问题时方便定位是哪一步在重试
 * @param fn      要执行的异步操作
 * @param retries 额外重试次数（默认 2，即最多执行 3 次）
 * @param delayMs 首次等待毫秒数，之后每次翻倍（400 → 800）
 */
export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 400,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 业务错误或已经用完次数，直接抛出去
      if (!isTransientError(error) || attempt === retries) {
        throw error;
      }

      const wait = delayMs * 2 ** attempt;
      console.warn(
        `[retry] ${label} 第 ${attempt + 1} 次失败（网络抖动），${wait}ms 后重试`,
      );
      await sleep(wait);
    }
  }

  throw lastError;
}
