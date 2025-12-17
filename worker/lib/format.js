import { formatCharacters, ensureArray, safe } from "./utils.js";

const MAX_WIDTH = 150;
const isValidArray = (arr) => Array.isArray(arr) && arr.length > 0;

/**
 * 处理Bangumi导演脚本信息字段，将其格式化为带标签的文本行
 * @param {Array|string} personData - 人员数据，可以是数组或字符串格式
 * @param {string} label - 显示标签
 * @returns {string|null} 格式化后的文本行，如果内容为空则返回null
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
    ? formatWrappedLine({ label, content, maxWidth: MAX_WIDTH })
    : null;
};

/**
 * 将文本以固定缩进进行自动换行
 * @param {string} text - 需要换行的原始文本
 * @param {number} maxWidth - 每行的最大视觉宽度
 * @param {string} indentString - 应用于每一行开头的缩进字符串
 * @returns {string} - 格式化后、包含换行符的完整字符串
 */
const wrapTextWithIndent = (text, maxWidth, indentString) => {
  const indentWidth = getStringVisualLength(indentString);
  const contentWidth = maxWidth - indentWidth;

  // 如果可用内容宽度小于等于0，无法换行，直接返回缩进+文本
  if (contentWidth <= 0) {
    return indentString + text;
  }

  let lines = [];
  let currentLine = "";
  let currentLineWidth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charWidth = getStringVisualLength(char);

    // 如果当前字符加上后会超长
    if (currentLineWidth + charWidth > contentWidth) {
      lines.push(indentString + currentLine);
      currentLine = char; // 新的一行以这个字符开始
      currentLineWidth = charWidth;
    } else {
      // 否则，将字符添加到当前行
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
 * 计算字符串的视觉长度，其中中文字符和全角字符计为2个单位长度，英文字符和半角字符计为1个单位长度
 * @param {string} str - 需要计算长度的字符串
 * @returns {number} 字符串的视觉长度
 */
function getStringVisualLength(str) {
  let length = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    // 判断字符是否为宽字符（CJK字符、全角字符等）
    if (
      // CJK字符范围
      (charCode >= 0x4e00 && charCode <= 0x9fff) ||
      // 全角ASCII和片假名
      (charCode >= 0xff00 && charCode <= 0xffef) ||
      // CJK符号和标点
      (charCode >= 0x3000 && charCode <= 0x303f) ||
      // 全角形式
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
 * 将带标签的行格式化为自动换行并对齐的字符串
 * @param {object} options
 * @param {string} options.label - 标签文本，例如 "❁ 标签:"
 * @param {string} options.content - 内容文本
 * @param {number} options.maxWidth - 每行的最大视觉宽度
 * @param {string} [options.separator=' / '] - 内容项之间的分隔符
 * @returns {string} - 格式化后的完整字符串 (可能包含多行)
 */
function formatWrappedLine({ label, content, maxWidth, separator = " / " }) {
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
      // 保留分隔符在前一行
      lines.push(currentLine.trimEnd() + separator);
      currentLine = indentString + item;
    } else {
      // 第一项直接添加，后续项添加分隔符后再添加内容
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
 * 处理需求文本，将其格式化为带标题的结构化文本。
 * 主要功能包括清洗HTML、按行处理、识别并过滤特定标签（如配置要求）、
 * 并将剩余内容进行换行包装后输出。
 *
 * @param {string} reqText - 需要处理的原始需求文本，可能包含HTML标签
 * @param {string} title - 显示在结果最前面的标题内容
 * @returns {string} 格式化后的字符串，以标题开头，随后是处理过的内容，
 *                   每个段落之间用空行分隔；如果输入无效或无有效内容则返回空字符串
 */
const processRequirements = (reqText, title) => {
  // 类型保护
  if (typeof reqText !== "string") return "";
  if (!reqText) return "";

  const cleaned = cleanHtml(reqText);
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => Boolean(line));

  if (lines.length === 0) return "";

  const result = [];
  result.push(`❁ ${title}`);
  let buffer = [];

  // 扩展标签集合，包含中英文的最低配置与推荐配置关键词
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

  /**
   * 将缓冲区中的多行文本逐行进行换行包装，并加入到最终结果数组中
   * @param {string[]} bufLines - 要处理的文本行数组
   * @param {string} indent - 换行时使用的缩进，默认为四个空格
   * @param {number} max - 每行最大字符数限制，默认为80
   */
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

    // 过滤掉附注事项相关的内容
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
 * 清理HTML字符串，将其转换为纯文本
 * @param {string} html - 需要清理的HTML字符串
 * @returns {string} 清理后的纯文本字符串
 */
const cleanHtml = (html) => {
  if (!html) return "";
  let s = String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<\/?(?:strong|ul|li)[^>]*>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\r\n/g, "\n")
    .trim();
  return s;
};

/**
 * 将文本按指定宽度自动换行，并添加缩进
 * @param {string} text - 需要处理的文本内容
 * @param {string} [indent='  '] - 每行的缩进字符串，默认为两个空格
 * @param {number} [max=80] - 每行最大字符数，默认为80
 * @returns {string} 处理后的文本，包含适当的换行和缩进
 */
const wrapLines = (text, indent = "  ", max = 80) => {
  if (!text) return "";
  if (max <= 0) max = 80;
  if (indent.length >= max) indent = "  ";

  const words = String(text).split(/\s+/);
  let currentLine = indent;
  const lines = [];

  for (const word of words) {
    // 如果单个单词就超过行宽限制，强制放在新行
    if (word.length >= max - indent.length) {
      if (currentLine !== indent) {
        lines.push(currentLine);
      }
      lines.push(indent + word);
      currentLine = indent;
      continue;
    }

    // 检查是否需要换行
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
 * 根据豆瓣数据生成格式化文本
 * @param {Object} data - 豆瓣电影/电视剧数据对象
 * @returns {string} 格式化后的文本内容
 */
export const generateDoubanFormat = (data) => {
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]\n`);
  if (data.foreign_title) {
    lines.push(`❁ 片　　名:　${data.foreign_title}`);
  } else if (data.chinese_title) {
    lines.push(`❁ 片　　名:　${data.chinese_title}`);
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
          const festivalLine = `${index === 0 ? "" : "\n"}${
            awardBlock.festival
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
 * 根据IMDb数据生成格式化文本
 * @param {Object} data - IMDb电影/电视剧数据对象
 * @returns {string} 格式化后的文本内容
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

  lines.push(`❁ Type:　${data.type}`);
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
    lines.push(`❁ Episodes:　${data.episodes}`);
    if (data.seasons && data.seasons.length > 0) {
      lines.push(`❁ Seasons:　${data.seasons.join(" | ").trim()}`);
    }
  }

  lines.push(`❁ Runtime:　${data.runtime}`);
  lines.push(
    `❁ IMDb Rating:　${data.rating} / 10 from ${data.vote_count} users`
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
    // 构造包含国家信息的 AKA 字符串，格式为 "标题 (国家)"
    const akaWithCountries = data.aka
      .map((item) => {
        if (typeof item === "string") return item;
        const title = item.title || "";
        const country = item.country || "";
        // 如果有国家信息，则添加括号标注
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

  if (data.keywords) {
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

  if (data.plot) {
    lines.push(`
❁ Plot　
　　${data.plot.replace(/\n/g, "\n　　")}`);
  }

  return lines.join("\n").trim();
};

/**
 * 根据TMDB数据生成格式化文本
 * @param {Object} data - TMDB电影/电视剧数据对象
 * @returns {string} 格式化后的文本内容
 */
export const generateTmdbFormat = (data) => {
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
  lines.push(`❁ Title:　${data.title || "N/A"}`);
  lines.push(`❁ Original Title:　${data.original_title || "N/A"}`);
  lines.push(
    `❁ Genres:　${
      data.genres && data.genres.length ? data.genres.join(" / ") : "N/A"
    }`
  );
  lines.push(
    `❁ Languages:　${
      data.languages && data.languages.length
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
    `❁ Production Countries:　${
      data.countries && data.countries.length
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
 * 根据Melon数据生成格式化文本
 * @param {Object} data - Melon专辑数据对象
 * @returns {string} 格式化后的文本内容
 */
export const generateMelonFormat = (data) => {
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]\n`);
  lines.push(`❁ 专辑名称:　${data.title || "N/A"}`);
  lines.push(
    `❁ 歌　　手:　${
      data.artists && data.artists.length ? data.artists.join(" / ") : "N/A"
    }`
  );
  lines.push(`❁ 发行日期:　${data.release_date || "N/A"}`);
  lines.push(`❁ 专辑类型:　${data.album_type || "N/A"}`);
  lines.push(
    `❁ 流　　派:　${
      data.genres && data.genres.length ? data.genres.join(" / ").trim() : "N/A"
    }`
  );
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
 * 根据Steam数据生成格式化文本
 * @param {Object} data - Steam游戏数据对象
 * @returns {string} 格式化后的文本内容
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

    // 预处理部分保持不变
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
 * 将游戏数据格式化为非缓存版的 Steam 格式文本。
 *
 * @param {Object} data - 包含游戏信息的对象
 * @returns {string} 格式化后的 Steam 文本内容
 * @throws {Error} 当输入不是对象或为空时抛出错误
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
 * 将IMDb数据格式化为非缓存版的 IMDB 格式文本。
 *
 * @param {Object} data - 包含电影或剧集信息的数据对象
 * @returns {string} 格式化后的字符串，用于展示IMDb相关信息
 */
export const notCacheImdbFormat = (data) => {
  const lines = [];

  // 安全获取嵌套属性的方法
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
  if (durationStr !== null && durationStr !== undefined) {
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
 * 将番剧数据格式化为非缓存版的文本描述。
 *
 * @param {Object} data - 番剧数据对象
 * @returns {string} 格式化后的文本内容，如果输入无效则返回空字符串
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

  if (data.story) {
    lines.push("", "❁ 简　　介", `  ${data.story.replace(/\n/g, "\n  ")}`);
  }

  return lines.join("\n").trim();
};

/**
 * 生成红果短剧格式的文本内容
 * @param {Object} data - 包含影片信息的数据对象
 * @returns {string} 格式化后的红果格式文本
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
 * 生成QQ音乐专辑信息格式
 * @param {Object} data - QQ音乐专辑数据
 * @returns {string} 格式化后的文本
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
 * 根据提供的书籍数据生成符合豆瓣格式的文本描述。
 *
 * @param {Object} data - 包含书籍信息的对象
 * @returns {string} 格式化后的文本
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
  
  // 确保 author 是数组后再 join
  if (Array.isArray(data.author) && data.author.length) {
    lines.push(`❁ 作　　者:　${data.author.join(' / ').trim()}`);
  }
  
  // 确保 translator 存在且为数组
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
  
  // 确保评分和投票数都存在
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