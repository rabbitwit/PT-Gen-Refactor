interface Bucket {
    count: number
    resetAt: number
}

export interface RateLimitResult {
    allowed: boolean
    limit: number
    remaining: number
    resetAt: number
}

/**
 * 进程内固定窗口限流。
 *
 * 只做单实例内的兜底保护，多实例部署时请叠加平台侧限流（Cloudflare Rate
 * Limiting / Vercel Firewall）。
 */
export class RateLimiter {
    private readonly buckets = new Map<string, Bucket>()

    constructor(
        private readonly limit: number,
        private readonly windowMs: number,
    ) {
    }

    check(key: string): RateLimitResult {
        const now = Date.now()
        let bucket = this.buckets.get(key)

        if (!bucket || bucket.resetAt <= now) {
            bucket = {count: 0, resetAt: now + this.windowMs}
            this.buckets.set(key, bucket)
            if (this.buckets.size > 10_000) this.cleanup(now)
        }

        bucket.count += 1
        return {
            allowed: bucket.count <= this.limit,
            limit: this.limit,
            remaining: Math.max(0, this.limit - bucket.count),
            resetAt: bucket.resetAt,
        }
    }

    private cleanup(now: number): void {
        for (const [key, bucket] of this.buckets) {
            if (bucket.resetAt <= now) this.buckets.delete(key)
        }
    }
}
