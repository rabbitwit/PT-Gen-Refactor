export const AUTHOR = "Hares";
export const VERSION = "1.0.8";
export const NONE_EXIST_ERROR = "The corresponding resource does not exist.";
export const DEFAULT_TIMEOUT = 15000;
export const ANTI_BOT_PATTERNS =
    /验证码|检测到有异常请求|机器人程序|访问受限|请先登录/i;
export const NOT_FOUND_PATTERN = /你想访问的页面不存在/;
export const ANTI_BOT_ERROR = "Douban blocked request (captcha/anti-bot). Provide valid cookie or try later.";
export const DATA_SELECTOR = "script#__NEXT_DATA__";
export const activeAbortControllers = new Map();
export const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "false",
};
export const ROOT_PAGE_CONFIG = {
    HTML_TEMPLATE: `
<!DOCTYPE html>
<html lang="en">
<head>
    <title>PT-Gen - Generate PT Descriptions</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 12px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>PT-Gen API Service</h1>
        <p>这是一个媒体信息生成服务，支持从豆瓣、IMDb、TMDB、Bangumi等平台获取媒体信息。</p>
        <h2>更多信息</h2>
        <p>请访问<a href="https://github.com/rabbitwit/PT-Gen-Refactor" target="_blank" rel="noopener noreferrer">PT-Gen-Refactor</a>项目文档了解详细使用方法。</p>
        <p>__COPYRIGHT__</p>
    </div>
</body>
</html>`,
    API_DOC: {
        "API Status": "PT-Gen API Service is running",
        Endpoints: {
            "/": "API documentation (this page)",
            "/?source=[douban|imdb|tmdb|bgm|melon]&query=[name]":
                "Search for media by name",
            "/?url=[media_url]": "Generate media description by URL",
        },
        Notes:
            "Please use the appropriate source and query parameters for search, or provide a direct URL for generation.",
    },
};

export const DOUBAN_REQUEST_HEADERS_BASE = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Cache-control": "max-age=0",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "sec-ch-ua":
        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
};
