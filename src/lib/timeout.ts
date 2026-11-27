export function isTimeoutError(error: unknown): boolean {
    return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
}

export function abortableTimeout(timeoutMs: number): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    timer.unref?.()
    return {signal: controller.signal, clear: () => clearTimeout(timer)}
}

export async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs = 8_000,
): Promise<Response> {
    const {signal, clear} = abortableTimeout(timeoutMs)
    try {
        return await fetch(url, {...init, signal})
    } finally {
        clear()
    }
}

/** Node / Bun 后台任务：不阻塞退出，且只在常驻进程里有意义 */
export function scheduleUnrefRepeat(
    run: () => void | Promise<void>,
    intervalMs: number,
    delayMs = 0,
): void {
    setTimeout(() => void run(), delayMs).unref?.()
    setInterval(() => void run(), intervalMs).unref?.()
}
