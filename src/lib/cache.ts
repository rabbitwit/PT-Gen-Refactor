interface Entry<T> {
    value: T
    expiresAt: number
}

/**
 * 进程内 TTL 缓存。
 *
 * 在 Serverless / Workers 场景下，每个实例都有独立内存，命中率有限，
 * 但配合 `Cache-Control: s-maxage` 可以让 CDN 层承担大部分重复请求。
 */
export class TtlCache<T> {
    private readonly store = new Map<string, Entry<T>>()

    constructor(
        private readonly ttlMs: number,
        private readonly maxEntries = 500,
    ) {
    }

    get(key: string): T | undefined {
        const hit = this.store.get(key)
        if (!hit) return undefined
        if (hit.expiresAt <= Date.now()) {
            this.store.delete(key)
            return undefined
        }
        return hit.value
    }

    set(key: string, value: T, ttlMs = this.ttlMs): void {
        if (this.store.size >= this.maxEntries) this.evict()
        this.store.set(key, {value, expiresAt: Date.now() + ttlMs})
    }

    private evict(): void {
        const now = Date.now()
        for (const [key, entry] of this.store) {
            if (entry.expiresAt <= now) this.store.delete(key)
        }
        // 仍然超限时按插入顺序淘汰最旧的条目
        while (this.store.size >= this.maxEntries) {
            const oldest = this.store.keys().next()
            if (oldest.done) break
            this.store.delete(oldest.value)
        }
    }
}
