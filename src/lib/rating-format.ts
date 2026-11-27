const EMPTY_RATING = '0.0 / 10 from 0 users'

/** 把分数 + 票数格式化成对外契约里的 `8.5 / 10 from 1,234 users` */
export function formatUserRating(average: string | number, votes: string | number): string {
    const value = typeof average === 'number' ? average : Number.parseFloat(average) || 0
    const count = typeof votes === 'number' ? votes : Number.parseInt(String(votes).replace(/\D/g, ''), 10) || 0
    if (value <= 0) return EMPTY_RATING
    return `${value.toFixed(1)} / 10 from ${count.toLocaleString('en-US')} users`
}

export function emptyUserRating(): string {
    return EMPTY_RATING
}
