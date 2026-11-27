import {parseDocument} from 'htmlparser2'
import {getAttributeValue, textContent, getChildren} from 'domutils'
import type {AnyNode, Element} from 'domhandler'

export type {AnyNode, Element}

/**
 * 轻量 DOM 查询封装。
 *
 * 为什么不用 cheerio：cheerio 依赖 `node:stream`，无法打包进 Cloudflare Workers。
 *
 * 实现要点：所有查询都是**单次深度优先遍历**，复杂度 O(n)。
 * 早期版本在 `tag()` 里对每个节点重复调用 `getElementsByTagName`，
 * 在 11 万字符的豆瓣页面上退化成 O(n²)，单次解析要 14 秒；改成单遍遍历后降到几十毫秒。
 *
 * 语义：每次筛选都作用于"当前节点集及其后代"，因此 `$.select('div').class('x')`
 * 等价于"在所有 div 中（含自身）找带 class x 的元素"。
 */
export class DomQuery {
    constructor(private readonly nodes: AnyNode[]) {
    }

    static load(html: string): DomQuery {
        const doc = parseDocument(html, {decodeEntities: true})
        return new DomQuery(doc.children)
    }

    private static isElement(node: AnyNode): node is Element {
        const type = (node as Element).type
        return type === 'tag' || type === 'script' || type === 'style'
    }

    get length(): number {
        return this.nodes.length
    }

    /** 取第一个匹配元素作为新查询集 */
    first(): DomQuery {
        return new DomQuery(this.nodes.slice(0, 1))
    }

    /** 全部底层节点（调试用） */
    all(): AnyNode[] {
        return this.nodes
    }

    /** 按标签名筛选（含当前节点） */
    tag(name: string): DomQuery {
        return new DomQuery(this.search((el) => el.name === name))
    }

    /**
     * 按 class 筛选。
     *
     * @param className 单个或多个 class，用 `.` 分隔表示"必须全部命中"
     */
    class(className: string): DomQuery {
        const required = className.split('.').map((c) => c.trim()).filter(Boolean)
        if (required.length === 0) return new DomQuery([])

        return new DomQuery(
            this.search((el) => {
                const value = getAttributeValue(el, 'class')
                if (!value) return false
                const classes = value.split(/\s+/)
                return required.every((name) => classes.includes(name))
            }),
        )
    }

    /** 按 `[attr]` 或 `[attr="value"]` 筛选 */
    attr(expression: string): DomQuery {
        const match = expression.match(/^([\w:-]+)(?:\s*=\s*["']?([^"']*)["']?)?$/)
        if (!match) return new DomQuery([])
        const [, name, value] = match

        return new DomQuery(
            this.search((el) => {
                const actual = getAttributeValue(el, name)
                if (actual === undefined) return false
                return value === undefined ? true : actual === value
            }),
        )
    }

    /** 组合选择器：空格分隔，逐层向下收窄，例如 `div.tags-body a` */
    select(selector: string): DomQuery {
        let current: DomQuery = this
        for (const part of selector.trim().split(/\s+/)) {
            current = current.matchPart(part)
        }
        return current
    }

    private matchPart(part: string): DomQuery {
        const tagMatch = part.match(/^([a-zA-Z][\w-]*)/)
        const classMatches = [...part.matchAll(/\.([\w-]+)/g)].map((m) => m[1])
        const attrMatches = [...part.matchAll(/\[([^\]]+)]/g)].map((m) => m[1])

        // 单遍遍历一次完成标签 + class + 属性判断，避免多次 search
        const tagName = tagMatch?.[1]
        const requiredClasses = classMatches
        const attrs = attrMatches.map((expr) => {
            const m = expr.match(/^([\w:-]+)(?:\s*=\s*["']?([^"']*)["']?)?$/)
            return {name: m?.[1] ?? '', value: m?.[2]}
        })

