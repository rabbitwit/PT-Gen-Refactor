// @ts-nocheck -- 1:1 port of the legacy formatter; rebuilt progressively in TS.
import {parseTimestampMs, toIso} from '../lib/time'
import {ensureArray, formatCharacters} from './helpers'

const MAX_WIDTH = 125;
const isValidArray = (arr) => Array.isArray(arr) && arr.length > 0;

/**
 * Flatten `{ data: {...fields} }` envelopes from external APIs / R2.
 * 把外部 API / R2 里 `{ data: {...字段} }` 的包一层结构摊平。
 * @param raw
 */
const unwrapMediaData = (raw) => {
    if (!raw || typeof raw !== "object") return raw || {};
    const inner = raw.data;
    if (
        inner &&
        typeof inner === "object" &&
        !Array.isArray(inner) &&
        (inner.introduction ||
            inner.plot ||
            inner.description ||
            inner.chinese_title ||
            inner.poster ||
            inner.name ||
            inner.imdb_rating ||
            inner.douban_rating)
    ) {
        return {...raw, ...inner};
    }
    return raw;
};

const COUNTRY_ALIASES = {
    USA: "United States",
    US: "United States",
    "United States of America": "United States",
    UK: "United Kingdom",
    "Great Britain": "United Kingdom",
    "Hong Kong SAR": "Hong Kong",
    "Hong Kong SAR China": "Hong Kong",
    "Taiwan, Province of China": "Taiwan",
};
const normalizeCountry = (value) => {
    const country = String(value ?? "").trim();
    return COUNTRY_ALIASES[country] || country;
};

const PREFERRED_COUNTRIES = ["United States", "United Kingdom", "Taiwan", "Hong Kong"];

/**
 * 发行日期 / 又名：先按重点国家排序（美国、英国、台湾、香港），再接其他国家，最多 5 条。
 * @param items
 * @param countryOf
 * @param [max=5]
 */
const selectPreferredCountries = (items, countryOf, max = 5) => {
    const preferred = new Map();
    const others = [];
    const seen = new Set();

    for (const item of items) {
        const country = normalizeCountry(countryOf(item));
        if (PREFERRED_COUNTRIES.includes(country)) {
            if (!preferred.has(country)) preferred.set(country, item);
            continue;
        }
        const key = country || "__unknown__";
        if (seen.has(key)) continue;
        seen.add(key);
        others.push(item);
    }

    const ordered = PREFERRED_COUNTRIES
        .map((country) => preferred.get(country))
        .filter(Boolean);

    return [...ordered, ...others].slice(0, max);
};

/**
 * Keep "8.2 / 10 from 79 users" even when the API only returns a number + votes.
 * 即使 API 只返回分数和票数，也保持 "8.2 / 10 from 79 users" 这种格式。
 * @param score
 * @param [votes]
 */
const formatTenScore = (score, votes) => {
    if (score == null || score === "") return "";
    const text = String(score).trim();
    if (!text) return "";
    if (/\/\s*10\s+from\s+/i.test(text)) return text;
    const voteText =
        votes != null && String(votes).trim() !== "" ? String(votes).trim() : "";
    const scoreOnly = text.replace(/\s*\/\s*10\s*$/i, "").trim();
    if (voteText) return `${scoreOnly} / 10 from ${voteText} users`;
    return text;
};

/**
 * 豆瓣演员条目：角色不为空时用半角括号附在姓名后；两字中文名中间补一个
 * 全角空格，让姓名整体占三字宽度，与三字姓名对齐。
 * Douban cast entry: append the character in half-width parentheses. Two-character
 * CJK names get a full-width space between the characters so the whole name
 * occupies the same width as a three-character name.
 * @param person
 */
const formatDoubanCast = (person) => {
    const rawName = String(person?.name || "").trim();
    if (!rawName) return "";
    const name = /^[\u4e00-\u9fff]{2}$/.test(rawName)
        ? `${rawName[0]}　${rawName[1]}`
        : rawName;
    const character = String(person?.character || "").trim();
    return character ? `${name} (${character})` : name;
};

/**
 * Processes person-related data fields (e.g., directors, actors) and formats them with labels.
 * Handles both array and string inputs, normalizing separators to " / ".
 * 处理人员相关数据字段（如导演、演员）并使用标签格式化。
 * 同时处理数组和字符串输入，将分隔符规范化为 " / "。
 *
 * @param personData - The person data to process, can be array or delimited string (要处理的人员数据，可以是数组或分隔字符串)
 * @param label - The field label (e.g., "Director", "Cast") (字段标签，如 "Director"、"Cast")
 * @returns Formatted line with label and content, or null if empty (带有标签和内容的格式化行，如果为空则返回 null)
 */
const processPersonField = (personData, label) => {
    let content = "";
    if (Array.isArray(personData)) {
        content = personData.join(" / ").trim();
    } else if (typeof personData === "string") {
        content = personData
            .split(/[、\/,]/)
            .map((p) => p.trim())
            .filter(Boolean)
            .join(" / ");
    }
    return content
        ? formatWrappedLine({label, content, maxWidth: MAX_WIDTH})
        : null;
};

/**
 * Wraps text to fit within a maximum width while applying consistent indentation to all lines.
 * Handles multi-byte characters by calculating visual width instead of character count.
 * 将文本换行以适应最大宽度，同时为所有行应用一致的缩进。
 * 通过计算视觉宽度而非字符数来处理多字节字符。
 *
 * @param text - The text content to wrap (要换行的文本内容)
 * @param maxWidth - The maximum visual width for each line (每行的最大视觉宽度)
 * @param indentString - The indentation string to prepend to each line (要添加到每行前面的缩进字符串)
 * @returns The wrapped text with indentation applied to all lines (应用了缩进的换行后文本)
 */
const wrapTextWithIndent = (text, maxWidth, indentString) => {
    const indentWidth = getStringVisualLength(indentString);
    const contentWidth = maxWidth - indentWidth;

    if (contentWidth <= 0) {
        return indentString + text;
    }

    const result = [];
    const paragraphs = String(text ?? "").replace(/\r\n/g, "\n").split("\n");

    for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
            result.push("");
            continue;
        }

        // 拉丁文按单词切，中文/日文/韩文按字切；这样英文不会被从单词中间截断。
        const tokens = paragraph.match(
            /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\ufe30-\ufe6f]|[^\s\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\ufe30-\ufe6f]+\s*/g,
        ) || [];
        let currentLine = "";
        let currentLineWidth = 0;

        const flush = () => {
            if (!currentLine) return;
            result.push(indentString + currentLine.trimEnd());
            currentLine = "";
            currentLineWidth = 0;
        };

        for (const token of tokens) {
            const tokenWidth = getStringVisualLength(token);
            if (currentLineWidth + tokenWidth <= contentWidth) {
                currentLine += token;
                currentLineWidth += tokenWidth;
                continue;
            }

            flush();

            if (tokenWidth <= contentWidth) {
                currentLine = token;
                currentLineWidth = tokenWidth;
                continue;
            }

            // 超长单词/URL 才退化为按字符硬切。
            for (const char of token) {
                const width = charVisualWidth(char.charCodeAt(0));
                if (currentLineWidth + width > contentWidth) {
                    result.push(indentString + currentLine);
                    currentLine = "";
                    currentLineWidth = 0;
                }
                currentLine += char;
                currentLineWidth += width;
            }
        }

        flush();
    }

    return result.join("\n");
};

