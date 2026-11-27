import { ApiError, ErrorCode } from '../lib/errors'

const HINT = '重新登录豆瓣后复制 Cookie，并同步更新 DOUBAN_COOKIE_EXPIRES_AT'

export function throwDoubanCookieExpired(
  reason: string,
  message: string,
  extra?: Record<string, unknown>,
): never {
  throw new ApiError(ErrorCode.DOUBAN_COOKIE_EXPIRED, message, {
    details: { reason, hint: HINT, ...extra },
  })
}
