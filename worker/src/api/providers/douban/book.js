import {
    NONE_EXIST_ERROR,
    ANTI_BOT_ERROR,
    NOT_FOUND_PATTERN,
} from "../../../core/constants.js";
import {isAntiBot, getDouBanHeaders} from "../../../core/config.js";
import {fetchWithTimeout} from "../../../utils/request.js";
import {page_parser, fetchAnchorText, parseJsonLd, safeExecuteProvider} from "../../../utils/helpers.js";
import logger from "../../../logger.js";

/**
 * Extracts field text content from the DOM based on a given selector.
 * This function attempts multiple ways to get text or link content associated with the label:
 * - First tries to find text nodes or links immediately after the label;
 * - If not found, looks for sibling or parent links;
 * - Finally falls back to processing plain text and cleaning up formatting.
 * 基于给定的选择器从 DOM 中提取字段文本内容。
 * 此函数尝试多种方法来获取与标签关联的文本或链接内容：
 * - 首先尝试查找标签后面的文本节点或链接；
 * - 如果未找到，则查找兄弟或父级链接；
 * - 最后回退到处理纯文本并清理格式。
 *
 * @param {cheerio} $ - Cheerio instance for DOM manipulation (用于 DOM 操作的 Cheerio 实例)
 * @param {string} selector - Selector string to locate the label element (定位标签元素的选择器字符串)
 * @returns {string} Extracted field text content, or empty string if failed (提取的字段文本内容，失败时返回空字符串)
 */
const fetchFieldText = ($, selector) => {
    try {
        const $label = $(selector);
        if (!$label.length) {
            return "";
        }

        const $parent = $label.parents().first();
        if (!$parent || !$parent.length) {
            return "";
        }

        const labelElement = $label[0];
        if (labelElement && labelElement.nextSibling && labelElement.nextSibling.nodeType === 3) {
            const nextText = labelElement.nextSibling.nodeValue?.trim();
            if (nextText === "" && labelElement.nextSibling.nextSibling) {
                const nextElement = $(labelElement.nextSibling.nextSibling);
                if (nextElement.is("a")) {
                    return nextElement.text().trim();
                }
            }
        }

        const $links = $label.siblings("a");
        if ($links.length > 0) {
            const texts = [];
            $links.each((_, element) => {
                const text = $(element).text().trim();
                if (text) texts.push(text);
            });
            return texts.join(" / ");
        }

        const $allLinks = $parent.find("a");
        if ($allLinks.length > 0) {
            const texts = [];
            $allLinks.each((_, element) => {
                const text = $(element).text().trim();
                if (text) texts.push(text);
            });
            return texts.join(" / ");
        }

        const nextSibling = labelElement ? labelElement.nextSibling : null;
        if (nextSibling && nextSibling.nodeType === 3) {
            let text = nextSibling.nodeValue?.trim();
            text = text?.replace(/^[:：\s]*/, "").trim();
            if (text) return text;
        }

        let fullText = $parent.text().replace(/\s+/g, " ").trim();
        const labelText = $label.text().trim();
        if (labelText && fullText) {
            fullText = fullText
                .replace(new RegExp(`${labelText}\\s*[:：]?\\s*`, "i"), "")
                .trim();
        }
        return fullText || "";
    } catch (error) {
        logger.warn(`Error fetching field with selector ${selector}:`, error);
        return "";
    }
};

/**
 * Extracts introduction content from the page.
 * Removes style and script tags, then cleans up whitespace for better readability.
 * 从页面中提取简介内容。
 * 移除 style 和 script 标签，然后清理空白字符以提高可读性。
 *
 * @param {cheerio} $ - Cheerio instance for DOM manipulation (用于 DOM 操作的 Cheerio 实例)
 * @returns {string} Cleaned introduction text content (清理后的简介文本内容)
 */
const extractIntroduction = ($) => {
    const $intro = $("#link-report > span.all.hidden, #link-report .intro").first();

    if (!$intro.length) {
        return "";
    }

    const $clone = $intro.clone();
    $clone.find("style, script").remove();

    return $clone.text()
        .trim()
        .replace(/\s+/g, ' ');
};

/**
 * Parses a string or number and returns the corresponding numeric value.
 * Handles both numeric and string inputs, with fallback to 0 for invalid values.
 * 解析字符串或数字并返回相应的数值。
 * 处理数字和字符串输入，对于无效值回退到 0。
 *
 * @param {string|number} value - The value to parse, can be a string or number (要解析的值，可以是字符串或数字)
 * @param {Function} [parser=parseInt] - Parsing function to use, defaults to parseInt (使用的解析函数，默认为 parseInt)
 * @returns {number} The parsed numeric value, or 0 if parsing fails (解析后的数值，解析失败时返回 0)
 */
const parseNumber = (value, parser = parseInt) => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = parser(value);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