/**
 * Calculates the visual display width of a string, accounting for wide characters.
 * CJK characters and full-width symbols count as 2 units, while ASCII characters count as 1.
 * 计算字符串的视觉显示宽度，考虑宽字符。
 * 中日韩字符和全角符号计为 2 个单位，而 ASCII 字符计为 1 个单位。
 *
 * @param charCode - The character code to measure (要测量的字符编码)
 * @returns The visual width of the string (字符串的视觉宽度)
 */
const charVisualWidth = (charCode) => (
    (charCode >= 0x1100 && charCode <= 0x115f) ||
    // 假名、注音、CJK 部首/笔画、CJK 统一表意文字、扩展 A、彝族文字等
    (charCode >= 0x2e80 && charCode <= 0xa4cf && charCode !== 0x303f) ||
    (charCode >= 0xac00 && charCode <= 0xd7a3) ||
    (charCode >= 0xf900 && charCode <= 0xfaff) ||
    (charCode >= 0xfe10 && charCode <= 0xfe19) ||
    (charCode >= 0xfe30 && charCode <= 0xfe6f) ||
    (charCode >= 0xff01 && charCode <= 0xff60) ||
    (charCode >= 0xffe0 && charCode <= 0xffe6) ||
    (charCode === 0x25c9)
        ? 2
        : 1
);

const DESCRIPTION_MAX_WIDTH = 110;
const LIST_MAX_WIDTH = 100;

/**
 * PT 站点常用中文标签由各中文格式（豆瓣 / Bangumi / Steam 等）直接写在模板里，
 * 这里只留英文源（IMDb / TMDb / Trakt）的字段标签。
 */

// ◉　 是东亚宽度 Ambiguous：CJK 字体下按 2 格渲染，站点字体若按 1 格渲染就改成 1。
const FIELD_MARKER = "◉　";
const FIELD_MARKER_WIDTH = 4;

const getStringVisualLength = (str) => {
    let length = 0;
    for (let i = 0; i < str.length; i++) {
        length += charVisualWidth(str.charCodeAt(i));
    }
    return length;
}

// 内部占位符：标签与值的分隔位置，以及续行的缩进标记。
const ENGLISH_INDENT = "\u0000";

/**
 * 英文源（IMDb / TMDb / Trakt）标签：`◉　` + 原字段名。
 * 字段名和值之间的分隔符是内部占位符，渲染前会换成空格补齐。
 * @param name
 */
const plainFieldLabel = (name) => `${FIELD_MARKER}${name}${ENGLISH_INDENT}`;

/**
 * 把英文标签补齐到最长的字段名，并把续行缩进对齐到值列。
 *
 * @param text 内部仍带 ENGLISH_INDENT 占位符的文本
 */
const alignEnglishFieldLabels = (text) => {
    const lines = String(text).split("\n");
    const markerLen = FIELD_MARKER.length;

    let maxNameWidth = 0;
    for (const line of lines) {
        if (line.startsWith(ENGLISH_INDENT)) continue;
        const index = line.indexOf(ENGLISH_INDENT);
        if (index > markerLen) {
            maxNameWidth = Math.max(maxNameWidth, index - markerLen);
        }
    }
    if (maxNameWidth === 0) return text;

    // `◉　` 计作 2 格：列宽必须按视觉格数算，否则续行会左偏一格。
    const keyWidth = FIELD_MARKER_WIDTH + maxNameWidth + 1;
    const indent = " ".repeat(keyWidth);
    return lines
        .map((line) => {
            if (line.startsWith(ENGLISH_INDENT)) {
                return indent + line.slice(ENGLISH_INDENT.length);
            }

            const index = line.indexOf(ENGLISH_INDENT);
            if (index <= 0) return line;

            const label = line.slice(0, index);
            const value = line.slice(index + ENGLISH_INDENT.length).trimStart();
            if (!value) return label;
            return label + " ".repeat(keyWidth - getStringVisualLength(label)) + value;
        })
        .join("\n");
};

/**
 * 演员条目：有角色时用半角括号附在姓名后。
 * @param person
 */
const formatEnglishActor = (person) => {
    if (person == null) return "";
    if (typeof person === "string") return person.trim();
    const name = String(person.name || person.person?.name || "").trim();
    if (!name) return "";
    const character = String(person.character ?? "").trim();
    return character ? `${name} (${character})` : name;
};

/**
 * Format a list field inline with `separator`, wrapping between items with an
 * indent so the alignment survives on the target site.
 * 列表字段用分隔符横向连接，续行使用缩进占位符。
 *
 * @param label
 * @param content
 * @param [separator=" / "]
 */
const formatEnglishList = (label, content, separator = " / ") => {
    const text = String(content).trim();
    if (!text) return label.trimEnd();

    return formatWrappedLine({
        label,
        content: text,
        maxWidth: LIST_MAX_WIDTH,
        separator,
        // 续行缩进在 alignEnglishFieldLabels 里按最终列宽统一替换。
        indent: ENGLISH_INDENT,
    });
};

/**
 * Build a hanging indent that occupies the same columns as `label`.
 * 生成与标签同宽的悬挂缩进，让换行后的内容和第一个值对齐。
 *
 * @param label
 */
const indentFromLabel = (label) =>
    Array.from(label, (ch) => {
        if (ch === " " || ch === "\t" || ch === "　") return ch;
        return charVisualWidth(ch.charCodeAt(0)) === 2 ? "　" : " ";
    }).join("");

/**
 * Formats a labeled line with word wrapping based on visual width.
 * Splits content by separator and wraps to new lines with proper indentation when exceeding max width.
 * 根据视觉宽度格式化带有标签的换行。
 * 按分隔符分割内容，并在超过最大宽度时换行并保持适当的缩进。
 *
 * @param options - The formatting options (格式化选项)
 * @param options.label - The field label (e.g., "Director:") (字段标签，如 "Director：")
 * @param options.content - The content to format (要格式化的内容)
 * @param options.maxWidth - Maximum visual width per line (每行的最大视觉宽度)
 * @param [options.separator=" / "] - The separator between items (项目之间的分隔符)
 * @param [options.indent] - 续行缩进；默认按标签宽度生成悬挂缩进
 * @returns Formatted text with proper wrapping and indentation (带有适当换行和缩进的格式化文本)
 */
