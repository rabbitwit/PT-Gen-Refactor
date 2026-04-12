/**
 * 前端日志工具函数
 * 基于 VITE_LOG_LEVEL 环境变量控制日志输出级别
 *
 * @module utils/logger
 *
 * @description
 * 日志级别（从低到高）：
 * - debug: 0 - 调试信息（最详细）
 * - info: 1 - 一般信息
 * - warn: 2 - 警告信息
 * - error: 3 - 错误信息
 * - none: 4 - 不输出任何日志
 *
 * @example
 * import logger from './utils/logger';
 *
 * logger.debug('调试信息', { data: 'test' });
 * logger.info('用户操作', { action: 'submit' });
 * logger.warn('性能警告', { duration: 5000 });
 * logger.error('请求失败', error);
 */

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4
};


const currentLevel = import.meta.env.VITE_LOG_LEVEL || 'info';
const currentLevelValue = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.info;

/**
 * Format log arguments for safe serialization and output
 * 格式化日志参数以安全序列化和输出
 * @param {Array} args - Array of arguments to format
 *                      要格式化的参数数组
 * @returns {Array} Formatted arguments with Error objects serialized and circular references handled
 *                 格式化后的参数,Error对象被序列化并处理循环引用
 */
const formatArgs = (args) => {
    return args.map(arg => {
        // 错误对象特殊处理
        if (arg instanceof Error) {
            return {
                message: arg.message,
                stack: arg.stack,
                name: arg.name
            };
        }
        // 对象和数组深度复制，避免引用问题
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.parse(JSON.stringify(arg));
            } catch {
                return arg;
            }
        }
        return arg;
    });
}

/**
 * Generate timestamp prefix with ANSI color codes for log level
 * 生成带 ANSI 颜色代码的日志级别时间戳前缀
 * @param {string} level - Log level: 'debug', 'info', 'warn', or 'error'
 *                        日志级别: 'debug'、'info'、'warn' 或 'error'
 * @returns {string} Formatted timestamp string with color-coded level indicator
 *                  格式化后的时间戳字符串,包含彩色级别指示器
 */
const getTimestampPrefix = (level) => {
    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });

    const levelColors = {
        debug: '\x1b[36m', // Cyan / 青色
        info: '\x1b[32m',  // Green / 绿色
        warn: '\x1b[33m',  // Yellow / 黄色
        error: '\x1b[31m'  // Red / 红色
    };

    const reset = '\x1b[0m';
    const color = levelColors[level] || '';

    return `${timestamp} [${color}${level.toUpperCase()}${reset}]`;
}

/**
 * Logger class for frontend with configurable log levels
 * 前端日志类,支持可配置的日志级别
 */
class Logger {
    /**
     * Output debug level log
     * 输出调试级别日志
     * @param {...any} args - Log arguments
     *                      日志参数
     */
    debug(...args) {
        if (currentLevelValue <= LOG_LEVELS.debug) {
            console.log(getTimestampPrefix('debug'), ...formatArgs(args));
        }
    }

    /**
     * Output info level log
     * 输出信息级别日志
     * @param {...any} args - Log arguments
     *                      日志参数
     */
    info(...args) {
        if (currentLevelValue <= LOG_LEVELS.info) {
            console.log(getTimestampPrefix('info'), ...formatArgs(args));
        }
    }

    /**
     * Output warning level log
     * 输出警告级别日志
     * @param {...any} args - Log arguments
     *                      日志参数
     */
    warn(...args) {
        if (currentLevelValue <= LOG_LEVELS.warn) {
            console.warn(getTimestampPrefix('warn'), ...formatArgs(args));
        }
    }

    /**
     * Output error level log
     * 输出错误级别日志
     * @param {...any} args - Log arguments
     *                      日志参数
     */
    error(...args) {
        if (currentLevelValue <= LOG_LEVELS.error) {
            console.error(getTimestampPrefix('error'), ...formatArgs(args));
        }
    }

    /**
     * Check if specified log level is enabled
     * 检查是否启用指定级别的日志
     * @param {'debug'|'info'|'warn'|'error'} level - Log level to check
     *                                               要检查的日志级别
     * @returns {boolean} Whether the log level is enabled
     *                   该日志级别是否启用
     */
    isEnabled(level) {
        return currentLevelValue <= LOG_LEVELS[level];
    }

    /**
     * Get current log level
     * 获取当前日志级别
     * @returns {string} Current log level name
     *                 当前日志级别名称
     */
    getLevel() {
        return currentLevel;
    }
}

const logger = new Logger();
export default logger;
