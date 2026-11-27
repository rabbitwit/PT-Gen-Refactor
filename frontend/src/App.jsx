import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import './App.css'
import {ApiClientError, getConfig, getDetail, request, search} from './api'
import {createTranslator, detectLanguage, LANGUAGES} from './i18n'

const VERSION = __APP_VERSION__

const THEME_KEY = 'ptgen.theme'
const LANGUAGE_KEY = 'ptgen.language'

const SOURCE_OPTIONS = [
    'auto',
    'douban',
    'douban_book',
    'imdb',
    'tmdb',
    'bangumi',
    'trakt',
    'steam',
    'melon',
    'hongguo',
    'qq_music',
]

const SEARCHABLE = new Set(['auto', 'douban', 'imdb', 'tmdb', 'bangumi', 'trakt', 'steam'])

const STEP_ITEMS = [
    {key: 'paste', icon: 'link'},
    {key: 'fetch', icon: 'database'},
    {key: 'copy', icon: 'copy'},
]

function loadTheme() {
    const stored = localStorage.getItem(THEME_KEY)
    return ['light', 'dark', 'system'].includes(stored) ? stored : 'system'
}

function isDarkTheme(theme) {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/** 从链接推断所属数据源，用于校验与手动选择的数据源是否一致 */
function detectUrlSource(rawUrl) {
    let parsed
    try {
        parsed = new URL(rawUrl)
    } catch {
        return null
    }

    const host = parsed.hostname.toLowerCase()
    // 必须按域名边界匹配：`fake-imdb.com` 不能被当成 IMDb，否则会把无效链接送去解析
    const under = (domain) => host === domain || host.endsWith(`.${domain}`)
    if (under('book.douban.com')) return 'douban_book'
    if (under('douban.com')) return 'douban'
    if (under('imdb.com')) return 'imdb'
    if (under('bgm.tv') || under('bangumi.tv')) return 'bangumi'
    if (under('themoviedb.org')) return 'tmdb'
    if (under('trakt.tv')) return 'trakt'
    if (under('steampowered.com')) return 'steam'
    if (under('melon.com')) return 'melon'
    if (host === 'y.qq.com') return 'qq_music'
    if (under('novelquickapp.com') || under('hongguoduanju.com')) return 'hongguo'
    return null
}

function classifyInput(rawInput, source) {
    const value = rawInput.trim()
    if (!value) return null

    const explicit = source !== 'auto'

    if (/^https?:\/\//i.test(value)) {
        const detected = detectUrlSource(value)
        if (explicit && detected && detected !== source) {
            return {kind: 'mismatch', source, detected}
        }
        return {kind: 'direct', url: value, source: explicit ? source : 'auto'}
    }

    if (/^tt\d{7,9}$/i.test(value)) {
        if (explicit && source !== 'imdb') return {kind: 'mismatch', source, detected: 'imdb'}
        return {kind: 'direct', source: 'imdb', sid: value}
    }

    if (/^(movie|tv|show|movies|shows):/i.test(value)) {
        if (explicit && source !== 'tmdb' && source !== 'trakt') {
            return {kind: 'mismatch', source, detected: 'tmdb'}
        }
        return {kind: 'direct', source: source === 'trakt' ? 'trakt' : 'tmdb', sid: value}
    }

    if (/^\d{4,12}$/.test(value)) {
        return {kind: 'direct', source: explicit ? source : 'douban', sid: value}
    }

    if (explicit) {
        if (!SEARCHABLE.has(source)) return {kind: 'unsupported-search', source}
        return {kind: 'search', source}
    }

    return {kind: 'search', source: 'auto'}
}

function splitSid(item) {
    const sid = String(item.sid ?? item.id ?? '')
    if (item.site === 'tmdb' || item.site === 'trakt') {
        const [type, id] = sid.includes(':') ? sid.split(':') : ['', sid]
        return {sid: id || sid, type: type || undefined}
    }
    return {sid, type: undefined}
}

function formatRating(value) {
    if (value === undefined || value === null || value === '') return ''
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) return numeric.toFixed(1)
    return String(value)
}

function errorText(error, t) {
    if (!error) return ''
    switch (error.type) {
        case 'UNAUTHORIZED':
        case 'FORBIDDEN':
            return t('error.auth')
        case 'AUTH_CHALLENGE':
            return t('error.authChallenge')
        case 'RATE_LIMITED':
            return t('error.rate')
        case 'NOT_FOUND':
            return t('error.notFound')
        case 'UPSTREAM_BLOCKED':
        case 'UPSTREAM_CHALLENGE':
            return t('error.blocked')
        case 'DOUBAN_COOKIE_EXPIRED':
            return t('error.doubanCookie')
        case 'CONFIG_REQUIRED':
        case 'NOT_IMPLEMENTED':
            return t('error.config')
        case 'NEED_LINK':
            return t('error.needLink')
        case 'SOURCE_MISMATCH':
            return t('error.sourceMismatch', {
                source: t(`source.${error.details?.source ?? 'auto'}`),
                detected: t(`source.${error.details?.detected ?? 'auto'}`),
            })
        case 'UPSTREAM_TIMEOUT':
        case 'TIMEOUT':
            return t('error.timeout')
        case 'NETWORK_ERROR':
            return t('error.network')
        default:
            return error.message || t('error.unknown')
    }
}