const formatWrappedLine = ({label, content, maxWidth, separator = " / ", indent}) => {
    if (!content || content.trim() === "") {
        return label;
    }
    const items = content.split(separator);
    const labelVisualWidth = getStringVisualLength(label);
    const indentString = indent ?? indentFromLabel(label);
    const separatorVisualWidth = getStringVisualLength(separator);
    let lines = [];
    let currentLine = label;
    let currentLineVisualWidth = labelVisualWidth;

    items.forEach((item, index) => {
        const itemVisualWidth = getStringVisualLength(item);

        if (
            index > 0 &&
            currentLineVisualWidth + separatorVisualWidth + itemVisualWidth > maxWidth
        ) {
            // 换行处保留分隔符，否则续行条目会和上一行最后一项看起来连在一起。
            lines.push(currentLine.trimEnd() + separator.trimEnd());
            currentLine = indentString + item;
            currentLineVisualWidth = labelVisualWidth + itemVisualWidth;
        } else {
            if (index === 0) {
                currentLine += item;
                currentLineVisualWidth += itemVisualWidth;
            } else {
                currentLine += separator + item;
                currentLineVisualWidth += separatorVisualWidth + itemVisualWidth;
            }
        }
    });

    lines.push(currentLine);
    return lines.join("\n");
}

/**
 * Processes system requirements text by cleaning HTML, filtering labels, and formatting with word wrapping.
 * Extracts minimum and recommended configuration details while excluding additional notes.
 * 处理系统要求文本，通过清理 HTML、过滤标签并使用换行格式化。
 * 提取最低和推荐配置详情，同时排除附注事项。
 *
 * @param reqText - The raw requirements text possibly containing HTML (可能包含 HTML 的原始要求文本)
 * @param title - The section title to prepend (e.g., "System Requirements") (要前置的部分标题，如 "System Requirements")
 * @returns Formatted requirements text with proper structure and wrapping (具有适当结构和换行的格式化要求文本)
 */
const processRequirements = (reqText, title) => {
    if (typeof reqText !== "string" || !reqText) {
        return "";
    }

    const cleaned = cleanHtml(reqText);
    const lines = cleaned
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => Boolean(line));

    if (lines.length === 0) return "";

    const result = [];
    result.push(`◉　${title}`);
    let buffer = [];

    const labelSet = new Set([
        "minimum:",
        "recommended:",
        "minimum",
        "recommended",
        "最低配置:",
        "推荐配置:",
        "最低配置",
        "推荐配置",
    ]);

    const appendWrapped = (bufLines, indent = "    ", max = 80) => {
        for (let i = 0; i < bufLines.length; i++) {
            const line = bufLines[i];
            const wrapped = wrapLines(line, indent, max);
            if (Array.isArray(wrapped)) {
                result.push(...wrapped);
            } else {
                result.push(wrapped);
            }
        }
    };

    for (const rawLine of lines) {
        if (!rawLine) continue;
        const line = rawLine.trim();
        const lower = line.toLowerCase();

        if (labelSet.has(lower) || labelSet.has(line)) {
            if (buffer.length > 0) {
                appendWrapped(buffer);
                buffer = [];
            }
            continue;
        }

        if (/^(additional notes|附注事项|备注)[:：]?\s*/i.test(line)) {
            if (buffer.length > 0) {
                appendWrapped(buffer);
                buffer = [];
            }
            continue;
        }

        buffer.push(line);
    }

    if (buffer.length > 0) {
        appendWrapped(buffer);
    }

    result.push("");
    return result.join("\n");
};

/**
 * Strips HTML tags and decodes common HTML entities to produce plain text.
 * Converts <br> tags to newlines and removes formatting tags like <strong>, <ul>, <li>.
 * 剥离 HTML 标签并解码常见的 HTML 实体以生成纯文本。
 * 将 <br> 标签转换为换行符，并移除格式化标签如 <strong>、<ul>、<li>。
 *
 * @param html - The HTML string to clean (要清理的 HTML 字符串)
 * @returns The cleaned plain text with normalized line breaks (带有规范化换行的清理后的纯文本)
 */
const cleanHtml = (html) => {
    if (!html) {
        return "";
    }
    return String(html)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/<\/?(?:strong|ul|li)[^>]*>/gi, "")
        .replace(/<\/?[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/\r\n/g, "\n")
        .trim();
};

/**
 * Wraps text into multiple lines based on a maximum width constraint, applying indentation to each line.
 * Handles long words by placing them on their own line if they exceed the available width.
 * 根据最大宽度约束将文本换行为多行，并为每行应用缩进。
 * 如果长单词超出可用宽度，则将其单独放在一行。
 *
 * @param text - The text content to wrap (要换行的文本内容)
 * @param [indent="  "] - The indentation string for each line (每行的缩进字符串)
 * @param [max=80] - Maximum character width per line (每行的最大字符宽度)
 * @returns The wrapped text with newlines and indentation (带有换行和缩进的换行后文本)
 */
const wrapLines = (text, indent = "  ", max = 80) => {
    if (!text) {
        return "";
    }

    if (max <= 0) {
        max = 80;
    }

    if (indent.length >= max) {
        indent = "  ";
    }

    const words = String(text).split(/\s+/);
    let currentLine = indent;
    const lines = [];

    for (const word of words) {
        if (word.length >= max - indent.length) {
            if (currentLine !== indent) {
                lines.push(currentLine);
            }
            lines.push(indent + word);
            currentLine = indent;
            continue;
        }

        const separator = currentLine === indent ? "" : " ";
        if (currentLine.length + separator.length + word.length > max) {
            lines.push(currentLine);
            currentLine = indent + word;
        } else {
            currentLine += separator + word;
        }
    }

    if (currentLine !== indent) {
        lines.push(currentLine);
    }

    return lines.join("\n");
};

/**
 * Generates a formatted Douban-style description string from media data object.
 * Includes poster, titles, ratings, cast, crew, synopsis, and awards in a structured layout.
 * 从媒体数据对象生成格式化的豆瓣风格描述字符串。
 * 包括海报、标题、评分、演员、工作人员、简介和奖项的结构化布局。
 *
 * @param raw - The media data object containing Douban metadata (包含豆瓣元数据的媒体数据对象)
 * @returns The formatted description string with BBCode tags and Chinese labels (带有 BBCode 标签和中文标签的格式化描述字符串)
 */
