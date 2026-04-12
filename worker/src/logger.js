const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4
};

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
        if (arg instanceof Error) {
            return {
                message: arg.message,
                stack: arg.stack,
                name: arg.name
            };
        }

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
 * Generate timestamp prefix with emoji indicator for log level
 * 生成带日志级别emoji指示器的时间戳前缀
 * @param {string} level - Log level: 'debug', 'info', 'warn', or 'error'
 *                        日志级别: 'debug'、'info'、'warn' 或 'error'
 * @returns {string} Formatted timestamp string with emoji and level indicator
 *                  格式化后的时间戳字符串,包含emoji和级别指示器
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

    const emojis = {
        debug: '🔵 ',
        info: '🟢 ',
        warn: '🟡 ',
        error: '🔴 '
    };

    const emoji = emojis[level] || '⚪ ';
    return `${timestamp} [${emoji}${level.toUpperCase()}]`;
}

/**
 * Logger class with environment-based log level control
 * 支持基于环境变量的日志级别控制的日志类
 */
class Logger extends Object {
    constructor() {
        super();
        this.env = null;
    }

    /**
     * Initialize logger with environment variables
     * 使用环境变量初始化日志器
     * @param {Object} env - Environment variables object
     *                      环境变量对象
     * @returns {Logger} Logger instance for chaining
     *                  日志器实例用于链式调用
     */
    init(env) {
        this.env = env;
        return this;
    }

    /**
     * Get effective environment variables
     * 获取有效的环境变量
     * @param {Object|string} envOrMessage - Environment object or message
     *                                     环境对象或消息
     * @returns {Object} Effective environment variables
     *                 有效的环境变量
     */
    getEffectiveEnv(envOrMessage) {
        if (envOrMessage && typeof envOrMessage === 'object' && envOrMessage.LOG_LEVEL) {
            return envOrMessage;
        }
        return this.env || globalThis.ENV || {};
    }

    /**
     * Get current log level
     * 获取当前日志级别
     * @param {Object|string} envOrMessage - Environment object or message
     *                                     环境对象或消息
     * @returns {number} Numeric log level value
     *                 数字形式的日志级别值
     */
    getLevel = (envOrMessage) => {
        const env = this.getEffectiveEnv(envOrMessage);
        const level = env.LOG_LEVEL || 'info';
        return LOG_LEVELS[level] ?? LOG_LEVELS.info;
    }

    /**
     * Output debug level log
     * 输出调试级别日志
     * @param {Object|string} envOrMessage - Environment variables object or log message
     *                                     环境变量对象或日志消息
     * @param {...any} args - Log arguments (if first param is env, these are messages; otherwise first param is the message)
     *                      日志参数(如果第一个参数是 env,则这里是消息;否则第一个参数就是消息)
     */
    debug = (envOrMessage, ...args) => {
        const currentLevel = this.getLevel(envOrMessage);
        if (currentLevel <= LOG_LEVELS.debug) {
            if (!envOrMessage || typeof envOrMessage !== 'object' || !envOrMessage.LOG_LEVEL) {
                console.log(getTimestampPrefix('debug'), ...formatArgs([envOrMessage, ...args]));
            } else {
                console.log(getTimestampPrefix('debug'), ...formatArgs(args));
            }
        }
    }

    /**
     * Output info level log
     * 输出信息级别日志
     * @param {Object|string} envOrMessage - Environment variables object or log message
     *                                     环境变量对象或日志消息
     * @param {...any} args - Log arguments
     *                      日志参数
     */
    info = (envOrMessage, ...args) => {
        const currentLevel = this.getLevel(envOrMessage);
        if (currentLevel <= LOG_LEVELS.info) {
            if (!envOrMessage || typeof envOrMessage !== 'object' || !envOrMessage.LOG_LEVEL) {
                console.log(getTimestampPrefix('info'), ...formatArgs([envOrMessage, ...args]));
            } else {
                console.log(getTimestampPrefix('info'), ...formatArgs(args));
            }
        }
    }

    /**
     * Output warning level log
     * 输出警告级别日志
     * @param {Object|string} envOrMessage - Environment variables object or log message
     *                                     环境变量对象或日志消息
     * @param {...any} args - Log arguments
     *                      日志参数
     */
    warn = (envOrMessage, ...args) => {
        const currentLevel = this.getLevel(envOrMessage);
        if (currentLevel <= LOG_LEVELS.warn) {
            if (!envOrMessage || typeof envOrMessage !== 'object' || !envOrMessage.LOG_LEVEL) {
                console.warn(getTimestampPrefix('warn'), ...formatArgs([envOrMessage, ...args]));
            } else {
                console.warn(getTimestampPrefix('warn'), ...formatArgs(args));
            }
        }
    }

    /**
     * Output error level log
     * 输出错误级别日志
     * @param {Object|string} envOrMessage - Environment variables object or log message
     *                                     环境变量对象或日志消息
     * @param {...any} args - Log arguments
     *                      日志参数
     */
    error = (envOrMessage, ...args) => {
        const currentLevel = this.getLevel(envOrMessage);
        if (currentLevel <= LOG_LEVELS.error) {
            if (!envOrMessage || typeof envOrMessage !== 'object' || !envOrMessage.LOG_LEVEL) {
                console.error(getTimestampPrefix('error'), ...formatArgs([envOrMessage, ...args]));
            } else {
                console.error(getTimestampPrefix('error'), ...formatArgs(args));
            }
        }
    }

    /**
     * Check if specified log level is enabled
     * 检查是否启用指定级别的日志
     * @param {Object} [env] - Optional environment variables object
     *                        可选的环境变量对象
     * @param {'debug'|'info'|'warn'|'error'} level - Log level to check
     *                                               要检查的日志级别
     * @returns {boolean} Whether the log level is enabled
     *                   该日志级别是否启用
     */
    isEnabled = (env, level) => {
        const effectiveEnv = env || globalThis.ENV || {};
        const currentLevel = LOG_LEVELS[effectiveEnv.LOG_LEVEL] ?? LOG_LEVELS.info;
        return currentLevel <= LOG_LEVELS[level];
    }
}

const logger = new Logger();
export default logger;