function Icon({name, className = 'h-5 w-5'}) {
    const paths = {
        search: <>
            <circle cx="11" cy="11" r="7"/>
            <path d="m20 20-3.5-3.5"/>
        </>,
        sparkles: <>
            <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/>
            <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>
        </>,
        copy: <>
            <rect x="9" y="9" width="11" height="11" rx="2"/>
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>
        </>,
        check: <path d="m5 13 4 4L19 7"/>,
        x: <>
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
        </>,
        settings: <>
            <circle cx="12" cy="12" r="3"/>
            <path
                d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>
        </>,
        sun: <>
            <circle cx="12" cy="12" r="4"/>
            <path
                d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
        </>,
        moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>,
        github: <>
            <path
                d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
            <path d="M9 18c-4.51 2-5-2-7-2"/>
        </>,
        chevron: <path d="m9 18 6-6-6-6"/>,
        chevronDown: <path d="m6 9 6 6 6-6"/>,
        alert: <>
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
        </>,
        trash: <>
            <path d="M3 6h18"/>
            <path d="M8 6V4h8v2"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v5M14 11v5"/>
        </>,
        refresh: <>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            <path d="M3 21v-5h5"/>
        </>,
        globe: <>
            <circle cx="12" cy="12" r="9"/>
            <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>
        </>,
        link: <>
            <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1"/>
            <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1"/>
        </>,
        database: <>
            <ellipse cx="12" cy="5" rx="8" ry="3"/>
            <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/>
            <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>
        </>,
        cpu: <>
            <rect x="4" y="4" width="16" height="16" rx="2"/>
            <rect x="9" y="9" width="6" height="6" rx="1"/>
            <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>
        </>,
        layers: <>
            <path d="m12 2 9 4.5-9 4.5L3 6.5 12 2Z"/>
            <path d="m3 12 9 4.5 9-4.5"/>
            <path d="m3 17.5 9 4.5 9-4.5"/>
        </>,
        film: <>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>
        </>,
    }

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {paths[name] ?? null}
        </svg>
    )
}

function useDismiss(open, containerRef, setOpen) {
    useEffect(() => {
        if (!open) return

        const handlePointer = (event) => {
            if (!containerRef.current?.contains(event.target)) setOpen(false)
        }
        const handleKey = (event) => {
            if (event.key === 'Escape') setOpen(false)
        }

        document.addEventListener('mousedown', handlePointer)
        document.addEventListener('touchstart', handlePointer)
        document.addEventListener('keydown', handleKey)

        return () => {
            document.removeEventListener('mousedown', handlePointer)
            document.removeEventListener('touchstart', handlePointer)
            document.removeEventListener('keydown', handleKey)
        }
    }, [open, containerRef, setOpen])
}