/**
 * Extracts book information fields from the page.
 * Uses DOM selectors and JSON-LD data to gather metadata like translator, publisher, ISBN, etc.
 * 从页面中提取书籍信息字段。
 * 使用 DOM 选择器和 JSON-LD 数据收集元数据，如译者、出版社、ISBN 等。
 *
 * @param {cheerio} $ - Cheerio instance for DOM manipulation (用于 DOM 操作的 Cheerio 实例)
 * @param {Object} ldJson - JSON-LD data object containing structured metadata (包含结构化元数据的 JSON-LD 数据对象)
 * @returns {Object} Object containing extracted book information fields (包含提取的书籍信息字段的对象)
 * @property {string[]} translator - Array of translator names (sorted) (译者姓名数组，已排序)
 * @property {string} series - Series name string (丛书名称字符串)
 * @property {string} original_title - Original title text (原作名文本)
 * @property {string} publisher - Publisher name (出版社名称)
 * @property {string} year - Publication year (出版年份)
 * @property {string} pages - Number of pages (页数)
 * @property {string} pricing - Price information (价格信息)
 * @property {string} binding - Binding type (e.g., hardcover, paperback) (装帧类型，如精装、平装)
 * @property {string} isbn - ISBN identifier from JSON-LD or empty string (来自 JSON-LD 的 ISBN 标识符或空字符串)
 */
const extractBookFields = ($, ldJson) => {
    const getField = (selector) => fetchFieldText($, selector);
    const getAnchor = (selector) => fetchAnchorText($(selector));

    const translatorText = getField('#info span.pl:contains("译者")');

    return {
        translator: translatorText
            ? translatorText
                .split(" / ")
                .map((s) => s.trim())
                .filter(Boolean)
                .sort()
            : [],
        series: getField('#info span.pl:contains("丛书")'),
        original_title: getAnchor('#info span.pl:contains("原作名")'),
        publisher: getField('#info span.pl:contains("出版社")'),
        year: getAnchor('#info span.pl:contains("出版年")'),
        pages: getAnchor('#info span.pl:contains("页数")'),
        pricing: getAnchor('#info span.pl:contains("定价")'),
        binding: getAnchor('#info span.pl:contains("装帧")'),
        isbn: ldJson?.isbn || "",
    };
};

/**
 * Asynchronously fetches Douban book information and returns structured data.
 * Handles error cases including 404, anti-bot detection, and network failures.
 * Uses safeExecuteProvider for unified error handling.
 * 异步获取豆瓣图书信息并返回结构化数据。
 * 处理错误情况，包括 404、反机器人检测和网络故障。
 * 使用 safeExecuteProvider 进行统一的错误处理。
 *
 * @param {string} sid - Unique identifier (subject id) for the Douban book (豆瓣图书的唯一标识符（主题 ID）)
 * @param {Object} env - Environment configuration object used for building request headers and other operations (用于构建请求头和其他操作的环境配置对象)
 * @returns {Promise<Object>} Promise resolving to an object containing book information or error details (解析为包含图书信息或错误详情的对象的 Promise)
 */
export const gen_douban_book = async (sid, env) => {
    const data = {site: "douban_book", sid};

    if (!sid) {
        return {...data, error: "Invalid Douban Book id"};
    }

    return await safeExecuteProvider(async () => {
        const baseLink = `https://book.douban.com/subject/${encodeURIComponent(sid)}/`;
        const headers = getDouBanHeaders(env);

        const response = await fetchWithTimeout(baseLink, {headers});

        if (!response) {
            throw new Error("No response from Douban Book");
        }

        if (response.status === 404) {
            throw new Error(NONE_EXIST_ERROR);
        }

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            if (isAntiBot(text)) {
                throw new Error(ANTI_BOT_ERROR);
            }
            throw new Error(`Failed to fetch: ${response.status} ${text.slice(0, 200)}`);
        }

        const html = await response.text();

        if (NOT_FOUND_PATTERN.test(html)) {
            throw new Error(NONE_EXIST_ERROR);
        }

        if (isAntiBot(html)) {
            throw new Error(ANTI_BOT_ERROR);
        }

        const $ = page_parser(html);
        const ldJson = parseJsonLd($);
        const title = ldJson?.name || $('span[property="v:itemreviewed"]').text().trim();
        const cover = $("#mainpic a.nbg").attr("href");
        const rating = parseNumber(
            $('.rating_self strong[property="v:average"]').text().trim(),
            parseFloat,
        );
        const votes = parseNumber(
            $('.rating_self span[property="v:votes"]').text().trim(),
        );
        const introduction = extractIntroduction($);
        const author = ldJson?.author?.map((a) => a.name).sort() || [];
        const fields = extractBookFields($, ldJson);

        return {
            ...data,
            ...fields,
            title,
            poster: cover,
            author,
            rating,
            votes,
            introduction,
            link: baseLink,
            success: true,
        };
    }, "douban_book", sid);
};