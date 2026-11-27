export const MAX_REDIRECTS = 5

export function isRedirectStatus(status: number): boolean {
    return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

export function tooManyRedirectsError(url: string): Error {
    return new Error(`重定向次数超过 ${MAX_REDIRECTS} 次: ${url}`)
}

/** 与 fetch 一致：303 一律转 GET；301/302 的 POST 也降级为 GET */
export function nextRedirectRequest(
    target: URL,
    location: string,
    method: string,
    body: string | undefined,
    status: number,
): { target: URL; method: string; body: string | undefined } {
    const nextTarget = new URL(location, target)
    if (status === 303 || ((status === 301 || status === 302) && method === 'POST')) {
        return {target: nextTarget, method: 'GET', body: undefined}
    }
    return {target: nextTarget, method, body}
}
