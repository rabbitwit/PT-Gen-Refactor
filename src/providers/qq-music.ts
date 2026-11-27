import type {AppConfig, ProviderBaseData} from '../types'
import type {HttpClient} from '../lib/http'
import {ApiError} from '../lib/errors'
import {providerData, requestJson, text} from './shared'

type Json = Record<string, any>

function formatPlayTime(seconds: unknown): string {
    const total = Number(seconds)
    if (!Number.isFinite(total) || total < 0) return ''
    const mins = Math.floor(total / 60)
    const secs = Math.floor(total % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
}

function asSingers(value: unknown): Array<{ name: string; mid?: string }> {
    const list = Array.isArray(value)
        ? value
        : Array.isArray((value as Json | undefined)?.singerList)
            ? ((value as Json).singerList as unknown[])
            : []
    return list
        .map((item) => {
            const row = (item ?? {}) as Json
            const name = text(row.name)
            if (!name) return null
            return {name, mid: text(row.mid) || undefined}
        })
        .filter(Boolean) as Array<{ name: string; mid?: string }>
}

function asSongs(list: unknown): Json[] {
    if (!Array.isArray(list)) return []
    return list.map((item) => {
        const row = (item ?? {}) as Json
        const song = (row.songInfo ?? row) as Json
        return {
            id: song.id,
            mid: song.mid,
            name: text(song.title, text(song.name)),
            sub_name: text(song.subtitle),
            singer: asSingers(song.singer),
            interval: song.interval,
            playTime: formatPlayTime(song.interval),
        }
    })
}

export async function fetchQQMusic(
    client: HttpClient,
    config: AppConfig,
    sid: string,
): Promise<ProviderBaseData> {
    const id = sid.trim()
    if (!id) throw ApiError.badRequest('QQ 音乐专辑 ID 不能为空')

    const payload = {
        comm: {ct: 24, cv: 0},
        album: {
            module: 'music.musichallAlbum.AlbumInfoServer',
            method: 'GetAlbumDetail',
            param: {albumMid: id},
        },
        songList: {
            module: 'music.musichallAlbum.AlbumSongList',
            method: 'GetAlbumSongList',
            param: {albumMid: id, begin: 0, num: 300, order: 2},
        },
    }

    const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(JSON.stringify(payload))}`
    const body = await requestJson<Json>(client, url, {
        config,
        headers: {
            referer: 'https://y.qq.com/',
            origin: 'https://y.qq.com',
        },
    })
    const albumBlock = (body.album ?? {}) as Json
    const songBlock = (body.songList ?? {}) as Json
    if (albumBlock.code !== 0 || !albumBlock.data) {
        throw ApiError.upstreamError('QQ 音乐专辑详情获取失败', {
            code: albumBlock.code,
            albumMid: id,
        })
    }

    const album = albumBlock.data as Json
    const basic = (album.basicInfo ?? {}) as Json
    const title = text(basic.albumName, text(basic.title))
    if (!title && !basic.albumMid && !basic.albumID) {
        throw ApiError.upstreamError('QQ 音乐返回数据中缺少专辑详情')
    }

    const albumMid = text(basic.albumMid, id)
    const pmid = text(basic.pmid, `${albumMid}_1`)
    const cover = pmid
        ? `https://y.qq.com/music/photo_new/T002R500x500M000${pmid}.jpg?max_age=2592000`
        : ''

    const songList = asSongs(songBlock.data?.songList)

    return providerData('qq_music', id, {
        id: basic.albumID,
        mid: albumMid,
        name: title,
        title,
        cover,
        singer: asSingers(album.singer),
        albumName: title,
        genre: text(basic.genre),
        language: text(basic.language),
        albumType: text(basic.albumType),
        company: text(album.company?.name),
        publishTime: text(basic.publishDate, text(basic.ctime)),
        desc: text(basic.desc),
        songList,
    })
}