export const generateDoubanFormat = (raw) => {
    const data = unwrapMediaData(raw);
    const lines = [];
    if (data.poster) lines.push(`[img]${data.poster}[/img]\n`);

    if (data.chinese_title) {
        lines.push(`◉　片　　名　${data.chinese_title}`);
    } else if (data.foreign_title) {
        lines.push(`◉　片　　名　${data.foreign_title}`);
    }
    if (data.aka && data.aka.length)
        lines.push(`◉　译　　名　${data.aka.join(" / ").trim()}`);
    if (data.year) lines.push(`◉　年　　代　${data.year}`);
    if (data.region && data.region.length)
        lines.push(`◉　产　　地　${data.region.join(" / ")}`);
    if (data.genre && data.genre.length)
        lines.push(`◉　类　　别　${data.genre.join(" / ")}`);
    if (data.language && data.language.length)
        lines.push(`◉　语　　言　${data.language.join(" / ")}`);
    if (data.duration) lines.push(`◉　片　　长　${data.duration}`);
    if (data.playdate && data.playdate.length)
        lines.push(`◉　上映日期　${data.playdate.join(" / ")}`);
    const imdbRating = formatTenScore(
        data.imdb_rating || data.imdb_rating_average,
        data.imdb_votes || data.imdb_vote_count,
    );
    // 只有存在 IMDb ID 时才输出评分；0.0（暂无评分）也保留
    if (data.imdb_id && imdbRating) {
        lines.push(`◉　IMDb评分　${imdbRating}`);
    }
    if (data.imdb_link) lines.push(`◉　IMDb链接　${data.imdb_link}`);
    const doubanRating = formatTenScore(
        data.douban_rating || data.douban_rating_average,
        data.douban_votes || data.votes,
    );
    lines.push(`◉　豆瓣评分　${doubanRating || data.douban_rating || ""}`);
    // 详情解析产出的是 `link`；旧版 Worker 用的是 `douban_link`，两者都要兼容
    const doubanLink = data.douban_link || data.link;
    if (doubanLink) lines.push(`◉　豆瓣链接　${doubanLink}`);
    if (data.tags && data.tags.length)
        lines.push(`◉　标　　签　${data.tags.slice(0, 5).join(" | ")}`);
    if (data.episodes) lines.push(`◉　集　　数　${data.episodes}`);
    if (data.director && data.director.length)
        lines.push(`◉　导　　演　${data.director.map((x) => x.name).join(" / ")}`);
    if (data.writer && data.writer.length) {
        const content = data.writer
            .map((x) => x.name)
            .join(" / ")
            .trim();
        lines.push(`◉　编　　剧　${content}`);
    }

    if (data.cast && data.cast.length) {
        const castNames = data.cast.map(formatDoubanCast).filter(Boolean);
        if (castNames.length) {
            lines.push(
                [
                    `◉　主　　演　${castNames[0]}`,
                    ...castNames.slice(1).map((name) => `　　　　　　　${name}`),
                ].join("\n"),
            );
        }
    }

    const introduction =
        data.introduction || data.summary || data.description || data.plot || "";
    if (introduction) {
        lines.push(`\n◉　简　　介\n`);
        lines.push(`　　${String(introduction).replace(/\n/g, "\n　　")}`);
    }

    if (data.awards && Array.isArray(data.awards) && data.awards.length) {
        lines.push(`\n◉　获奖情况\n`);
        const awardsLines = data.awards
            .map((awardBlock, index) => {
                if (typeof awardBlock === "string") {
                    return `　　${awardBlock}`;
                } else if (
                    awardBlock &&
                    awardBlock.festival &&
                    Array.isArray(awardBlock.awards)
                ) {
                    const festivalLine = `${index === 0 ? "" : "\n"}${awardBlock.festival
                    }`;
                    const awardsLines = awardBlock.awards.map((award) => `　　${award}`);
                    return [festivalLine, ...awardsLines].join("\n");
                }
                return "";
            })
            .filter((line) => line !== "");

        lines.push(awardsLines.join("\n"));
    }

    return lines.join("\n").trim();
};

/**
 * Generates a formatted IMDb-style description string from media data object.
 * Includes poster, titles, ratings, cast, crew, synopsis in a structured layout.
 * 从媒体数据对象生成格式化的 IMDb 风格描述字符串。
 * 包括海报、标题、评分、演员、工作人员、简介的结构化布局。
 *
 * @param raw - The media data object containing IMDb metadata (包含 IMDb 元数据的媒体数据对象)
 * @returns The formatted description string with BBCode tags and English labels (带有 BBCode 标签和英文标签的格式化描述字符串)
 */
