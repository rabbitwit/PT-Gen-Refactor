import {ensureArray, formatCharacters, page_parser} from "./helpers.js";

const MAX_WIDTH = 150;
const isValidArray = (arr) => Array.isArray(arr) && arr.length > 0;

/**
 * Processes person-related data fields (e.g., directors, actors) and formats them with labels.
 * Handles both array and string inputs, normalizing separators to " / ".
 * 处理人员相关数据字段（如导演、演员）并使用标签格式化。
 * 同时处理数组和字符串输入，将分隔符规范化为 " / "。
 *
 * @param {string|string[]} personData - The person data to process, can be array or delimited string (要处理的人员数据，可以是数组或分隔字符串)
 * @param {string} label - The field label (e.g., "Director", "Cast") (字段标签，如 "Director"、"Cast")
 * @returns {string|null} Formatted line with label and content, or null if empty (带有标签和内容的格式化行，如果为空则返回 null)
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
 * @param {string} text - The text content to wrap (要换行的文本内容)
 * @param {number} maxWidth - The maximum visual width for each line (每行的最大视觉宽度)
 * @param {string} indentString - The indentation string to prepend to each line (要添加到每行前面的缩进字符串)
 * @returns {string} The wrapped text with indentation applied to all lines (应用了缩进的换行后文本)
 */
const wrapTextWithIndent = (text, maxWidth, indentString) => {
    const indentWidth = getStringVisualLength(indentString);
    const contentWidth = maxWidth - indentWidth;

    if (contentWidth <= 0) {
        return indentString + text;
    }

    let lines = [];
    let currentLine = "";
    let currentLineWidth = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charWidth = getStringVisualLength(char);

        if (currentLineWidth + charWidth > contentWidth) {
            lines.push(indentString + currentLine);
            currentLine = char;
            currentLineWidth = charWidth;
        } else {
            currentLine += char;
            currentLineWidth += charWidth;
        }
    }

    if (currentLine) {
        lines.push(indentString + currentLine);
    }

    return lines.join("\n");
};

/**
 * Calculates the visual display width of a string, accounting for wide characters.
 * CJK characters and full-width symbols count as 2 units, while ASCII characters count as 1.
 * 计算字符串的视觉显示宽度，考虑宽字符。
 * 中日韩字符和全角符号计为 2 个单位，而 ASCII 字符计为 1 个单位。
 *
 * @param {string} str - The input string to measure (要测量的输入字符串)
 * @returns {number} The visual width of the string (字符串的视觉宽度)
 */
const getStringVisualLength = (str) => {
    let length = 0;
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);

        if (
            (charCode >= 0x4e00 && charCode <= 0x9fff) ||
            (charCode >= 0xff00 && charCode <= 0xffef) ||
            (charCode >= 0x3000 && charCode <= 0x303f) ||
            (charCode >= 0xfe30 && charCode <= 0xfe6f)
        ) {
            length += 2;
        } else {
            length += 1;
        }
    }
    return length;
}

/**
 * Formats a labeled line with word wrapping based on visual width.
 * Splits content by separator and wraps to new lines with proper indentation when exceeding max width.
 * 根据视觉宽度格式化带有标签的换行。
 * 按分隔符分割内容，并在超过最大宽度时换行并保持适当的缩进。
 *
 * @param {Object} options - The formatting options (格式化选项)
 * @param {string} options.label - The field label (e.g., "Director:") (字段标签，如 "Director：")
 * @param {string} options.content - The content to format (要格式化的内容)
 * @param {number} options.maxWidth - Maximum visual width per line (每行的最大视觉宽度)
 * @param {string} [options.separator=" / "] - The separator between items (项目之间的分隔符)
 * @returns {string} Formatted text with proper wrapping and indentation (带有适当换行和缩进的格式化文本)
 */