function LanguageMenu({language, onChange, t}) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef(null)
    const current = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0]

    useDismiss(open, containerRef, setOpen)

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={t('language.toggle')}
                title={t('language.toggle')}
                className="flex h-9 items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/70 pl-2.5 pr-2 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
            >
                <Icon name="globe" className="h-4 w-4"/>
                <span className="hidden sm:inline">{current.label}</span>
                <span className="sm:hidden">{current.short}</span>
                <Icon
                    name="chevronDown"
                    className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    aria-label={t('settings.language')}
                    className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl border border-zinc-200/80 bg-white p-1.5 shadow-xl shadow-zinc-950/10 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/40"
                >
                    {LANGUAGES.map((item) => {
                        const active = item.code === language
                        return (
                            <button
                                key={item.code}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                    onChange(item.code)
                                    setOpen(false)
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[13px] transition ${
                                    active
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5'
                                }`}
                            >
                                <span>{item.label}</span>
                                {active && <Icon name="check" className="h-3.5 w-3.5"/>}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function SourceMenu({value, onChange, t}) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef(null)

    useDismiss(open, containerRef, setOpen)

    return (
        <div className="relative flex-none" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={t('source.label')}
                title={t('source.label')}
                className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition sm:h-11 ${
                    open
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80 dark:bg-white/8 dark:text-zinc-200 dark:hover:bg-white/12'
                }`}
            >
                <Icon name="database" className="h-4 w-4 flex-none text-zinc-400"/>
                <span className="max-w-[8.5rem] truncate">{t(`source.${value}`)}</span>
                <Icon
                    name="chevronDown"
                    className={`h-4 w-4 flex-none text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    aria-label={t('source.label')}
                    className="absolute right-0 top-full z-[80] mt-2 w-64 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-1.5 shadow-2xl shadow-zinc-950/10 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/50"
                >
                    <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {t('source.label')}
                    </p>
                    <div className="max-h-[18rem] overflow-y-auto">
                        {SOURCE_OPTIONS.map((option) => {
                            const active = option === value
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onClick={() => {
                                        onChange(option)
                                        setOpen(false)
                                    }}
                                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] transition ${
                                        active
                                            ? 'bg-zinc-900 font-medium text-white dark:bg-white dark:text-zinc-900'
                                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span>{t(`source.${option}`)}</span>
                                    {active && <Icon name="check" className="h-3.5 w-3.5"/>}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

function StatusBadge({t, state}) {
    let tone = 'bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400'
    let dot = 'bg-zinc-400'
    let label = t('status.unknown')

    if (state === 'missing') {
        tone = 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
        dot = 'bg-amber-500'
        label = t('features.missing')
    } else if (state === 'configured') {
        tone = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
        dot = 'bg-emerald-500'
        label = t('features.configured')
    } else if (state === 'available') {
        tone = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
        dot = 'bg-emerald-500'
        label = t('features.available')
    }

    return (
        <span
            className={`inline-flex flex-none items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`}/>
            {label}
    </span>
    )
}

function StatusPage({t, language, initialConfig}) {
    const [health, setHealth] = useState(null)
    const [liveConfig, setLiveConfig] = useState(initialConfig)
    const [state, setState] = useState('loading')
    const [checkedAt, setCheckedAt] = useState(null)
    const [loadError, setLoadError] = useState('')

    const check = useCallback(async () => {
        setState('loading')
        setLoadError('')
        const [healthResult, configResult] = await Promise.allSettled([
            request('/api/health', {skipAuth: true, timeout: 10000}),
            getConfig(),
        ])
        const healthData = healthResult.status === 'fulfilled' ? healthResult.value : null
        const configData = configResult.status === 'fulfilled' ? configResult.value : null
        if (healthData) setHealth(healthData)
        if (configData) setLiveConfig(configData)
        setCheckedAt(new Date())
        if (healthData) {
            setState('ready')
            return
        }
        const reason =
            healthResult.status === 'rejected'
                ? healthResult.reason
                : configResult.status === 'rejected'
                    ? configResult.reason
                    : null
        setLoadError(reason?.message || '')
        setState('error')
    }, [])

    useEffect(() => {
        void check()
    }, [check])

    const sources = liveConfig?.sources
    const cacheLayers = Array.isArray(health?.cacheLayers) ? health.cacheLayers : []
    const stateOf = (value, missing = 'available') => (!sources ? 'unknown' : value ? 'configured' : missing)
    const base = sources ? 'available' : 'unknown'

    const sourceRows = [
        {key: 'douban', state: stateOf(Boolean(sources?.douban?.backend || sources?.douban?.cookie))},
        {key: 'douban_book', state: base},
        {key: 'imdb', state: stateOf(Boolean(sources?.imdb?.backend || sources?.imdb?.cookie))},
        {key: 'tmdb', state: stateOf(Boolean(sources?.tmdb), 'missing')},
        {key: 'trakt', state: stateOf(Boolean(sources?.trakt), 'missing')},
        {key: 'bangumi', state: base},
        {key: 'steam', state: base},
        {key: 'melon', state: base},
        {key: 'hongguo', state: base},
        {key: 'qq_music', state: stateOf(Boolean(sources?.qq_music), 'missing')},
    ]

    const summaryRows = [
        {label: t('status.runtime'), value: health?.runtime || '—'},
        {label: t('status.version'), value: `v${health?.version || liveConfig?.version || '—'}`},
        {
            label: t('status.cache'),
            value: cacheLayers.length ? cacheLayers.map((layer) => layer.toUpperCase()).join(' · ') : '—'
        },
    ]

    const checkedLabel = checkedAt
        ? checkedAt.toLocaleTimeString(language, {hour: '2-digit', minute: '2-digit', second: '2-digit'})
        : '—'
    const statusOk = state === 'ready'

    return (
        <div className="mx-auto max-w-5xl">
            <button
                type="button"
                onClick={() => {
                    window.location.hash = '/'
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
                <Icon name="chevron" className="h-3.5 w-3.5 rotate-180"/>
                {t('status.back')}
            </button>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{t('status.title')}</h1>
                    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{t('status.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => void check()}
                    disabled={state === 'loading'}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/70 px-3 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
                >
                    <Icon name="refresh" className={`h-3.5 w-3.5 ${state === 'loading' ? 'animate-spin' : ''}`}/>
                    {state === 'loading' ? t('status.checking') : t('status.refresh')}
                </button>
            </div>

            <section className="card relative mt-6 overflow-hidden">
                <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-px ${
                        statusOk
                            ? 'bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent'
                            : state === 'error'
                                ? 'bg-gradient-to-r from-transparent via-red-400/80 to-transparent'
                                : 'bg-gradient-to-r from-transparent via-amber-400/80 to-transparent'
                    }`}
                />
                <div className="flex flex-col lg:flex-row lg:items-stretch">
                    <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-5 sm:px-6">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              <span
                  className={`absolute inset-0 rounded-full opacity-30 blur-md ${
                      statusOk ? 'bg-emerald-400' : state === 'error' ? 'bg-red-400' : 'bg-amber-400'
                  }`}
              />
              <span
                  className={`relative h-2.5 w-2.5 rounded-full ${
                      statusOk ? 'bg-emerald-500' : state === 'error' ? 'bg-red-500' : 'animate-pulse bg-amber-400'
                  }`}
              />
            </span>
                        <div className="min-w-0">
                            <p className="truncate text-[17px] font-semibold tracking-tight">
                                {statusOk ? t('status.ok') : state === 'error' ? t('status.failed') : t('status.checking')}
                            </p>
                            <p className="mt-1 text-[12px] text-zinc-400 dark:text-zinc-500">{t('status.checkedAt', {time: checkedLabel})}</p>
                            {state === 'error' && loadError ? (
                                <p className="mt-2 font-mono text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">{loadError}</p>
                            ) : null}
                        </div>
                    </div>
                    <div
                        className="grid grid-cols-3 border-t border-zinc-200/70 dark:border-white/[0.06] lg:w-[min(100%,28rem)] lg:shrink-0 lg:border-t-0 lg:border-l lg:border-zinc-200/70 dark:lg:border-white/[0.06]">
                        {summaryRows.map((row) => (
                            <div
                                key={row.label}
                                className="flex flex-col justify-center px-4 py-4 sm:px-5 first:pl-5 last:pr-5"
                            >
                                <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{row.label}</p>
                                <p className="mt-1.5 truncate text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white">{row.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="card mt-4 p-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">{t('status.sources')}</h2>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{sourceRows.length}</span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">{t('status.note')}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {sourceRows.map((row) => (
                        <div
                            key={row.key}
                            className="rounded-xl border border-zinc-200/70 bg-white/50 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[13px] font-semibold">{t(`source.${row.key}`)}</p>
                                <StatusBadge t={t} state={row.state}/>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}

function App() {
    const [language, setLanguage] = useState(() => {
        const stored = localStorage.getItem(LANGUAGE_KEY)
        return String(stored || detectLanguage())
    })
    const [theme, setTheme] = useState(loadTheme)
    const [source, setSource] = useState('auto')
    const [input, setInput] = useState('')
    const [busy, setBusy] = useState(false)
    const [searchData, setSearchData] = useState(null)
    const [detail, setDetail] = useState(null)
    const [error, setError] = useState(null)
    const [config, setConfig] = useState(null)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [toast, setToast] = useState('')
    const [lastRun, setLastRun] = useState(null)
    const [route, setRoute] = useState(() => window.location.hash.replace(/^#\/?/, ''))
    const resultRef = useRef(null)
    const toastTimer = useRef(null)

    const t = useMemo(() => createTranslator(language), [language])
    const inputMode = useMemo(() => classifyInput(input, source), [input, source])
    const dark = useMemo(() => isDarkTheme(theme), [theme])
    const isStatusPage = route === 'status'

    useEffect(() => {
        const syncRoute = () => setRoute(window.location.hash.replace(/^#\/?/, ''))
        window.addEventListener('hashchange', syncRoute)
        return () => window.removeEventListener('hashchange', syncRoute)
    }, [])

    useEffect(() => {
        window.scrollTo({top: 0, behavior: 'smooth'})
    }, [route])

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark)
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    }, [dark])

    useEffect(() => {
        localStorage.setItem(LANGUAGE_KEY, language)
        document.documentElement.lang = language
    }, [language])

    useEffect(() => {
        localStorage.setItem(THEME_KEY, theme)
    }, [theme])

    useEffect(() => {
        getConfig()
            .then(setConfig)
            .catch(() => {
            })
    }, [])

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current)
        }
    }, [])

    const showToast = useCallback((message) => {
        setToast(message)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(''), 2600)
    }, [])

    const resetOutput = () => {
        setError(null)
        setSearchData(null)
        setDetail(null)
    }

    const openSettings = () => {
        setSettingsOpen(true)
    }

    const runDirect = async (classified, rawInput) => {
        const data = await getDetail({
            source: classified.source === 'auto' ? undefined : classified.source,
            sid: classified.sid,
            url: classified.url,
            type: classified.type,
        })

        if (!data) throw new ApiClientError('Empty response', {type: 'BAD_RESPONSE'})

        const site = data.site || (classified.source && classified.source !== 'auto' ? classified.source : 'douban')
        const sid = data.sid || data.melon_id || classified.sid || rawInput
        setDetail({...data, site, sid})
        requestAnimationFrame(() => resultRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'}))
    }

    const runSearch = async (query, searchSource) => {
        if (!SEARCHABLE.has(searchSource)) {
            throw new ApiClientError('Source does not support search', {type: 'NEED_LINK'})
        }
        const data = await search(query, searchSource, 12)
        const items = Array.isArray(data?.items) ? data.items : []
        setSearchData({...data, items})
    }

    const execute = async (rawInput, selectedSource = source) => {
        const value = String(rawInput || '').trim()
        if (!value || busy) return

        const classified = classifyInput(value, selectedSource)
        if (!classified) return

        if (classified.kind === 'unsupported-search') {
            setError(new ApiClientError('Source needs a link or ID', {type: 'NEED_LINK'}))
            return
        }

        if (classified.kind === 'mismatch') {
            setError(
                new ApiClientError('', {
                    type: 'SOURCE_MISMATCH',
                    details: {source: classified.source, detected: classified.detected},
                }),
            )
            return
        }

        resetOutput()
        setBusy(true)
        setLastRun({input: value, source: selectedSource})

        try {
            if (classified.kind === 'direct') {
                await runDirect(classified, value)
            } else {
                await runSearch(value, classified.source)
            }
        } catch (err) {
            setError(err instanceof ApiClientError ? err : new ApiClientError(err?.message || 'Unknown error'))
        } finally {
            setBusy(false)
        }
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        void execute(input)
    }

    const handleSelectResult = async (item) => {
        if (busy) return
        const {sid, type} = splitSid(item)
        const targetSource = item.site || source
        if (!sid) {
            showToast(t('error.notFound'))
            return
        }

        setBusy(true)
        setError(null)
        setLastRun({input: `${targetSource}:${sid}`, source: targetSource})

        try {
            const data = await getDetail({source: targetSource, sid, type})
            if (!data) {
                setError(new ApiClientError('Empty response', {type: 'BAD_RESPONSE'}))
                return
            }
            setDetail({...data, site: data.site || targetSource, sid: data.sid || sid})
            requestAnimationFrame(() => resultRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'}))
        } catch (err) {
            setError(err instanceof ApiClientError ? err : new ApiClientError(err?.message || 'Unknown error'))
        } finally {
            setBusy(false)
        }
    }

    const retry = () => {
        if (!lastRun) return
        void execute(lastRun.input, lastRun.source)
    }

    const copyText = async (text, successMessage) => {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            showToast(successMessage || t('action.copied'))
        } catch {
            showToast(t('copy.failed'))
        }
    }

    const resetAll = () => {
        setInput('')
        resetOutput()
        setLastRun(null)
    }

    const resultFormat = detail?.format || ''
    const resultMeta = useMemo(() => {
        if (!resultFormat) return ''
        return t('result.meta', {
            chars: resultFormat.length.toLocaleString(),
            lines: resultFormat.split('\n').length.toLocaleString(),
        })
    }, [resultFormat, t])

    const inputBadge = inputMode
        ? inputMode.kind === 'direct' || inputMode.kind === 'mismatch'
            ? t('mode.direct')
            : inputMode.kind === 'search'
                ? t('mode.search')
                : t('mode.auto')
        : t('mode.auto')

    return (
        <div className="app-bg min-h-screen text-zinc-900 dark:text-zinc-50">
            <div className="relative z-10">
                <header
                    className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/60 backdrop-blur-xl dark:border-white/[0.06] dark:bg-zinc-950/50">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
                        <a href="/" className="group flex min-w-0 items-center gap-2.5">
                            <img
                                src="/logo.webp"
                                alt=""
                                className="h-9 w-9 flex-none rounded-full object-contain transition-transform group-hover:scale-105 dark:invert"
                            />
                            <span className="flex items-baseline gap-2">
                <span className="truncate text-[15px] font-semibold tracking-tight">{t('app.title')}</span>
                <span
                    className="hidden rounded-full border border-zinc-200/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 dark:border-white/10 dark:text-zinc-500 sm:inline">
                  v{VERSION}
                </span>
              </span>
                        </a>

                        <nav className="flex flex-none items-center gap-1.5">
                            <LanguageMenu language={language} onChange={setLanguage} t={t}/>
                            <button
                                type="button"
                                onClick={() => setTheme(dark ? 'light' : 'dark')}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-zinc-500 transition hover:border-zinc-200/80 hover:bg-white/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white"
                                title={t('theme.toggle')}
                                aria-label={t('theme.toggle')}
                            >
                                <Icon name={dark ? 'sun' : 'moon'} className="h-4 w-4"/>
                            </button>
                            <a
                                href="https://github.com/rabbitwit/PT-Gen-Refactor"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden h-9 w-9 items-center justify-center rounded-full border border-transparent text-zinc-500 transition hover:border-zinc-200/80 hover:bg-white/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white sm:flex"
                                title={t('nav.github')}
                                aria-label={t('nav.github')}
                            >
                                <Icon name="github" className="h-4 w-4"/>
                            </a>
                            <button
                                type="button"
                                onClick={openSettings}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-zinc-500 transition hover:border-zinc-200/80 hover:bg-white/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white"
                                title={t('nav.settings')}
                                aria-label={t('nav.settings')}
                            >
                                <Icon name="settings" className="h-4 w-4"/>
                            </button>
                        </nav>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-12 sm:px-8 sm:pt-20">
                    {isStatusPage ? (
                        <StatusPage t={t} language={language} initialConfig={config}/>
                    ) : (
                        <>
                            <section className="mx-auto max-w-5xl text-center">
            <span
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/70 px-3 py-1 text-[11px] font-medium text-zinc-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_2px_rgba(99,102,241,0.45)]"/>
                {t('app.badge')}
            </span>
                                <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-zinc-500 dark:text-zinc-400 sm:text-base">
                                    {t('app.subtitle')}
                                </p>
                            </section>

                            <section className="relative z-20 mx-auto mt-10 max-w-5xl">
                                <form onSubmit={handleSubmit}>
                                    <div
                                        className="card group/search overflow-visible p-2 transition duration-200 focus-within:border-indigo-300/70 focus-within:shadow-[0_20px_50px_-28px_rgba(79,70,229,0.55)] dark:focus-within:border-indigo-400/25">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <div
                                                className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.15rem] bg-zinc-50/80 px-3.5 py-1.5 dark:bg-white/[0.04] sm:py-2">
                    <span
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-zinc-400 shadow-sm dark:bg-white/8 dark:text-zinc-500">
                      <Icon name="search" className="h-4 w-4"/>
                    </span>
                                                <label htmlFor="resource-input" className="sr-only">
                                                    {t('input.label')}
                                                </label>
                                                <input
                                                    id="resource-input"
                                                    type="text"
                                                    value={input}
                                                    onChange={(event) => setInput(event.target.value)}
                                                    placeholder={t('input.placeholder')}
                                                    autoComplete="off"
                                                    spellCheck="false"
                                                    className="h-11 w-full min-w-0 bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                                                />
                                                {input ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setInput('')}
                                                        aria-label={t('action.clear')}
                                                        title={t('action.clear')}
                                                        className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-zinc-400 transition hover:bg-white hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                                                    >
                                                        <Icon name="x" className="h-3.5 w-3.5"/>
                                                    </button>
                                                ) : null}
                                            </div>

                                            <div className="flex items-center gap-1.5 px-0.5 pb-0.5 sm:pr-0.5 sm:pb-0">
                                                <SourceMenu value={source} onChange={setSource} t={t}/>
                                                <button
                                                    type="submit"
                                                    disabled={busy || !input.trim()}
                                                    className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-indigo-600 px-5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(79,70,229,0.9)] transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-400 sm:h-11 sm:flex-none sm:px-5"
                                                >
                                                    {busy ? (
                                                        <>
                                                            <span
                                                                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"/>
                                                            <span>{t('action.searching')}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Icon name="sparkles" className="h-4 w-4"/>
                                                            <span>{t('action.search')}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                                <p className="mt-3 text-center text-[12px] text-zinc-400 dark:text-zinc-500">
                                    {inputBadge} · {t('input.hint')}
                                </p>
                            </section>

                            {(error || (busy && !detail) || searchData || detail) && (
                                <div className="mx-auto mt-10 max-w-5xl space-y-4">
                                    {error && (
                                        <section
                                            className="rise card border-red-200/70 bg-red-50/80 p-5 dark:border-red-500/20 dark:bg-red-500/[0.07]">
                                            <div className="flex gap-3">
                    <span
                        className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
                      <Icon name="alert" className="h-4 w-4"/>
                    </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">{t('error.title')}</p>
                                                    <p className="mt-0.5 text-sm leading-6 text-red-700 dark:text-red-300/90">{errorText(error, t)}</p>
                                                    {error.message && error.message !== errorText(error, t) && (
                                                        <p className="mt-1 break-words font-mono text-[11px] text-red-500/90 dark:text-red-300/70">
                                                            {error.message}
                                                        </p>
                                                    )}
                                                    {lastRun && (
                                                        <button
                                                            type="button"
                                                            onClick={retry}
                                                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
                                                        >
                                                            <Icon name="refresh" className="h-3.5 w-3.5"/>
                                                            {t('action.retry')}
                                                        </button>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setError(null)}
                                                    className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-red-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20"
                                                    aria-label={t('action.close')}
                                                >
                                                    <Icon name="x" className="h-4 w-4"/>
                                                </button>
                                            </div>
                                        </section>
                                    )}

                                    {busy && !detail && (
                                        <section className="card p-6">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-500 dark:border-white/10 dark:border-t-indigo-400"/>
                                                <p className="text-sm text-zinc-600 dark:text-zinc-300">{t('status.opening')}</p>
                                            </div>
                                            <div className="mt-4 space-y-2.5">
                                                <div
                                                    className="h-2.5 w-2/5 animate-pulse rounded-full bg-zinc-200/80 dark:bg-white/10"/>
                                                <div
                                                    className="h-2.5 w-full animate-pulse rounded-full bg-zinc-200/60 dark:bg-white/[0.07]"/>
                                                <div
                                                    className="h-2.5 w-4/5 animate-pulse rounded-full bg-zinc-200/60 dark:bg-white/[0.07]"/>
                                            </div>
                                        </section>
                                    )}

                                    {searchData && (
                                        <section className="rise card overflow-hidden">
                                            <div
                                                className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 px-5 py-4 dark:border-white/[0.06] sm:px-6">
                                                <div>
                                                    <h2 className="text-base font-semibold">{t('search.title')}</h2>
                                                    <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">{t('search.subtitle')}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                      <span
                          className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                        {t('search.count', {count: searchData.items?.length ?? 0})}
                      </span>
                                                    <button
                                                        type="button"
                                                        onClick={resetAll}
                                                        title={t('action.clear')}
                                                        aria-label={t('action.clear')}
                                                        className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                                                    >
                                                        <Icon name="trash" className="h-3 w-3"/>
                                                        {t('action.clear')}
                                                    </button>
                                                </div>
                                            </div>

                                            {searchData.items?.length ? (
                                                <ul className="divide-y divide-zinc-200/60 dark:divide-white/[0.05]">
                                                    {searchData.items.map((item, index) => {
                                                        const rating = formatRating(item.rating)
                                                        const siteLabel = t(`source.${item.site}`)
                                                        return (
                                                            <li key={`${item.site || 'item'}-${item.sid || index}`}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSelectResult(item)}
                                                                    disabled={busy}
                                                                    className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-white/[0.04] sm:px-5"
                                                                >
                              <span
                                  className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl border border-zinc-200/70 bg-zinc-100 text-sm font-semibold text-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500">
                                {item.poster ? (
                                    <img src={item.poster} alt="" className="h-full w-full object-cover"
                                         loading="lazy"/>
                                ) : (
                                    (item.title || '?').slice(0, 1)
                                )}
                              </span>
                                                                    <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span
                                      className="truncate text-sm font-medium text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-300">
                                    {item.title}
                                  </span>
                                    {item.year && <span className="text-[11px] text-zinc-400">{item.year}</span>}
                                    {rating && (
                                        <span
                                            className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                                      ★ {rating}
                                    </span>
                                    )}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                                  {item.subtitle || item.abstract || item.site}
                                </span>
                              </span>
                                                                    <span
                                                                        className="flex flex-none items-center gap-2 text-xs text-zinc-400">
                                {siteLabel !== `source.${item.site}` && (
                                    <span
                                        className="hidden rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-white/5 dark:text-zinc-400 sm:inline">
                                    {siteLabel}
                                  </span>
                                )}
                                                                        <Icon
                                                                            name="chevron"
                                                                            className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-indigo-500"
                                                                        />
                              </span>
                                                                </button>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            ) : (
                                                <div className="px-4 py-12 text-center">
                                                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{t('search.empty')}</p>
                                                    <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{t('search.emptyHint')}</p>
                                                </div>
                                            )}
                                        </section>
                                    )}

                                    {detail && (
                                        <section ref={resultRef} className="scroll-mt-24">
                                            <div className="rise card overflow-hidden">
                                                <div
                                                    className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200/70 px-5 py-4 dark:border-white/[0.06] sm:px-6 sm:py-5">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                          <span
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Icon name="check" className="h-3.5 w-3.5"/>
                          </span>
                                                            <h2 className="text-base font-semibold">{t('result.title')}</h2>
                                                        </div>
                                                        <div
                                                            className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span
                              className="rounded-full bg-indigo-500/10 px-2.5 py-1 font-medium text-indigo-600 dark:text-indigo-300">
                            {t('result.source')} · {detail.site ? t(`source.${detail.site}`) : '—'}
                          </span>
                                                            <span
                                                                className="rounded-full bg-zinc-100 px-2.5 py-1 font-mono text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                            {t('result.id')} · {detail.sid || detail.melon_id || '—'}
                          </span>
                                                            {resultMeta && <span
                                                                className="text-zinc-400 dark:text-zinc-500">{resultMeta}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-none items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => copyText(detail?.format_copy || resultFormat)}
                                                            disabled={!resultFormat}
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                                                        >
                                                            <Icon name="copy" className="h-3.5 w-3.5"/>
                                                            {t('action.copy')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={resetAll}
                                                            title={t('action.clear')}
                                                            aria-label={t('action.clear')}
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-red-600 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-red-400"
                                                        >
                                                            <Icon name="trash" className="h-3.5 w-3.5"/>
                                                            {t('action.clear')}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-5 sm:p-6">
                                                    {resultFormat ? (
                                                        <pre
                                                            className="code-surface whitespace-pre-wrap break-words p-5 text-[13px] leading-6 text-zinc-800 dark:text-zinc-200">
                          {resultFormat}
                        </pre>
                                                    ) : (
                                                        <div
                                                            className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                                                            {t('result.noFormat')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}

                            <section className="mx-auto mt-16 max-w-5xl">
                                <div className="text-center">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                                        {t('steps.kicker')}
                                    </p>
                                    <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{t('steps.title')}</h2>
                                    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                                        {t('steps.subtitle')}
                                    </p>
                                </div>
                                <ol className="mt-8 grid gap-3 sm:grid-cols-3">
                                    {STEP_ITEMS.map((step, index) => (
                                        <li key={step.key} className="card p-5">
                                            <div className="flex items-center justify-between">
                    <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                      <Icon name={step.icon} className="h-4 w-4"/>
                    </span>
                                                <span
                                                    className="font-mono text-[11px] text-zinc-300 dark:text-zinc-600">0{index + 1}</span>
                                            </div>
                                            <h3 className="mt-4 text-sm font-semibold">{t(`steps.${step.key}.title`)}</h3>
                                            <p className="mt-1.5 text-xs leading-6 text-zinc-500 dark:text-zinc-400">
                                                {t(`steps.${step.key}.desc`)}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        </>
                    )}

                    <footer
                        className="mx-auto mt-14 flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 pt-5 text-[11px] text-zinc-400 dark:border-white/[0.06] dark:text-zinc-500">
                        <p>{t('footer.note')}</p>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.hash = '/status'
                                }}
                                className={`transition hover:text-indigo-600 dark:hover:text-indigo-300 ${
                                    isStatusPage ? 'text-indigo-600 dark:text-indigo-300' : ''
                                }`}
                            >
                                {t('footer.status')}
                            </button>
                            <span className="font-mono">v{VERSION}</span>
                        </div>
                    </footer>
                </main>
            </div>

            {settingsOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
                    <button
                        type="button"
                        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
                        onClick={() => setSettingsOpen(false)}
                        aria-label={t('action.close')}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('settings.title')}
                        className="rise card relative w-full max-w-md overflow-hidden bg-white/95 p-5 dark:bg-zinc-900/95"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold tracking-tight">{t('settings.title')}</h2>
                            <button
                                type="button"
                                onClick={() => setSettingsOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                                aria-label={t('action.close')}
                            >
                                <Icon name="x" className="h-4 w-4"/>
                            </button>
                        </div>

                        <div className="mt-5 space-y-5">
                            <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                    {t('settings.language')}
                                </p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {LANGUAGES.map((item) => {
                                        const active = language === item.code
                                        return (
                                            <button
                                                key={item.code}
                                                type="button"
                                                onClick={() => setLanguage(item.code)}
                                                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-[13px] transition ${
                                                    active
                                                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                                                        : 'border-zinc-200/80 text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <span>{item.label}</span>
                                                {active && <Icon name="check" className="h-3.5 w-3.5"/>}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                    {t('settings.theme')}
                                </p>
                                <div className="flex gap-1.5">
                                    {['light', 'dark', 'system'].map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setTheme(option)}
                                            className={`flex h-9 flex-1 items-center justify-center rounded-xl border text-[13px] transition ${
                                                theme === option
                                                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                                                    : 'border-zinc-200/80 text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            {t(`settings.theme.${option}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSettingsOpen(false)}
                                className="h-9 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                                {t('action.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
                    <div
                        className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-xl shadow-zinc-950/20 dark:bg-white dark:text-zinc-900">
                        <Icon name="check" className="h-4 w-4"/>
                        {toast}
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