export const generateImdbFormat = (raw) => {
    const data = unwrapMediaData(raw);
    const lines = [];
    const releaseInfo = [];
    const field = (name, content) => {
        if (content == null || String(content).trim() === "") return;
        lines.push(plainFieldLabel(name) + content);
    };
    const wrappedField = (name, content) => {
        if (content == null || String(content).trim() === "") return;
        lines.push(
            formatEnglishList(plainFieldLabel(name), String(content).trim()),
        );
    };

    lines.push(`[img]${data.image ?? data.poster}[/img]\n`);
    field("Title", data.original_title || data.name);
    if (data.type && typeof data.type === "string") {
        field("Type", data.type.charAt(0).toUpperCase() + data.type.slice(1));
    }

    field("Year", data.year);
    if (Array.isArray(data.origin_country) && data.origin_country.length) {
        field("Country", data.origin_country.join(" / "));
    }
    if (Array.isArray(data.languages) && data.languages.length) {
        wrappedField("Language", data.languages.join(" / "));
    }

    const genres = Array.isArray(data.genres)
        ? data.genres
        : Array.isArray(data.genre)
            ? data.genre
            : [];
    if (genres.length) {
        wrappedField("Genres", genres.join(" / "));
    }

    if (data.episodes && data.episodes > 0) {
        field("Episodes", data.episodes);
        if (data.seasons && Array.isArray(data.seasons) && data.seasons.length > 0) {
            field("Seasons", data.seasons.length);
        }
    }

    if (data.type === "tv" && data.runtime) {
        field("Duration", data.runtime);
    } else if (data.runtime) {
        field("Runtime", data.runtime);
    }

    const imdbRating = formatTenScore(
        data.rating ?? data.imdb_rating,
        data.vote_count ?? data.imdb_votes,
    );
    field("Rating", imdbRating);
    field("Link", data.link || data.imdb_link);
    if (data.release_date) {
        const formattedDate = `${data.release_date.year}-${String(
            data.release_date.month
        ).padStart(2, "0")}-${String(data.release_date.day).padStart(2, "0")}`;
        releaseInfo.push({
            date: formattedDate,
            country: normalizeCountry(data.release_date.country),
        });
    }

    if (data.release && data.release.length) {
        data.release.forEach((item) => {
            if (item.date) {
                let formattedDate = item.date;
                const dateMatch = item.date.match(/([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
                if (dateMatch) {
                    const [, monthStr, day, year] = dateMatch;
                    const months = {
                        January: "01",
                        February: "02",
                        March: "03",
                        April: "04",
                        May: "05",
                        June: "06",
                        July: "07",
                        August: "08",
                        September: "09",
                        October: "10",
                        November: "11",
                        December: "12",
                    };
                    const month = months[monthStr] || "01";
                    formattedDate = `${year}-${month}-${day.padStart(2, "0")}`;
                }
                releaseInfo.push({
                    date: formattedDate,
                    country: normalizeCountry(item.country),
                });
            }
        });
    }

    if (releaseInfo.length > 0) {
        const selected = selectPreferredCountries(
            releaseInfo,
            (item) => item.country,
            5,
        );
        wrappedField(
            "Released",
            selected
                .map((item) => item.country ? `${item.date} (${item.country})` : item.date)
                .join(" / "),
        );
    }

    if (data.aka && data.aka.length) {
        const akaEntries = data.aka
            .map((item) => {
                if (typeof item === "string") {
                    return {title: item, country: ""};
                }
                return {
                    title: item.title || "",
                    country: normalizeCountry(item.country),
                };
            })
            .filter((item) => item.title);

        const selected = selectPreferredCountries(akaEntries, (item) => item.country, 5);
        if (selected.length > 0) {
            wrappedField(
                "AKA",
                selected
                    .map((item) => item.country ? `${item.title} (${item.country})` : item.title)
                    .join(" / "),
            );
        }
    }

    if (data.keywords && data.keywords.length) {
        const keywords = Array.isArray(data.keywords) ? data.keywords : [data.keywords];
        wrappedField("Keywords", keywords.slice(0, 5).join(" | ").trim());
    }

    if (data.directors && data.directors.length) {
        const directors = Array.isArray(data.directors)
            ? data.directors
            : [data.directors];
        wrappedField(
            "Director",
            directors.map((i) => i.name || i).join(" / ").trim(),
        );
    }

    if (data.writers && data.writers.length) {
        const writers = Array.isArray(data.writers) ? data.writers : [data.writers];
        wrappedField(
            "Writer",
            writers.map((i) => i.name || i).join(" / ").trim(),
        );
    }
    if (data.cast && data.cast.length) {
        wrappedField(
            "Cast",
            data.cast.map(formatEnglishActor).filter(Boolean).join(" / ").trim(),
        );
    }

    const plot = data.plot || data.description || data.introduction;
    if (plot) {
        const descLabel = plainFieldLabel("Plot").trimEnd();
        lines.push(
            "",
            descLabel,
            "",
            wrapTextWithIndent(String(plot).trim(), DESCRIPTION_MAX_WIDTH, "　　"),
        );
    }

    return alignEnglishFieldLabels(lines.join("\n").trim());
};

/**
 * Generates a formatted TMDb description string from media data object.
 * TMDb 请求使用中文（zh-CN），输出使用与豆瓣一致的中文标签。
 *
 * @param raw - The media data object containing TMDb metadata (包含 TMDb 元数据的媒体数据对象)
 * @returns The formatted description string with BBCode tags and Chinese labels (带有 BBCode 标签和中文标签的格式化描述字符串)
 */
export const generateTmdbFormat = (raw) => {
    const data = unwrapMediaData(raw);
    const lines = [];
    const field = (label, content) => {
        if (content == null || String(content).trim() === "") return;
        lines.push(`◉　${label}　${String(content).trim()}`);
    };
    const withMinutes = (value) => {
        const text = String(value ?? "").trim();
        if (!text || text === "0") return "";
        return /^\d+(?:\s*\/\s*\d+)*$/.test(text) ? `${text}分钟` : text;
    };

    const isMovie =
        (data.release_date && !data.first_air_date) ||
        (data.tmdb_id &&
            typeof data.tmdb_id === "string" &&
            data.tmdb_id.includes("movie"));

    if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
    field("片　　名", data.title || data.original_title || "N/A");
    field("原　　名", data.original_title || "N/A");
    field("年　　代", data.year || "N/A");
    field(
        "产　　地",
        data.countries && data.countries.length
            ? data.countries.join(" / ")
            : "N/A",
    );
    field(
        "类　　别",
        data.genres && data.genres.length ? data.genres.join(" / ") : "N/A",
    );
    field(
        "语　　言",
        data.languages && data.languages.length
            ? data.languages.join(" / ")
            : "N/A",
    );

    if (isMovie) {
        field("上映日期", data.release_date || "N/A");
        field("片　　长", withMinutes(data.runtime) || "N/A");
    } else {
        field("首播日期", data.first_air_date || "N/A");
        field("集　　数", data.number_of_episodes || "N/A");
        field("季　　数", data.number_of_seasons || "N/A");
        field("单集片长", withMinutes(data.episode_run_time) || "N/A");
    }

    const imdbRating = formatTenScore(
        data.imdb_rating || data.imdb_rating_average,
        data.imdb_votes || data.imdb_vote_count,
    );
    if (data.imdb_id && imdbRating) {
        field("IMDb评分", imdbRating);
    }
    field("IMDb链接", data.imdb_link);

    field("TMDB评分", data.tmdb_rating || "0.0 / 10 from 0 users");

    if (data.tmdb_id) {
        const rawId = String(data.tmdb_id);
        const [typeFromId, ...idParts] = rawId.includes("/") ? rawId.split("/") : [];
        const mediaType = typeFromId || (isMovie ? "movie" : "tv");
        const mediaId = idParts.length ? idParts.join("/") : rawId;
        field(
            "TMDB链接",
            `https://www.themoviedb.org/${mediaType}/${mediaId}/`,
        );
    }

    if (data.directors && data.directors.length) {
        field(
            "导　　演",
            data.directors
                .filter((d) => d && d.name)
                .map((d) => d.name)
                .join(" / "),
        );
    }

    if (data.writers && data.writers.length) {
        field(
            "编　　剧",
            data.writers
                .filter((w) => w && w.name)
                .map((w) => w.name)
                .join(" / "),
        );
    }

    if (data.cast && data.cast.length) {
        const castNames = data.cast.slice(0, 15).map(formatDoubanCast).filter(Boolean);
        if (castNames.length) {
            lines.push(
                [
                    `◉　主　　演　${castNames[0]}`,
                    ...castNames.slice(1).map((name) => `　　　　　　　${name}`),
                ].join("\n"),
            );
        }
    }

    if (data.overview) {
        const overview = String(data.overview).trim();
        lines.push("", "◉　简　　介", "", `　　${overview.replace(/\n/g, "\n　　")}`);
    }

    return lines.join("\n").trim();
};

/**
 * Generates a formatted Melon music album description string from album data object.
 * Includes poster, album info, artists, release details, description, and track listing.
 * 从专辑数据对象生成格式化的 Melon 音乐专辑描述字符串。
 * 包括海报、专辑信息、艺术家、发行详情、简介和曲目列表。
 *
 * @param data - The album data object containing Melon metadata (包含 Melon 元数据的专辑数据对象)
 * @returns The formatted description string with BBCode tags and Chinese labels (带有 BBCode 标签和中文标签的格式化描述字符串)
 */
export const generateMelonFormat = (data) => {
    const lines = [];

    if (data.poster) {
        lines.push(`[img]${data.poster}[/img]\n`);
    }
    lines.push(`◉　专辑名称　${data.title || "N/A"}`);
    lines.push(`◉　歌　　手　${data.artists && data.artists.length ? data.artists.join(" / ") : "N/A"}`);
    lines.push(`◉　发行日期　${data.release_date || "N/A"}`);
    lines.push(`◉　专辑类型　${data.album_type || "N/A"}`);
    lines.push(`◉　评　　分　${data.rating || "N/A"}`);
    lines.push(`◉　流　　派　${data.genres && data.genres.length ? data.genres.join(" / ").trim() : "N/A"}`);
    lines.push(`◉　发行公司　${data.publisher || "N/A"}`);
    lines.push(`◉　制作公司　${data.planning || "N/A"}`);
    lines.push(`◉　专辑链接　${data.melon_link}`);

    if (data.description) {
        lines.push("");
        lines.push("◉　专辑介绍\n");
        lines.push(`　　${data.description.replace(/\n/g, "\n　　")}`);
    }
    if (data.tracks && data.tracks.length) {
        lines.push("");
        lines.push("◉　歌曲列表\n");
        data.tracks.forEach((t) => {
            const artists =
                t.artists && t.artists.length ? ` (${t.artists.join(", ")})` : "";
            lines.push(`　　${t.number || "-"}. ${t.title}${artists}`);
        });
    }

    return lines.join("\n").trim();
};

/**
 * Generates a formatted Bangumi-style description string from anime data object.
 * Includes poster, titles, broadcast info, ratings, staff, characters, and synopsis.
 * 从动画数据对象生成格式化的 Bangumi 风格描述字符串。
 * 包括海报、标题、播出信息、评分、工作人员、角色和简介。
 *
 * @param data - The anime data object containing Bangumi metadata (包含 Bangumi 元数据的动画数据对象)
 * @returns The formatted description string with BBCode tags and Chinese labels (带有 BBCode 标签和中文标签的格式化描述字符串)
 */
export const generateBangumiFormat = (data) => {
    if (!data || typeof data !== "object") return "";

    const lines = [];

    if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
    lines.push(`◉　片　　名　${data.name}`);
    lines.push(`◉　译　　名　${data.name_cn}`);

    if (isValidArray(data.aka)) {
        lines.push(
            formatWrappedLine({
                label: "◉　别　　名　",
                content: data.aka.join(" / "),
                maxWidth: MAX_WIDTH,
            })
        );
    }

    if (data.type) lines.push(`◉　类　　型　${data.type}`);
    if (data.eps) lines.push(`◉　话　　数　${data.eps}`);
    if (data.date) lines.push(`◉　首　　播　${data.date}`);
    if (data.year) lines.push(`◉　年　　份　${data.year}年`);
    if (data.bgm_rating) lines.push(`◉　评　　分　${data.bgm_rating}`);
    lines.push(`◉　链　　接　${data.link}`);
    if (data.platform) lines.push(`◉　播放平台　${data.platform}`);

    if (isValidArray(data.tags)) {
        lines.push(
            formatWrappedLine({
                label: "◉　标　　签　",
                content: data.tags.join(" / "),
                maxWidth: MAX_WIDTH,
            })
        );
    }

    const directorLine = processPersonField(data.director, "◉　导　　演　");
    if (directorLine) lines.push(directorLine);

    const writerLine = processPersonField(data.writer, "◉　脚　　本　");
    if (writerLine) lines.push(writerLine);

    if (isValidArray(data.characters)) {
        const charList = formatCharacters(ensureArray(data.characters));
        const content = charList.slice(0, 20).join(" / ").trim();
        lines.push(
            formatWrappedLine({
                label: "◉　角色信息　",
                content,
                maxWidth: 125,
            })
        );
    }

    if (data.summary) {
        lines.push("", "◉　简　　介", `　　${data.summary.replace(/\n/g, "\n　　")}`);
    }

    return lines.join("\n").trim();
};

/**
 * Generates a formatted Steam-style description string from game data object.
 * Includes header image, metadata, pricing, platforms, categories, synopsis, and system requirements.
 * 从游戏数据对象生成格式化的 Steam 风格描述字符串。
 * 包括头图、元数据、价格、平台、分类、简介和系统要求。
 *
 * @param data - The game data object containing Steam metadata (包含 Steam 元数据的游戏数据对象)
 * @returns The formatted description string with BBCode tags and Chinese labels (带有 BBCode 标签和中文标签的格式化描述字符串)
 */
export const generateSteamFormat = (data) => {
    const lines = [];
    if (data.header_image) lines.push(`[img]${data.header_image}[/img]\n`);

    lines.push(`◉　游戏名称　${data.name}`);
    // 上游 type 对普通游戏固定是 "game"，和下面的 genres 行重复且没有信息量；
    // DLC / demo 这类非常规条目仍然展示
    if (data.type && data.type !== 'game') {
        lines.push(`◉　条目类型　${data.type}`);
    }
    lines.push(`◉　发行日期　${data.release_date}`);

    if (data.developers && data.developers.length) {
        lines.push(`◉　开发公司　${data.developers.join(", ")}`);
    }
    if (data.publishers && data.publishers.length) {
        lines.push(`◉　发行公司　${data.publishers.join(", ")}`);
    }
    if (data.genres && data.genres.length) {
        lines.push(`◉　游戏类型　${data.genres.join(" / ")}`);
    }
    if (data.supported_languages) {
        const cleanedLanguages = cleanHtml(data.supported_languages)
            .replace(/\*具有完全音频支持的语言.*/g, "")
            .replace(/\*/g, "")
            .split(/[,，]/)
            .map((item) => item.trim())
            .filter(Boolean)
            .join(" / ");
        if (cleanedLanguages) lines.push(`◉　支持语言　${cleanedLanguages}`);
    }

    if (data.price) {
        if (data.price.discount > 0 && data.price.initial) {
            lines.push(`◉　原　　价　${data.price.initial} ${data.price.currency}`);
            lines.push(
                `◉　现　　价　${data.price.final} ${data.price.currency} (折扣${data.price.discount}%)`
            );
        } else if (data.price.final) {
            lines.push(`◉　价　　格　${data.price.final} ${data.price.currency}`);
        }
    }

    if (data.platforms) {
        const platforms = [];
        if (data.platforms.windows) platforms.push("Windows");
        if (data.platforms.mac) platforms.push("Mac");
        if (data.platforms.linux) platforms.push("Linux");
        if (platforms.length) lines.push(`◉　支持平台　${platforms.join(", ")}`);
    }

    if (data.categories && data.categories.length) {
        lines.push(
            formatWrappedLine({
                label: "◉　分类标签　",
                content: data.categories.slice(0, 5).join(" / "),
                maxWidth: MAX_WIDTH,
            })
        );
    }

    lines.push(`◉　链　　接　https://store.steampowered.com/app/${data.sid}/`);
    if (data.about_the_game) {
        const INDENT = "　　";
        const plain = data.about_the_game
            .replace(/<\/(h2|p|li|ul|div|ol)>/gi, "\n")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<li[^>]*>/gi, "· ")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">");
        const textLines = plain.split("\n").map((line) => line.trim()).filter(Boolean);

        if (textLines.length > 0) {
            lines.push("", "◉　简　　介");
            for (const line of textLines) {
                lines.push(wrapTextWithIndent(line, MAX_WIDTH, INDENT));
            }
            lines.push("");
        }
    }

    if (data.pc_requirements && data.pc_requirements.minimum) {
        lines.push(processRequirements(data.pc_requirements.minimum, "最低配置"));
    }
    if (data.pc_requirements && data.pc_requirements.recommended) {
        lines.push(
            processRequirements(data.pc_requirements.recommended, "推荐配置")
        );
    }

    if (data.screenshots && data.screenshots.length) {
        lines.push("◉　游戏截图");
        for (const s of data.screenshots) {
            if (s.path_full) lines.push(`[img]${s.path_full}[/img]`);
        }
        lines.push("");
    }

    return lines.join("\n").trim();
};

const formatHongguoScore = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "";
    return n.toFixed(1);
};

