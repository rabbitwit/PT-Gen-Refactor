import type {PersonEntry} from '../types'

export interface CastLimits {
    lead: number
    supporting: number
    voice: number
}

/** 按主演 / 配角 / 配音限额拼接，豆瓣与 IMDb 共用 */
export function selectCastByLimits(
    lead: PersonEntry[],
    supporting: PersonEntry[],
    voice: PersonEntry[],
    limits: CastLimits,
): PersonEntry[] {
    return [
        ...lead.slice(0, limits.lead),
        ...supporting.slice(0, limits.supporting),
        ...voice.slice(0, limits.voice),
    ]
}
