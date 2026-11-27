import type {AppConfig, ProviderBaseData} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {DomQuery} from '../lib/dom'
import {assertId, providerData, requestText, unique} from './shared'

const MELON_ALBUM_URL = 'https://www.melon.com/album/detail.htm'

const GENRE_TRANSLATIONS: Record<string, string> = {
    '발라드': 'Ballad',
    '댄스': 'Dance',
    '랩/힙합': 'Rap / Hip-Hop',
    'R&B/Soul': 'R&B / Soul',
    '인디음악': 'Indie',
    '록/메탈': 'Rock / Metal',
    '트로트': 'Trot',
    '포크/블루스': 'Folk / Blues',
    '재즈': 'Jazz',
    '애시드/퓨전/팝': 'Acid / Fusion / Pop',
    '게임': 'Games',
}

const ALBUM_TYPE_TRANSLATIONS: Record<string, string> = {
    '정규': '正规专辑',
    '싱글': '单曲',
    EP: 'EP',
    OST: 'OST',
}

function normalizePoster(src: string | undefined): string {
    if (!src) return ''
    let url = src.split('?')[0]
    const jpg = url.indexOf('.jpg')
    if (jpg !== -1) url = url.slice(0, jpg + 4)
    url = url.replace(/500\.jpg$/, '1000.jpg')
    if (!/^https?:\/\//i.test(url)) {
        url = `https://www.melon.com${url.startsWith('/') ? '' : '/'}${url}`
    }
    return url
}

function translateGenres(genres: string[]): string[] {
    return genres.map((genre) => GENRE_TRANSLATIONS[genre] || genre)
}

function firstByClass(root: DomQuery, classes: string[]): DomQuery {
    for (const className of classes) {
        const found = root.select('div').class(className).first()
        if (found.length) return found
        const span = root.select('span').class(className).first()
        if (span.length) return span
    }
    return new DomQuery([])
}

function firstByClassIn(root: DomQuery, tag: string, className: string): DomQuery {
    const found = root.select(tag).class(className).first()
    return found.length ? found : new DomQuery([])
}

/** 保留 <br> 换行，不把简介压成一行。 */
function textWithBreaks(root: DomQuery): string {
    const parts: string[] = []
    const walk = (node: unknown) => {
        const current = node as { type?: string; data?: string; name?: string; children?: unknown[] }
        if (current.type === 'text') {
            parts.push(current.data ?? '')
            return
        }
        if (current.type !== 'tag') return
        if (current.name === 'br') {
            parts.push('\n')
            return
        }
        for (const child of current.children ?? []) walk(child)
    }
    for (const node of root.all()) walk(node)
    return parts.join('').replace(/\r\n/g, '\n').trim()
}

export async function fetchMelon(
    client: HttpClient,
    config: AppConfig,
    rawSid: string,
): Promise<ProviderBaseData> {
    const sid = assertId(rawSid, /^\d+$/, 'melon', '10546051')
    const url = `${MELON_ALBUM_URL}?albumId=${sid}`

    const html = await requestText(client, url, {
        config,
        headers: {
            accept: 'text/html',
            'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        },
    })

    const root = DomQuery.load(html)
    const info = root.select('div').class('wrap_info').first()
    if (!info.length) {
        throw ApiError.upstreamError('无法从 Melon 页面找到专辑信息')
    }

    const data: Record<string, unknown> = {
        melon_id: sid,
        melon_link: url,
    }

    const gubun = firstByClass(info, ['gubun']).trimmedText()
    const typeMatch = gubun.match(/\[(.*?)]/)
    if (typeMatch) {
        data.album_type = ALBUM_TYPE_TRANSLATIONS[typeMatch[1]] || typeMatch[1]
    } else {
        const clean = gubun.replace(/[[\]]/g, '').trim()
        if (clean) data.album_type = clean
    }

    const songName = firstByClass(info, ['song_name']).trimmedText()
    const title = songName.replace(/^앨범명\s*/i, '').trim()
    if (title) data.title = title

    const artistLinks = info
        .select('a')
        .map((link) => link)
        .filter((link) => (link.getAttr('href') ?? '').includes('goArtistDetail'))
    const artists = unique(artistLinks.map((link) => link.trimmedText()))
    if (artists.length) data.artists = artists

    // Melon 现在是 div.meta > dl.list，里面 dt/dd 成对出现；按索引配对，避免读串字段。
    const metaBox = firstByClass(info, ['meta'])
    const dl = metaBox.select('dl').first()
    const dts = dl.select('dt')
    const dds = dl.select('dd')
    const ddTexts = dds.map((dd) => dd.trimmedText())
    const meta: Record<string, string> = {}
    dts.map((dt, index) => {
        const label = dt.trimmedText()
        const value = ddTexts[index] ?? ''
        if (label) meta[label] = value
        return null
    })

    if (meta['발매일']) data.release_date = meta['발매일']
    if (meta['장르']) {
        data.genres = translateGenres(
            meta['장르']
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
        )
    }
    if (meta['발매사']) data.publisher = meta['발매사']
    if (meta['기획사']) data.planning = meta['기획사']
    if (meta['유형']) data.album_type = meta['유형']

    const scoreText = root.select('span[id=gradPointLayer]').first().trimmedText()
    const score = Number(scoreText)
    if (Number.isFinite(score) && score > 0) {
        const countText = root.select('span[id=gradCountLayer]').first().trimmedText()
        const votes = countText.replace(/[^0-9]/g, '')
        data.rating = votes
            ? `${score.toFixed(1)} / 5 from ${Number(votes).toLocaleString('en-US')} users`
            : `${score.toFixed(1)} / 5`
    }

    const poster = firstByClass(info, ['thumb']).select('img').first()
    const posterSrc = poster.getAttr('src') ?? poster.getAttr('data-src') ?? ''
    const normalizedPoster = normalizePoster(posterSrc)
    if (normalizedPoster) data.poster = normalizedPoster

    const albumInfo = root.select('div').class('dtl_albuminfo').first()
    if (albumInfo.length) {
        const description = textWithBreaks(albumInfo)
        if (description) data.description = description
    }

    const rows = root.select('tbody').select('tr')
    const tracks: Array<{ number: string; title: string; artists: string[] }> = []
    rows.map((row) => {
        const number =
            firstByClassIn(row, 'span', 'rank').trimmedText().replace(/\D+/g, '') ||
            firstByClassIn(row, 'span', 'no').trimmedText()
        if (!number && !row.select('a').length) return null

        let trackTitle = ''
        const anchors = row.select('a').map((anchor) => anchor)
        for (const anchor of anchors) {
            const titleAttr = anchor.getAttr('title') ?? ''
            if (titleAttr.includes('재생') || titleAttr.includes('곡정보')) {
                const match = titleAttr.match(/^(.*?)\s+(재생|곡정보)/)
                trackTitle = match?.[1]?.trim() || anchor.trimmedText()
                if (trackTitle) break
            }
        }
        if (!trackTitle) {
            const ellipsis = firstByClass(row, ['ellipsis'])
            trackTitle = ellipsis.select('a').first().trimmedText() || firstByClassIn(row, 'span', 'song_name').trimmedText()
        }
        if (!trackTitle) return null

        const trackArtists = unique(
            anchors
                .filter((anchor) => (anchor.getAttr('href') ?? '').includes('goArtistDetail'))
                .map((anchor) => anchor.trimmedText()),
        )
        tracks.push({number, title: trackTitle, artists: trackArtists})
        return null
    })

    if (tracks.length) data.tracks = tracks

    return providerData('melon', sid, data)
}