const formatHongguoCount = (value) => {
    const n = Number(String(value ?? "").replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) return "";
    if (n >= 100000000) return `${Number((n / 100000000).toFixed(1))}亿`;
    if (n >= 10000) return `${Number((n / 10000).toFixed(1))}万`;
    return String(Math.round(n));
};

/**
 * Generates a formatted Hongguo short drama description string from media data object.
 * Includes poster, title, genres, episode count, actors with roles, and synopsis.
 * 从媒体数据对象生成格式化的红果短剧描述字符串。
 * 包括海报、标题、类型、集数、带角色的演员和简介。
 *
 * @param data - The media data object containing Hongguo metadata (包含红果元数据的媒体数据对象)
 * @returns The formatted Hongguo description text (格式化后的红果描述文本)
 */
export const generateHongguoFormat = (data) => {
    const lines = [];

    if (data.poster_url) {
        lines.push(`[img]${data.poster_url}[/img]`, "");
    }

    lines.push(`◉　片　　名　${data.chinese_title}`);

    if (isValidArray(data.genres)) {
        lines.push(`◉　类　　别　${data.genres.join(" / ")}`);
    }

    const ratingText = formatHongguoScore(data.rating);
    if (ratingText) lines.push(`◉　评　　分　${ratingText}`);
    const likeText = formatHongguoCount(data.like_count);
    if (likeText) lines.push(`◉　点　　赞　${likeText}`);
    const favoriteText = formatHongguoCount(data.favorite_count);
    if (favoriteText) lines.push(`◉　收　　藏　${favoriteText}`);

    if (data.episodes) {
        lines.push(`◉　集　　数　${data.episodes}`);
    }
    if (isValidArray(data.actors)) {
        const actorsFormatted = data.actors
            .map((actor) =>
                actor.sub_title
                    ? `${actor.nickname} (${actor.sub_title})`
                    : actor.nickname
            )
            .join(" / ");

        lines.push(`◉　主　　演　${actorsFormatted}`);
    }

    if (data.synopsis) {
        lines.push("◉　简　　介", `　　${data.synopsis.replace(/\n/g, "\n　　")}`);
    }

    return lines.join("\n").trim();
};