        return new DomQuery(
            this.search((el) => {
                if (tagName && el.name !== tagName) return false
                if (requiredClasses.length > 0) {
                    const value = getAttributeValue(el, 'class')
                    if (!value) return false
                    const classes = value.split(/\s+/)
                    if (!requiredClasses.every((name) => classes.includes(name))) return false
                }
                for (const {name, value} of attrs) {
                    if (!name) continue
                    const actual = getAttributeValue(el, name)
                    if (actual === undefined) return false
                    if (value !== undefined && actual !== value) return false
                }
                return true
            }),
        )
    }

    /**
     * 单遍深度优先遍历：当前节点集 + 全部后代。
     *
     * `visited` 必不可少：同一个元素可能同时是多个当前节点的后代
     * （例如 `select('div')` 得到 65 个 div，其中嵌套关系会让内部 div 被重复访问），
     * 不记录就会把同一节点产出多次 —— 曾因此让 `div.hd` 的计数从 20 虚增到 120，
     * 奖项名称也被拼接了两遍。
     */
    private search(predicate: (el: Element) => boolean): AnyNode[] {
        const out: AnyNode[] = []
        const visited = new Set<AnyNode>()

        const walk = (nodes: AnyNode[]) => {
            for (const node of nodes) {
                if (!DomQuery.isElement(node)) continue
                if (visited.has(node)) continue
                visited.add(node)
                if (predicate(node)) out.push(node)
                walk(getChildren(node))
            }
        }

        walk(this.nodes)
        return out
    }

    /** 文本内容（递归拼接） */
    text(): string {
        return this.nodes.map((node) => textContent(node)).join('')
    }

    /** 去空白后的文本 */
    trimmedText(): string {
        return this.text().replace(/\s+/g, ' ').trim()
    }

    /** 属性值（取第一个命中的） */
    getAttr(name: string): string | undefined {
        for (const node of this.nodes) {
            if (!DomQuery.isElement(node)) continue
            const value = getAttributeValue(node, name)
            if (value !== undefined) return value
        }
        return undefined
    }

    /** 每个匹配元素映射成数组 */
    map<T>(fn: (item: DomQuery, index: number) => T): T[] {
        return this.nodes.map((node, index) => fn(new DomQuery([node]), index))
    }

    /** 每个匹配元素的文本 */
    texts(): string[] {
        return this.nodes.map((node) => textContent(node).replace(/\s+/g, ' ').trim())
    }

    /**
     * 取该节点之后的兄弟内容文本（豆瓣 `span.pl` 后的字段值）。
     *
     * 对应原实现的 `fetchAnchorText`，但补上两个原来漏掉的情况：
     * - 值直接是文本节点（`制片国家/地区: 美国 / 英国`）
     * - 值包在内联标签里（`片长: <span property="v:runtime">148分钟</span>`）
     *
     * 向后累积直到遇到 `<br>` 或下一个 `<span class="pl">`，二者代表字段结束。
     */
    nextSiblingText(): string {
        for (const node of this.nodes) {
            const parent = (node as { parent?: AnyNode }).parent
            if (!parent) continue
            const siblings = getChildren(parent)
            const index = siblings.indexOf(node)
            if (index < 0) continue

            const parts: string[] = []

            for (let i = index + 1; i < siblings.length; i++) {
                const sibling = siblings[i] as AnyNode & { type: string; data?: string; name?: string }

                if (sibling.type === 'text') {
                    const value = cleanDoubanText(sibling.data ?? '')
                    if (value) parts.push(value)
                    continue
                }

                if (sibling.type !== 'tag') continue

                if (sibling.name === 'br') break
                if (sibling.name === 'span' && String(getAttributeValue(sibling as Element, 'class') ?? '').includes('pl')) {
                    break
                }

                const value = cleanDoubanText(textContent(sibling))
                if (value) parts.push(value)
            }

            const joined = cleanDoubanText(parts.join(' '))
            if (joined) return joined
        }
        return ''
    }
}

/** 清洗豆瓣文本：合并空白、去掉开头冒号 */
export function cleanDoubanText(text: string): string {
    if (!text) return ''
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/^[:：]\s*/, '')
        .replace(/\n+/g, ' ')
        .trim()
}
