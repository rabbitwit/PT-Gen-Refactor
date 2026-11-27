import type {AppConfig, ProviderBaseData} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {DomQuery} from '../lib/dom'
import {
    buildDoubanHeaders,
    getDoubanCookieJar,
    isDoubanAntiBot,
    isDoubanChallengePage,
    isDoubanChallengeStatus,
    isDoubanNotFound,
} from '../douban/request'
import {assertDoubanCookieUsable} from '../douban/cookie-health'
import {assertId, providerData, text, unique} from './shared'

type Json = Record<string, unknown>

function parseJsonLd(html: string): Json {
    const match = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
    if (!match) return {}
    try {
        return JSON.parse(match[1]) as Json
    } catch {
        return {}
    }
}

function labelledFields(info: DomQuery): Record<string, string> {
    const result: Record<string, string> = {}
    info.select('span').class('pl').map((span) => {
        const label = span.trimmedText().replace(/[:：]/g, '').trim()
        const value = span.nextSiblingText()
        if (label && value) result[label] = value
        return null
    })
    return result
}

function splitNames(value: string): string[] {
    return unique(
        value
            .split(/[/／、]/)
            .map((item) => item.trim())
            .filter(Boolean),
    )
}

function extractIntroduction(root: DomQuery): string {
    const report = root.attr('id="link-report"')
    const introNodes = report.select('div').class('intro').all()
    if (!introNodes.length) return ''
    const intro = new DomQuery([introNodes[introNodes.length - 1]])
    const paragraphs = intro
        .select('p')
        .map((p) => p.text().replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    if (paragraphs.length) return paragraphs.join('\n')
    return intro.text().replace(/\s+/g, ' ').trim()
}

export async function fetchDoubanBook(
    client: HttpClient,
    config: AppConfig,
    rawSid: string,
): Promise<ProviderBaseData> {
    const sid = assertId(rawSid, /^\d{4,12}$/, 'douban_book', '1084336')
    const link = `https://book.douban.com/subject/${sid}/`
    const jar = getDoubanCookieJar(config)

    await assertDoubanCookieUsable(client, config)

    const response = await client.request(link, {
        timeoutMs: config.requestTimeoutMs,
        headers: {...buildDoubanHeaders(jar), referer: 'https://book.douban.com/'},
        redirect: 'follow',
    })

    const html = await response.text()

    if (isDoubanNotFound(html)) {
        throw ApiError.notFound(`豆瓣读书上未找到条目 ${sid}`)
    }
    if (isDoubanChallengeStatus(response.status)) {
        throw new ApiError(
            'UPSTREAM_BLOCKED',
            `豆瓣读书被拒绝（HTTP ${response.status}），当前出口未通过风控，请配置 DOUBAN_COOKIE 或更换出口`,
            {retryable: true, retryAfterSeconds: 60, details: {status: response.status}},
        )
    }
    if (isDoubanAntiBot(html) || isDoubanChallengePage(html)) {
        throw new ApiError(
            'UPSTREAM_BLOCKED',
            '豆瓣读书触发了反爬验证，请配置 DOUBAN_COOKIE 后重试',
            {retryable: true, retryAfterSeconds: 60},
        )
    }
    if (!response.ok) {
        throw ApiError.upstreamError(`豆瓣读书返回 HTTP ${response.status}`, {status: response.status})
    }

    const root = DomQuery.load(html)
    const ld = parseJsonLd(html)
    const title = text(
        root.select('span').attr('property="v:itemreviewed"').trimmedText(),
        text(ld.name),
    )
    const poster = root.attr('id="mainpic"').select('a').class('nbg').getAttr('href') ?? ''
    const ratingText = root.select('strong').attr('property="v:average"').trimmedText()
    const votesText = root.select('span').attr('property="v:votes"').trimmedText()
    const introduction = extractIntroduction(root)

    const info = root.attr('id="info"')
    const fields = labelledFields(info)
    const authorValue = fields['作者'] ?? ''
    const translatorValue = fields['译者'] ?? ''

    const isbn = text(ld.isbn, fields['ISBN'] ?? '')

    return providerData('douban_book', sid, {
        title,
        original_title: fields['原作名'] ?? '',
        poster,
        author: splitNames(authorValue),
        translator: splitNames(translatorValue).sort(),
        publisher: fields['出版社'] ?? '',
        year: fields['出版年'] ?? '',
        pages: fields['页数'] ?? '',
        pricing: fields['定价'] ?? '',
        binding: fields['装帧'] ?? '',
        series: fields['丛书'] ?? '',
        isbn,
        rating: ratingText ? Number.parseFloat(ratingText) || 0 : 0,
        votes: votesText ? Number.parseInt(votesText, 10) || 0 : 0,
        introduction,
        link,
    })
}