/**
 * Generates a formatted QQ Music album description string from album data object.
 * Includes cover, album info, singers, metadata, description, and track listing with details.
 * 从专辑数据对象生成格式化的 QQ 音乐专辑描述字符串。
 * 包括封面、专辑信息、歌手、元数据、简介和带详情的曲目列表。
 *
 * @param data - The album data object containing QQ Music metadata (包含 QQ 音乐元数据的专辑数据对象)
 * @returns The formatted QQ Music description text (格式化后的 QQ 音乐描述文本)
 */
export const generateQQMusicFormat = (data) => {
    if (!data || typeof data !== "object") {
        return "";
    }

    const lines = [];

    if (data.cover) {
        lines.push(`[img]${data.cover}[/img]`, "");
    }

    if (data.name) {
        lines.push(`◉　专辑名称　${data.name}`);
    }

    if (Array.isArray(data.singer) && data.singer.length > 0) {
        const singers = data.singer.map((s) => s.name).join(" / ");
        lines.push(`◉　歌　　手　${singers}`);
    }

    if (data.albumType) {
        lines.push(`◉　专辑类型　${data.albumType}`);
    }

    if (data.language) {
        lines.push(`◉　语　　种　${data.language}`);
    }

    if (data.company) {
        lines.push(`◉　发行公司　${data.company}`);
    }

    if (data.publishTime) {
        lines.push(`◉　发行时间　${data.publishTime}`);
    }

    if (data.desc) {
        lines.push(
            "",
            "◉　专辑介绍",
            `  ${data.desc.replace(/\n/g, "\n\n  ")}`,
            ""
        );
    }

    if (Array.isArray(data.songList) && data.songList.length > 0) {
        lines.push("\n◉　歌曲列表");
        data.songList.forEach((song, index) => {
            const singerNames =
                Array.isArray(song.singer) && song.singer.length > 0
                    ? song.singer.map((s) => s.name).join(" / ")
                    : "";

            lines.push(
                `　${(index + 1).toString().padStart(2, " ")}\. ${song.name}` +
                (song.sub_name ? ` (${song.sub_name})` : "") +
                (singerNames ? ` - ${singerNames}` : "") +
                (song.playTime ? ` [${song.playTime}]` : "")
            );
        });
    }

    return lines.join("\n");
};