const formatWrappedLine = ({label, content, maxWidth, separator = " / "}) => {
    if (!content || content.trim() === "") {
        return label;
    }
    const items = content.split(separator);
    const labelVisualWidth = getStringVisualLength(label);
    const indentString = " ".repeat(labelVisualWidth);
    let lines = [];
    let currentLine = label;

    items.forEach((item, index) => {
        const itemVisualWidth = getStringVisualLength(item);
        const separatorVisualWidth = getStringVisualLength(separator);
        const currentLineVisualWidth = getStringVisualLength(currentLine);

        if (
            index > 0 &&
            currentLineVisualWidth + separatorVisualWidth + itemVisualWidth > maxWidth
        ) {
            lines.push(currentLine.trimEnd() + separator);
            currentLine = indentString + item;
        } else {
            if (index === 0) {
                currentLine += item;
            } else {
                currentLine += separator + item;
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
 * @param {string} reqText - The raw requirements text possibly containing HTML (可能包含 HTML 的原始要求文本)
 * @param {string} title - The section title to prepend (e.g., "System Requirements") (要前置的部分标题，如 "System Requirements")
 * @returns {string} Formatted requirements text with proper structure and wrapping (具有适当结构和换行的格式化要求文本)
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
    result.push(`❁ ${title}`);
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
 * @param {string} html - The HTML string to clean (要清理的 HTML 字符串)
 * @returns {string} The cleaned plain text with normalized line breaks (带有规范化换行的清理后的纯文本)
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
 * @param {string} text - The text content to wrap (要换行的文本内容)
 * @param {string} [indent="  "] - The indentation string for each line (每行的缩进字符串)
 * @param {number} [max=80] - Maximum character width per line (每行的最大字符宽度)
 * @returns {string} The wrapped text with newlines and indentation (带有换行和缩进的换行后文本)
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
 * @param {Object} data - The media data object containing Douban metadata (包含豆瓣元数据的媒体数据对象)
 * @returns {string} The formatted description string with BBCode tags and Chinese labels (带有 BBCode 标签和中文标签的格式化描述字符串)
 */
export const generateDoubanFormat = (data) => {
    const lines = [];
    if (data.poster) lines.push(`[img]${data.poster}[/img]\n`);

    if (data.chinese_title) {
        lines.push(`❁ 片　　名:　${data.chinese_title}`);
    } else if (data.foreign_title) {
        lines.push(`❁ 片　　名:　${data.foreign_title}`);
    }
    if (data.aka && data.aka.length)
        lines.push(`❁ 译　　名:　${data.aka.join(" / ").trim()}`);
    if (data.year) lines.push(`❁ 年　　代:　${data.year}`);
    if (data.region && data.region.length)
        lines.push(`❁ 产　　地:　${data.region.join(" / ")}`);
    if (data.genre && data.genre.length)
        lines.push(`❁ 类　　别:　${data.genre.join(" / ")}`);
    if (data.language && data.language.length)
        lines.push(`❁ 语　　言:　${data.language.join(" / ")}`);
    if (data.playdate && data.playdate.length)
        lines.push(`❁ 上映日期:　${data.playdate.join(" / ")}`);
    if (data.imdb_rating) lines.push(`❁ IMDb评分:　${data.imdb_rating}`);
    if (data.imdb_link) lines.push(`❁ IMDb链接:　${data.imdb_link}`);
    lines.push(`❁ 豆瓣评分:　${data.douban_rating}`);
    lines.push(`❁ 豆瓣链接:　${data.douban_link}`);
    if (data.episodes) lines.push(`❁ 集　　数:　${data.episodes}`);
    if (data.duration) lines.push(`❁ 片　　长:　${data.duration}`);
    if (data.director && data.director.length)
        lines.push(`❁ 导　　演:　${data.director.map((x) => x.name).join(" / ")}`);
    if (data.writer && data.writer.length) {
        const content = data.writer
            .map((x) => x.name)
            .join(" / ")
            .trim();
        lines.push(`❁ 编　　剧:　${content}`);
    }

    if (data.cast && data.cast.length) {
        const castNames = data.cast.map((x) => x.name).filter(Boolean);
        if (castNames.length) {
            lines.push(
                formatWrappedLine({
                    label: "❁ 主　　演:　",
                    content: castNames.join("\n　　　　　　　").trim(),
                    maxWidth: 100,
                })
            );
        }
    }

    if (data.tags && data.tags.length)
        lines.push(`\n❁ 标　　签:　${data.tags.join(" | ")}`);
    if (data.introduction) {
        lines.push(`\n❁ 简　　介\n`);
        lines.push(`　${data.introduction.replace(/\n/g, "\n　　")}`);
    }

    if (data.awards && Array.isArray(data.awards) && data.awards.length) {
        lines.push(`\n❁ 获奖情况\n`);
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
 * @param {Object} data - The media data object containing IMDb metadata (包含 IMDb 元数据的媒体数据对象)
 * @returns {string} The formatted description string with BBCode tags and English labels (带有 BBCode 标签和英文标签的格式化描述字符串)
 */
export const generateImdbFormat = (data) => {
    const lines = [];
    const releaseInfo = [];
    lines.push(`[img]${data.image ?? data.poster}[/img]\n`);
    if (data.original_title) {
        lines.push(`❁ Original Title:　${data.original_title}`);
    } else if (data.name) {
        lines.push(`❁ Original Title:　${data.name}`);
    }
    if (data.type && typeof data.type === 'string') {
        lines.push(`❁ Type:　${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`);
    }

    lines.push(`❁ Year:　${data.year}`);
    if (data.origin_country) {
        lines.push(`❁ Origin Country:　${data.origin_country.join(" / ")}`);
    }
    if (data.language) {
        lines.push(
            formatWrappedLine({
                label: "❁ Languages:　",
                content: data.languages.join(" / "),
                maxWidth: MAX_WIDTH,
            })
        );
    }

    lines.push(
        formatWrappedLine({
            label: "❁ Genres:　",
            content: data.genres.join(" / "),
            maxWidth: MAX_WIDTH,
        })
    );

    if (data.episodes && data.episodes > 0) {
        lines.push(`❁ Total Episodes:　${data.episodes}`);
        // 统计总季数
        if (data.seasons && Array.isArray(data.seasons)) {
            const totalSeasons = data.seasons.length;
            if (totalSeasons > 0) {
                lines.push(`❁ Total Seasons:　${totalSeasons}`);
            }
        }
    }

    if (data.type === "tv" && data.runtime) {
        lines.push(`❁ Episode Duration:　${data.runtime}`);
    } else if (data.runtime) {
        lines.push(`❁ Runtime:　${data.runtime}`);
    }

    lines.push(
        `❁ IMDb Rating:　${data.rating} / 10 from ${data?.["vote_count"]} users`
    );
    lines.push(`❁ IMDb Link:　${data.link}`);
    if (data.release_date) {
        const formattedDate = `${data.release_date.year}-${String(
            data.release_date.month
        ).padStart(2, "0")}-${String(data.release_date.day).padStart(2, "0")}`;
        const country = data.release_date.country || "";
        const dateWithCountry = country
            ? `${formattedDate} (${country})`
            : formattedDate;
        releaseInfo.push(dateWithCountry);
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
                const country = item.country || "Unknown";
                const releaseText = `${formattedDate} (${country})`;
                releaseInfo.push(releaseText);
            }
        });
    }

    if (releaseInfo.length > 0) {
        lines.push(`❁ Release Date:　${releaseInfo.join(" / ").trim()}`);
    }

    if (data.aka && data.aka.length) {
        const akaWithCountries = data.aka
            .map((item) => {
                if (typeof item === "string") return item;
                const title = item.title || "";
                const country = item.country || "";
                return country ? `${title} (${country})` : title;
            })
            .filter(Boolean);

        if (akaWithCountries.length > 0) {
            lines.push(
                formatWrappedLine({
                    label: "❁ Also Known As:　",
                    content: akaWithCountries.join(" / ").trim(),
                    maxWidth: MAX_WIDTH,
                })
            );
        }
    }

    if (data.keywords && data.keywords.length) {
        lines.push(
            formatWrappedLine({
                label: "❁ Keywords:　",
                content: data.keywords.join(" | ").trim(),
                maxWidth: MAX_WIDTH,
            })
        );
    }

    if (data.directors && data.directors.length) {
        const directors = Array.isArray(data.directors)
            ? data.directors
            : [data.directors];
        lines.push(
            `❁ Directors:　${directors
                .map((i) => i.name || i)
                .join(" / ")
                .trim()}`
        );
    }

    if (data.writers && data.writers.length) {
        const writers = Array.isArray(data.writers) ? data.writers : [data.writers];
        lines.push(
            `❁ Writers:　${writers
                .map((i) => i.name || i)
                .join(" / ")
                .trim()}`
        );
    }
    if (data.cast && data.cast.length) {
        lines.push(
            formatWrappedLine({
                label: "❁ Actors:　",
                content: data.cast
                    .map((i) => {
                        if (typeof i === "string") return i;
                        return i.name || "Unknown";
                    })
                    .join(" / ")
                    .trim(),
                maxWidth: 145,
            })
        );
    }

    if (data?.["plot"]) {
        lines.push(`
❁ Description　
　　${data?.["plot"].replace(/\n/g, "\n　　")}`);
    }

    return lines.join("\n").trim();
};

/**
 * Generates a formatted TMDb-style description string from media data object.
 * Differentiates between movies and TV series, displaying appropriate metadata for each type.
 * 从媒体数据对象生成格式化的 TMDb 风格描述字符串。
 * 区分电影和电视剧，为每种类型显示适当的元数据。
 *
 * @param {Object} data - The media data object containing TMDb metadata (包含 TMDb 元数据的媒体数据对象)
 * @returns {string} The formatted description string with BBCode tags and English labels (带有 BBCode 标签和英文标签的格式化描述字符串)
 */
export const generateTmdbFormat = (data) => {
    const lines = [];
    if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
    lines.push(`❁ Title:　${data.title || "N/A"}`);
    lines.push(`❁ Original Title:　${data.original_title || "N/A"}`);
    lines.push(
        `❁ Genres:　${data.genres && data.genres.length ? data.genres.join(" / ") : "N/A"
        }`
    );
    lines.push(
        `❁ Languages:　${data.languages && data.languages.length
            ? data.languages.join(" / ")
            : "N/A"
        }`
    );

    const isMovie =
        (data.release_date && !data.first_air_date) ||
        (data.tmdb_id &&
            typeof data.tmdb_id === "string" &&
            data.tmdb_id.includes("movie"));

    if (isMovie) {
        lines.push(`❁ Release Date:　${data.release_date || "N/A"}`);
        lines.push(`❁ Runtime:　${data.runtime || "N/A"}`);
    } else {
        lines.push(`❁ First Air Date:　${data.first_air_date || "N/A"}`);
        lines.push(`❁ Number of Episodes:　${data.number_of_episodes || "N/A"}`);
        lines.push(`❁ Number of Seasons:　${data.number_of_seasons || "N/A"}`);
        lines.push(`❁ Episode Runtime:　${data.episode_run_time || "N/A"}`);
    }

    lines.push(
        `❁ Production Countries:　${data.countries && data.countries.length
            ? data.countries.join(" / ")
            : "N/A"
        }`
    );
    lines.push(`❁ Rating:　${data.tmdb_rating || "N/A"}`);

    if (data.tmdb_id) {
        const mediaType = isMovie ? "movie" : "tv";
        const tmdbLink = `https://www.themoviedb.org/${mediaType}/${data.tmdb_id}/`;
        lines.push(`❁ TMDB Link:　${tmdbLink}`);
    }

    if (data.imdb_link) lines.push(`❁ IMDb Link:　${data.imdb_link}`);

    if (data.directors && data.directors.length) {
        const directorNames = data.directors
            .filter((d) => d && d.name)
            .map((d) => d.name)
            .join(" / ");
        if (directorNames) lines.push(`❁ Directors:　${directorNames}`);
    }

    if (data.producers && data.producers.length) {
        const producerNames = data.producers
            .filter((p) => p && p.name)
            .map((p) => p.name)
            .join(" / ");
        if (producerNames) lines.push(`❁ Producers:　${producerNames}`);
    }

    if (data.cast && data.cast.length) {
        lines.push("", "❁ Cast");
        const castLines = data.cast
            .filter((a) => a && a.name)
            .map((a) => `  ${a.name}${a.character ? " as " + a.character : ""}`)
            .slice(0, 15); // 限制显示数量
        lines.push(...castLines);
    }

    if (data.overview) {
        lines.push(
            "",
            "❁ Introduction",
            `　　${data.overview.replace(/\n/g, "\n  ")}`
        );
    }

    return lines.join("\n").trim();
};

/**
 * Generates a formatted Melon music album description string from album data object.
 * Includes poster, album info, artists, release details, description, and track listing.
 * 从专辑数据对象生成格式化的 Melon 音乐专辑描述字符串。
 * 包括海报、专辑信息、艺术家、发行详情、简介和曲目列表。
 *
 * @param {Object} data - The album data object containing Melon metadata (包含 Melon 元数据的专辑数据对象)
 * @returns {string} The formatted description string with BBCode tags and Chinese labels (带有 BBCode 标签和中文标签的格式化描述字符串)
 */
export const generateMelonFormat = (data) => {
    const lines = [];

    if (data.poster) {
        lines.push(`[img]${data.poster}[/img]\n`);
    }
    lines.push(`❁ 专辑名称:　${data.title || "N/A"}`);
    lines.push(`❁ 歌　　手:　${data.artists && data.artists.length ? data.artists.join(" / ") : "N/A"}`);
    lines.push(`❁ 发行日期:　${data.release_date || "N/A"}`);
    lines.push(`❁ 专辑类型:　${data.album_type || "N/A"}`);
    lines.push(`❁ 流　　派:　${data.genres && data.genres.length ? data.genres.join(" / ").trim() : "N/A"}`);
    lines.push(`❁ 发 行 商:　${data.publisher || "N/A"}`);
    lines.push(`❁ 制作公司:　${data.planning || "N/A"}`);
    lines.push(`❁ 专辑链接:　${data.melon_link}`);

    if (data.description) {
        lines.push("");
        lines.push("❁ 专辑介绍\n");
        lines.push(`　　${data.description.replace(/\n/g, "\n　　")}`);
    }
    if (data.tracks && data.tracks.length) {
        lines.push("");
        lines.push("❁ 歌曲列表\n");
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
 * @param {Object} data - The anime data object containing Bangumi metadata (包含 Bangumi 元数据的动画数据对象)
 * @returns {string} The formatted description string with BBCode tags and Chinese labels (带有 BBCode 标签和中文标签的格式化描述字符串)
 */
export const generateBangumiFormat = (data) => {
    if (!data || typeof data !== "object") return "";

    const lines = [];

    if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
    lines.push(`❁ 片　　名:　${data.name}`);
    lines.push(`❁ 中 文 名:　${data.name_cn}`);

    if (isValidArray(data.aka)) {
        lines.push(
            formatWrappedLine({
                label: "❁ 别　　名:　",
                content: data.aka.join(" / "),
                maxWidth: MAX_WIDTH,
            })
        );
    }

    if (data.type) lines.push(`❁ 类　　型:　${data.type}`);
    if (data.eps) lines.push(`❁ 话　　数:　${data.eps}`);
    if (data.date) lines.push(`❁ 首　　播:　${data.date}`);
    if (data.year) lines.push(`❁ 年　　份:　${data.year}年`);
    if (data.bgm_rating) lines.push(`❁ 评　　分:　${data.bgm_rating}`);
    lines.push(`❁ 链　　接:　${data.link}`);
    if (data.platform) lines.push(`❁ 播放平台:　${data.platform}`);

    if (isValidArray(data.tags)) {
        lines.push(
            formatWrappedLine({
                label: "❁ 标　　签:　",
                content: data.tags.join(" / "),
                maxWidth: MAX_WIDTH,
            })
        );
    }

    const directorLine = processPersonField(data.director, "❁ 导　　演:　");
    if (directorLine) lines.push(directorLine);

    const writerLine = processPersonField(data.writer, "❁ 脚　　本:　");
    if (writerLine) lines.push(writerLine);

    if (isValidArray(data.characters)) {
        const charList = formatCharacters(ensureArray(data.characters));
        const content = charList.slice(0, 20).join(" / ").trim();
        lines.push(
            formatWrappedLine({
                label: "❁ 角色信息:　",
                content,
                maxWidth: 125,
            })
        );
    }

    if (data.summary) {
        lines.push("", "❁ 简　　介", `  ${data.summary.replace(/\n/g, "\n  ")}`);
    }

    return lines.join("\n").trim();
};

/**
 * Generates a formatted Steam-style description string from game data object.
 * Includes header image, metadata, pricing, platforms, categories, synopsis, and system requirements.
 * 从游戏数据对象生成格式化的 Steam 风格描述字符串。
 * 包括头图、元数据、价格、平台、分类、简介和系统要求。
 *
 * @param {Object} data - The game data object containing Steam metadata (包含 Steam 元数据的游戏数据对象)
 * @returns {string} The formatted description string with BBCode tags and Chinese labels (带有 BBCode 标签和中文标签的格式化描述字符串)
 */
export const generateSteamFormat = (data) => {
    const lines = [];
    if (data.header_image) lines.push(`[img]${data.header_image}[/img]\n`);

    lines.push(`❁ 游戏名称:　${data.name}`);
    lines.push(`❁ 游戏类型:　${data.type}`);
    lines.push(`❁ 发行日期:　${data.release_date}`);

    if (data.developers && data.developers.length) {
        lines.push(`❁ 开 发 商:　${data.developers.join(", ")}`);
    }
    if (data.publishers && data.publishers.length) {
        lines.push(`❁ 发 行 商:　${data.publishers.join(", ")}`);
    }
    if (data.genres && data.genres.length) {
        lines.push(`❁ 游戏类型:　${data.genres.join(", ")}`);
    }
    if (data.supported_languages) {
        const cleanedLanguages = cleanHtml(data.supported_languages)
            .replace(/\*具有完全音频支持的语言.*/g, "")
            .trim();
        lines.push(`❁ 支持语言:　${cleanedLanguages}`);
    }

    if (data.price) {
        if (data.price.discount > 0 && data.price.initial) {
            lines.push(`❁ 原　　价:　${data.price.initial} ${data.price.currency}`);
            lines.push(
                `❁ 现　　价:　${data.price.final} ${data.price.currency} (折扣${data.price.discount}%)`
            );
        } else if (data.price.final) {
            lines.push(`❁ 价　　格:　${data.price.final} ${data.price.currency}`);
        }
    }

    if (data.platforms) {
        const platforms = [];
        if (data.platforms.windows) platforms.push("Windows");
        if (data.platforms.mac) platforms.push("Mac");
        if (data.platforms.linux) platforms.push("Linux");
        if (platforms.length) lines.push(`❁ 支持平台:　${platforms.join(", ")}`);
    }

    if (data.categories && data.categories.length) {
        lines.push(
            formatWrappedLine({
                label: "❁ 分类标签:　",
                content: data.categories.join(" / "),
                maxWidth: MAX_WIDTH,
            })
        );
    }

    lines.push(`❁ 链　　接:　https://store.steampowered.com/app/${data.sid}/`);
    if (data.about_the_game) {
        const INDENT = "　　";
        const BULLET = "· ";
        const $ = page_parser(data.about_the_game);

        $.root().find("h2, ul, p").before("<hr>");
        $.root()
            .find("br")
            .each(function () {
                const $this = $(this);
                let $next = $this.next();
                while ($next[0] && $next[0].type === "text" && !$next.text().trim()) {
                    $next = $next.next();
                }
                if ($next.is("br")) {
                    $this.replaceWith("<hr>");
                    $next.remove();
                }
            });

        lines.push("", "❁ 简　　介");
        const blocksHTML = $.root()
            .html()
            .split(/<hr\s*\/?>/);
        blocksHTML.forEach((blockHtml) => {
            const $block = page_parser(blockHtml);
            const blockText = $block.root().text().trim();

            if (!blockText) return;
            if ($block("h2").length > 0) {
                lines.push("");
                lines.push(INDENT + blockText);
            } else if ($block("ul").length > 0) {
                $block("li").each((i, li) => {
                    const liText = $(li).text().trim();
                    if (liText) {
                        lines.push(wrapTextWithIndent(liText, MAX_WIDTH, INDENT + BULLET));
                    }
                });
            } else {
                lines.push(wrapTextWithIndent(blockText, MAX_WIDTH, INDENT));
            }
        });

        if (lines[lines.length - 1].trim() !== "❁ 简　　介") {
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
        lines.push("❁ 游戏截图");
        for (const s of data.screenshots) {
            if (s.path_full) lines.push(`[img]${s.path_full}[/img]`);
        }
        lines.push("");
    }

    return lines.join("\n").trim();
};

/**
 * Formats game data into a non-cached Steam-style description text.
 * Parses detail strings to extract metadata and includes cover, languages, tags, synopsis, and screenshots.
 * 将游戏数据格式化为非缓存版的 Steam 风格描述文本。
 * 解析详情字符串以提取元数据，并包括封面、语言、标签、简介和截图。
 *
 * @param {Object} data - The game data object containing Steam metadata (包含 Steam 元数据的游戏数据对象)
 * @param {string} data.cover - The URL of the game cover image (游戏封面图片的 URL)
 * @param {string} data.name - The name of the game (游戏名称)
 * @param {string} data.detail - The game detail string (游戏详情字符串)
 * @param {string} data.language - The supported languages of the game (游戏支持的语言)
 * @param {string} data.tags - The game tags (游戏标签)
 * @param {string} data.steam_id - The Steam ID of the game (游戏 Steam ID)
 * @param {string} data.descr - The game description (游戏描述)
 * @param {string} data.sysreq - The system requirements of the game (游戏系统要求)
 * @param {string} data.screenshot - The URLs of the game screenshots (游戏截图的 URL)
 * @returns {string} The formatted Steam description text (格式化后的 Steam 描述文本)
 * @throws {Error} When input is not an object or is empty (当输入不是对象或为空时抛出错误)
 */
export const notCacheSteamFormat = (data) => {
    // 数据基本校验
    if (!data || typeof data !== "object") {
        throw new Error("Invalid input: expected an object.");
    }

    const lines = [];

    if (data.cover) lines.push(`[img]${data.cover}[/img]\n`);
    lines.push(`❁ 游戏名称:　${data.name}`);

    const DETAIL_KEYS_MAP = {
        "类型:": "type",
        "发行日期:": "release_date",
        "开发者:": "developer",
        "发行商:": "publisher",
    };

    const info = {
        type: "",
        release_date: "",
        developer: "",
        publisher: "",
    };

    const detailLines = data.detail ? data.detail.split("\n") : [];
    detailLines.forEach((line) => {
        for (const [prefix, key] of Object.entries(DETAIL_KEYS_MAP)) {
            if (line.startsWith(prefix)) {
                info[key] = line.slice(prefix.length).trim();
                break;
            }
        }
    });

    lines.push(`❁ 游戏类型:　${info.type}`);
    lines.push(`❁ 发行日期:　${info.release_date}`);
    lines.push(`❁ 开 发 商:　${info.developer}`);
    lines.push(`❁ 发 行 商:　${info.publisher}`);

    if (data.language && data.language.length > 0) {
        lines.push(`❁ 支持语言:　${data.language.join(" / ")}`);
    }

    if (data.tags && data.tags.length > 0) {
        lines.push(
            formatWrappedLine({
                label: "❁ 分类标签:　",
                content: data.tags.join(" / "),
                maxWidth: MAX_WIDTH,
            })
        );
    }

    lines.push(
        `❁ 链　　接:　https://store.steampowered.com/app/${data.steam_id}/`
    );

    if (data.descr) {
        lines.push(`
❁ 简　　介　
　　${data.descr.replace(/\n/g, "\n　　")}`);
    }

    if (data.sysreq && data.sysreq.length > 0) {
        lines.push(`\n❁ 配置要求\n${data.sysreq.join("\n")}`);
    }

    if (data.screenshot && data.screenshot.length > 0) {
        lines.push("\n❁ 游戏截图");
        data.screenshot.forEach((s) => {
            lines.push(`[img]${s}[/img]`);
        });
        lines.push("");
    }

    return lines.join("\n").trim();
};

/**
 * Formats IMDb data into a non-cached IMDb-style description text.
 * Uses safe accessors to handle nested properties and includes poster, metadata, cast, crew, and plot.
 * 将 IMDb 数据格式化为非缓存版的 IMDb 风格描述文本。
 * 使用安全访问器处理嵌套属性，并包括海报、元数据、演员、工作人员和剧情简介。
 *
 * @param {Object} data - The media data object containing IMDb metadata (包含 IMDb 元数据的媒体数据对象)
 * @param {string} data.genre - The genre of the media (媒体 genre)
 * @param {object} data.details - The details object containing IMDb metadata (包含 IMDb 元数据的详情对象)
 * @param {string} data.Language - The language of the media (媒体语言)
 * @param {object} data.duration - The duration of the media (媒体时长)
 * @param {array} data.keywords - The keywords of the media (媒体关键词)
 * @param {object} data.directors - The directors of the media (媒体导演)
 * @param {object} data.creators - The creators of the media (媒体作者)
 * @param {object} data.actors - The actors of the media (媒体演员)
 * @param {string} data.description - The description of the media (媒体简介)
 * @returns {string} The formatted IMDb description text (格式化后的 IMDb 描述文本)
 */
export const notCacheImdbFormat = (data) => {
    const lines = [];

    const safeGet = (obj, path, defaultValue = "") => {
        return (
            path.split(".").reduce((acc, part) => acc && acc[part], obj) ||
            defaultValue
        );
    };

    const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

    lines.push(`[img]${safeGet(data, "poster") || ""}[/img]\n`);
    lines.push(`❁ Original Title:　${safeGet(data, "name")}`);
    lines.push(`❁ Type:　${safeGet(data, "@type")}`);
    lines.push(`❁ Year:　${safeGet(data, "year")}`);

    const details = data.details || {};
    if (
        details["Country of origin"] &&
        safeArray(details["Country of origin"]).length > 0
    ) {
        lines.push(
            `❁ Origin Country:　${safeArray(details["Country of origin"]).join(
                " / "
            )}`
        );
    }

    if (data.genre && data.genre.length > 0) {
        lines.push(`❁ Genres:　${data.genre.join(" / ")}`);
    }

    if (details.Language && safeArray(details.Language).length > 0) {
        lines.push(`❁ Language:　${safeArray(details.Language).join(" / ")}`);
    }

    let durationStr = safeGet(data, "duration");
    if (data.duration !== null && durationStr !== null && durationStr !== undefined) {
        durationStr = durationStr.replace("PT", "").replace("H", "H ");
        lines.push(`❁ Runtime:　${durationStr}`);
    }

    lines.push(`❁ IMDb Rating:　${safeGet(data, "imdb_rating")}`);
    lines.push(`❁ IMDb Link:　${safeGet(data, "imdb_link")}`);
    lines.push(`❁ Release Date:　${safeGet(data, "datePublished")}`);

    if (
        details["Also known as"] &&
        safeArray(details["Also known as"]).length > 0
    ) {
        lines.push(
            `❁ Also Known As:　${safeArray(details["Also known as"]).join(" / ")}`
        );
    }

    const keywords = safeArray(data.keywords);
    if (keywords.length > 0) {
        lines.push(
            `❁ Keywords:　${keywords
                .map((k) => k.trim())
                .filter(Boolean)
                .join(" | ")}`
        );
    }

    const formatPeopleList = (peopleList) => {
        return safeArray(peopleList)
            .map((person) =>
                typeof person === "object" && person.name ? person.name : person
            )
            .filter(Boolean)
            .join(" / ")
            .trim();
    };

    if (data.directors && data.directors.length > 0) {
        lines.push(`❁ Directors:　${formatPeopleList(data.directors)}`);
    }

    if (data.creators && data.creators.length > 0) {
        lines.push(`❁ Writers:　${formatPeopleList(data.creators)}`);
    }

    if (data.actors && data.actors.length > 0) {
        lines.push(`❁ Actors:　${formatPeopleList(data.actors)}`);
    }

    if (data.description) {
        lines.push(`
❁ Plot　
　　${data.description.replace(/\n/g, "\n　　")}`);
    }

    return lines.join("\n").trim();
};

/**
 * Formats anime data into a non-cached Bangumi-style description text.
 * Includes cover, titles, broadcast info, ratings, staff, characters, and synopsis.
 * 将动画数据格式化为非缓存版的 Bangumi 风格描述文本。
 * 包括封面、标题、播出信息、评分、工作人员、角色和简介。
 *
 * @param {Object} data - The anime data object containing Bangumi metadata (包含 Bangumi 元数据的动画数据对象)
 * @returns {string} The formatted Bangumi description text, or empty string if input is invalid (格式化后的 Bangumi 描述文本，如果输入无效则返回空字符串)
 */
export const notCacheBangumiFormat = (data) => {
    if (!data || typeof data !== "object") return "";

    const lines = [];

    if (data.cover) lines.push(`[img]${data.cover}[/img]`, "");
    lines.push(`❁ 片　　名:　${data.name}`);
    lines.push(`❁ 中 文 名:　${data.name_cn}`);

    if (isValidArray(data.aka)) {
        lines.push(
            formatWrappedLine({
                label: "❁ 别　　名:　",
                content: data.aka.join(" / "),
                maxWidth: MAX_WIDTH,
            })
        );
    }

    if (data.eps) lines.push(`❁ 话　　数:　${data.eps}`);
    if (data.date) lines.push(`❁ 首　　播:　${data.date}`);
    if (data.year) lines.push(`❁ 年　　份:　${data.year}年`);

    if (data.rating && typeof data.rating === "object") {
        /** @namespace data.rating.score **/
        const score = data.rating.score ?? 0;
        const total = data.rating.total ?? 0;
        lines.push(`❁ 评　　分:　${score} / 10 from ${total} users`);
    }

    lines.push(`❁ 链　　接:　${data.alt}`);
    if (data.platform) lines.push(`❁ 播放平台:　${data.platform}`);

    const directorLine = processPersonField(data.director, "❁ 导　　演:　");
    if (directorLine) lines.push(directorLine);

    const writerLine = processPersonField(data.writer, "❁ 脚　　本:　");
    if (writerLine) lines.push(writerLine);

    const characters = formatCharacters(ensureArray(data.cast));
    if (isValidArray(characters)) {
        const content = characters.slice(0, 20).join(" / ").trim();
        lines.push(
            formatWrappedLine({
                label: "❁ 角色信息:　",
                content,
                maxWidth: 125,
            })
        );
    }

    /** @namespace data.story **/
    if (data.story) {
        lines.push("", "❁ 简　　介", `  ${data.story.replace(/\n/g, "\n  ")}`);
    }

    return lines.join("\n").trim();
};

/**
 * Generates a formatted Hongguo short drama description string from media data object.
 * Includes poster, title, genres, episode count, actors with roles, and synopsis.
 * 从媒体数据对象生成格式化的红果短剧描述字符串。
 * 包括海报、标题、类型、集数、带角色的演员和简介。
 *
 * @param {Object} data - The media data object containing Hongguo metadata (包含红果元数据的媒体数据对象)
 * @returns {string} The formatted Hongguo description text (格式化后的红果描述文本)
 */
export const generateHongguoFormat = (data) => {
    const lines = [];

    if (data.poster_url) {
        lines.push(`[img]${data.poster_url}[/img]`, "");
    }

    lines.push(`❁ 片　　名:　${data.chinese_title}`);

    if (isValidArray(data.genres)) {
        lines.push(`❁ 类　　别:　${data.genres.join(" / ")}`);
    }

    if (data.episodes) {
        lines.push(`❁ 集　　数:　${data.episodes}`);
    }

    /** @namespace actor.nickname **/
    /** @namespace actor.sub_title **/
    if (isValidArray(data.actors)) {
        const actorsFormatted = data.actors
            .map((actor) =>
                actor.sub_title
                    ? `${actor.nickname} (${actor.sub_title})`
                    : actor.nickname
            )
            .join(" / ");

        lines.push(`❁ 主　　演:　${actorsFormatted}`);
    }

    if (data.synopsis) {
        lines.push("❁ 简　　介", `    ${data.synopsis.replace(/\n/g, "\n\n    ")}`);
    }

    return lines.join("\n").trim();
};

/**
 * Generates a formatted QQ Music album description string from album data object.
 * Includes cover, album info, singers, metadata, description, and track listing with details.
 * 从专辑数据对象生成格式化的 QQ 音乐专辑描述字符串。
 * 包括封面、专辑信息、歌手、元数据、简介和带详情的曲目列表。
 *
 * @param {Object} data - The album data object containing QQ Music metadata (包含 QQ 音乐元数据的专辑数据对象)
 * @returns {string} The formatted QQ Music description text (格式化后的 QQ 音乐描述文本)
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
        lines.push(`❁ 专辑名称:　${data.name}`);
    }

    if (Array.isArray(data.singer) && data.singer.length > 0) {
        const singers = data.singer.map((s) => s.name).join(" / ");
        lines.push(`❁ 歌　　手:　${singers}`);
    }

    if (data.albumType) {
        lines.push(`❁ 专辑类型:　${data.albumType}`);
    }

    if (data.language) {
        lines.push(`❁ 语　　种:　${data.language}`);
    }

    if (data.company) {
        lines.push(`❁ 发行公司:　${data.company}`);
    }

    if (data.publishTime) {
        lines.push(`❁ 发行时间:　${data.publishTime}`);
    }

    if (data.desc) {
        lines.push(
            "",
            "❁ 专辑介绍:",
            `  ${data.desc.replace(/\n/g, "\n\n  ")}`,
            ""
        );
    }

    if (Array.isArray(data.songList) && data.songList.length > 0) {
        lines.push("\n❁ 歌曲列表");
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
 * @param {Object} data - The book data object containing Douban metadata (包含豆瓣元数据的书籍数据对象)
 * @returns {string} The formatted Douban book description text (格式化后的豆瓣图书描述文本)
 */
export const generateDoubanBookFormat = (data) => {
    if (!data || typeof data !== 'object') {
        return '';
    }

    const lines = [];

    if (data.poster) lines.push(`[img]${data.poster}[/img]`, '');

    lines.push(`❁ 书　　名:　${data.title}`);
    if (data.original_title) {
        lines.push(`❁ 原　　名:　${data.original_title}`);
    }

    if (Array.isArray(data.author) && data.author.length) {
        lines.push(`❁ 作　　者:　${data.author.join(' / ').trim()}`);
    }

    if (Array.isArray(data.translator) && data.translator.length) {
        lines.push(`❁ 翻　　译:　${data.translator.join(' / ').trim()}`);
    }

    if (data.publisher) lines.push(`❁ 出 版 社:　${data.publisher}`);
    if (data.year) lines.push(`❁ 出版日期:　${data.year}`);
    if (data.pages) lines.push(`❁ 页　　数:　${data.pages}`);
    if (data.pricing) lines.push(`❁ 定　　价:　${data.pricing}`);
    if (data.binding) lines.push(`❁ 装　　帧:　${data.binding}`);
    if (data.series) lines.push(`❁ 丛　　书:　${data.series}`);
    if (data.isbn) lines.push(`❁ I S B N:　${data.isbn}`);

    if (data.rating && data.votes) {
        lines.push(`❁ 豆瓣评分:　${data.rating} / 10 from ${data.votes} users`);
    }

    if (data.link) lines.push(`❁ 豆瓣链接:　${data.link}`);
    if (data.introduction) {
        let formattedIntro = data.introduction.replace(/\s{4,}/g, '\n\n');

        formattedIntro = formattedIntro
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => `    ${line}`)
            .join('\n\n');

        lines.push("\n❁ 简　　介\n", formattedIntro);
    }

    return lines.join("\n");
};

/**
 * Generates a formatted Trakt-style description string from media data object.
 * Differentiates between movies and TV shows, displaying appropriate metadata for each type.
 * 从媒体数据对象生成格式化的 Trakt 风格描述字符串。
 * 区分电影和电视剧，为每种类型显示适当的元数据。
 *
 * @param {Object} data - The media data object containing Trakt metadata (包含 Trakt 元数据的媒体数据对象)
 * @param {string} data.type - The type of media (媒体类型)
 * @param {string} data.title - The title of the media (媒体标题)
 * @param {string} data.year - The year of release (发行年份)
 * @param {string} data.poster - The URL of the poster image (海报图片的 URL)
 * @param {string} data.overview - The overview or plot summary (概述或情节摘要)
 * @param {string} data.country - The country of origin (原产地)
 * @param {string[]} data.language - The languages spoken in the media (媒体中口语的语言)
 * @param {string} data.certification - The certification or rating (认证或评级)
 * @param {string} data.rating_format - The rating format (评分格式)
 * @param {string} data.runtime - The runtime or duration of the media (媒体运行时间或时长)
 * @param {string} data.first_aired - The date the show was first aired (电视剧的初播日期)
 * @param {array} data.seasons - The number of seasons in the show (电视剧的季数)
 * @param {array} data.genres - The genres associated with the media (媒体关联的 genres)
 * @param {string} data.released - The date the show was first aired (电视剧的初播日期)
 * @param {string} data.rating - The rating of the media (媒体评分)
 * @param {string} data.imdb_link - The link to the IMDB page (IMDB 页面的链接)
 * @param {string} data.trakt_link - The link to the Trakt page (Trakt 页面的链接)
 * @param {string} data.tmdb_link - The link to the TMDB page (TMDB 页面的链接)
 * @param {string} data.tvdb_link - The link to the TVDB page (TVDB 页面的链接)
 * @param {array} data.people - The people involved in the media (媒体中涉及的人员)
 * @returns {string} The formatted Trakt description text (格式化后的 Trakt 描述文本)
 */
export const generateTraktFormat = (data) => {
    if (!data || typeof data !== 'object') {
        return '';
    }

    const lines = [];
    const isMovie = data.type === 'movie';
    const isShow = data.type === 'tv';

    lines.push(`[img]${data.poster}[/img]`, '');
    lines.push(`❁ Title:　${data.title}`);
    lines.push(`❁ Type:　${data.type}`);

    if (isMovie && data.year) {
        lines.push(`❁ Year:　${data.year}`);
    } else if (isShow && data.year) {
        lines.push(`❁ First Aired:　${data.year}`);
    }

    if (data.country) {
        lines.push(`❁ Country:　${data.country}`);
    }

    if (data.language) {
        lines.push(`❁ Languages:　${data.language.join(' / ')}`);
    }

    if (data.certification) {
        lines.push(`❁ Certification:　${data.certification}`);
    }

    if (isMovie && data.runtime) {
        lines.push(`❁ Runtime:　${data.runtime} minutes`);
    } else if (isShow && data.runtime) {
        lines.push(`❁ Episode Duration:　${data.runtime} minutes`);
    }

    if (isShow) {
        if (data.seasons && Array.isArray(data.seasons)) {
            const totalSeasons = data.seasons.length;
            const totalEpisodes = data.seasons.reduce((sum, season) => sum + (season.episodeCount || 0), 0);
            lines.push(`❁ Total Seasons:　${totalSeasons}`);
            lines.push(`❁ Total Episodes:　${totalEpisodes}`);
        }
    }

    if (isMovie && data.released) {
        lines.push(`❁ Released:　${data.released}`);
    } else if (isShow && data.first_aired) {
        lines.push(`❁ First Aired:　${data.first_aired}`);
    }

    if (data.rating) {
        lines.push(`❁ Rating:　${data.rating_format}`);
    }

    if (data.genres && Array.isArray(data.genres) && data.genres.length > 0) {
        lines.push(`❁ Genre:　${data.genres.join(' / ')}`);
    }

    if (data.imdb_link) {
        lines.push(`❁ IMDb Link:　${data.imdb_link}`);
    }
    if (data.trakt_link) {
        lines.push(`❁ Trakt Link:　${data.trakt_link}`);
    }

    if (data.tmdb_link) {
        lines.push(`❁ TMDB Link:　${data.tmdb_link}`);
    }

    if (data.tvdb_link) {
        lines.push(`❁ TVDB Link:　${data.tvdb_link}`);
    }

    if (data.people && data.people.directors && Array.isArray(data.people.directors) && data.people.directors.length > 0) {
        const directorLinks = data.people.directors.slice(0, 10).map(d => {
            return d.name;
        }).join(' / ');
        lines.push(`❁ Director:　${directorLinks}`);
    }

    if (data.people && data.people.writers && Array.isArray(data.people.writers) && data.people.writers.length > 0) {
        const writerLinks = data.people.writers.slice(0, 10).map(w => {
            return w.name;
        }).join(' / ');
        lines.push(`❁ Writers:　${writerLinks}`);
    }

    if (data.people && data.people.cast && Array.isArray(data.people.cast) && data.people.cast.length > 0) {
        const actors = data.people.cast.slice(0, 10).map(c => {
            return `${c.character ? `[${c.character}]` : ''} ${c.name}`;
        });
        lines.push(`❁ Actors:　${actors.join(' / ')}`);
    }

    if (data.overview) {
        const overview = data.overview.replace(/\n/g, '\n\n');
        lines.push('', '❁ Description', `  ${overview}`, '');
    }

    return lines.join('\n');
};