/**
 * Generates a formatted Douban book description string from book data object.
 * Includes cover, titles, authors, translators, publication details, ratings, and introduction.
 * 从书籍数据对象生成格式化的豆瓣图书描述字符串。
 * 包括封面、标题、作者、译者、出版详情、评分和简介。
 *
 * @param data - The book data object containing Douban metadata (包含豆瓣元数据的书籍数据对象)
 * @returns The formatted Douban book description text (格式化后的豆瓣图书描述文本)
 */
export const generateDoubanBookFormat = (data) => {
    if (!data || typeof data !== 'object') {
        return '';
    }

    const lines = [];

    if (data.poster) lines.push(`[img]${data.poster}[/img]`, '');

    lines.push(`◉　书　　名　${data.title}`);
    if (data.original_title) {
        lines.push(`◉　原　　名　${data.original_title}`);
    }

    if (Array.isArray(data.author) && data.author.length) {
        lines.push(`◉　作　　者　${data.author.join(' / ').trim()}`);
    }

    if (Array.isArray(data.translator) && data.translator.length) {
        lines.push(`◉　翻　　译　${data.translator.join(' / ').trim()}`);
    }

    if (data.publisher) lines.push(`◉　出版公司　${data.publisher}`);
    if (data.year) lines.push(`◉　出版日期　${data.year}`);
    if (data.pages) lines.push(`◉　页　　数　${data.pages}`);
    if (data.pricing) lines.push(`◉　定　　价　${data.pricing}`);
    if (data.binding) lines.push(`◉　装　　帧　${data.binding}`);
    if (data.series) lines.push(`◉　丛　　书　${data.series}`);
    if (data.isbn) lines.push(`◉　书　　号　${data.isbn}`);

    if (data.rating && data.votes) {
        lines.push(`◉　豆瓣评分　${data.rating} / 10 from ${data.votes} users`);
    }

    if (data.link) lines.push(`◉　豆瓣链接　${data.link}`);
    if (data.introduction) {
        const formattedIntro = String(data.introduction)
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => `　　${line}`)
            .join('\n\n');

        lines.push("\n◉　简　　介\n", formattedIntro);
    }

    return lines.join("\n");
};

/**
 * Normalize a Trakt date-like value to YYYY-MM-DD.
 * 将 Trakt 日期值规范化为 YYYY-MM-DD。
 *
 * @param value - Date string or Date-compatible value
 * @returns ISO date slice, original text if unparsable, or empty string
 */
const formatTraktDate = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const ms = parseTimestampMs(raw);
    return ms === null ? raw : toIso(ms).slice(0, 10);
};

const capitalizeWords = (value) =>
    String(value).replace(/(^|[\s-])([a-z])/g, (_, separator, char) =>
        separator + char.toUpperCase(),
    );

/**
 * Generates a formatted Trakt-style description string from media data object.
 * Differentiates between movies and TV shows, displaying appropriate metadata for each type.
 * 从媒体数据对象生成格式化的 Trakt 风格描述字符串。
 * 区分电影和电视剧，为每种类型显示适当的元数据。
 *
 * @param raw - The media data object containing Trakt metadata (包含 Trakt 元数据的媒体数据对象)
 * @returns The formatted Trakt description text (格式化后的 Trakt 描述文本)
 */
export const generateTraktFormat = (raw) => {
    if (!raw || typeof raw !== 'object') {
        return '';
    }

    const data = unwrapMediaData(raw);
    const lines = [];
    const isMovie = data.type === 'movie';
    const isShow = data.type === 'tv' || data.type === 'show';
    const field = (name, content) => {
        if (content == null || String(content).trim() === '') return;
        lines.push(plainFieldLabel(name) + content);
    };
    const listField = (name, content, separator = ' / ') => {
        if (content == null || String(content).trim() === '') return;
        lines.push(
            formatEnglishList(plainFieldLabel(name), String(content).trim(), separator),
        );
    };
    const personName = (person) =>
        typeof person === 'string'
            ? person.trim()
            : String(person?.name ?? person?.person?.name ?? '').trim();

    if (data.poster) lines.push(`[img]${data.poster}[/img]`, '');
    field('Title', data.title);
    field('Type', isMovie ? 'Movie' : isShow ? 'TV Show' : data.type);

    if (isMovie && data.year) {
        field('Year', data.year);
    }

    field('Country', data.country);

    if (Array.isArray(data.language) && data.language.length) {
        listField('Language', data.language.join(' / '));
    }

    field('Cert', data.certification);

    if (isMovie && data.runtime) {
        field('Runtime', `${data.runtime} minutes`);
    } else if (isShow && data.runtime) {
        field('Duration', `${data.runtime} minutes`);
    }

    if (isShow) {
        const seasons = Array.isArray(data.seasons)
            ? data.seasons.filter((season) => Number(season?.number) > 0)
            : [];
        const totalSeasons = seasons.length;
        const totalEpisodes =
            seasons.reduce((sum, season) => sum + (Number(season.episodeCount) || 0), 0) ||
            Number(data.aired_episodes) ||
            0;
        if (totalSeasons > 0) field('Seasons', totalSeasons);
        if (totalEpisodes > 0) field('Episodes', totalEpisodes);
    }

    if (isMovie && data.released) {
        field('Released', formatTraktDate(data.released));
    } else if (isShow && (data.first_aired || data.year)) {
        field('Aired', formatTraktDate(data.first_aired) || data.year);
    }

    if (data.rating) {
        field('Rating', data.rating_format || data.rating);
    }

    if (Array.isArray(data.genres) && data.genres.length > 0) {
        listField('Genres', data.genres.map(capitalizeWords).join(' / '));
    }

    field('IMDb', data.imdb_link);
    field('Trakt', data.trakt_link);
    field('TMDB', data.tmdb_link);
    field('TVDB', data.tvdb_link);

    if (Array.isArray(data.people?.directors) && data.people.directors.length > 0) {
        listField('Director', data.people.directors.map(personName).filter(Boolean).join(' / '));
    }

    if (Array.isArray(data.people?.writers) && data.people.writers.length > 0) {
        listField('Writer', data.people.writers.map(personName).filter(Boolean).join(' / '));
    }

    if (Array.isArray(data.people?.cast) && data.people.cast.length > 0) {
        const actors = data.people.cast
            .slice(0, 10)
            .map(formatEnglishActor)
            .filter(Boolean);
        if (actors.length) {
            listField('Cast', actors.join(' / '));
        }
    }

    if (data.overview) {
        const descLabel = plainFieldLabel('Plot').trimEnd();
        const overview = String(data.overview).trim();
        lines.push(
            '',
            descLabel,
            '',
            wrapTextWithIndent(overview, DESCRIPTION_MAX_WIDTH, '　　'),
        );
    }

    return alignEnglishFieldLabels(lines.join('\n').trim());
};
