"use strict";
/**
 * Improved MCPEDL Node.js API
 *
 * An unofficial API for accessing MCPEDL.org content with enhanced features:
 * - TypeScript support with proper types
 * - Better error handling and validation
 * - Rate limiting and retry mechanisms
 * - Configurable options
 * - Comprehensive documentation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMcpedl = exports.McpedlAPI = exports.McpedlError = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const p_retry_1 = __importDefault(require("p-retry"));
const bottleneck_1 = __importDefault(require("bottleneck"));
class McpedlError extends Error {
    code;
    status;
    originalError;
    constructor(message, code, status, originalError) {
        super(message);
        this.name = 'McpedlError';
        this.code = code;
        this.status = status;
        this.originalError = originalError;
        // 2026 fix (lote 2): captureStackTrace só existe no runtime V8/Node — sem
        // @types/node no ambiente de build o TS reclama; guard por cast.
        const err = Error;
        if (typeof err.captureStackTrace === 'function')
            err.captureStackTrace(this, McpedlError);
    }
}
exports.McpedlError = McpedlError;
/**
 * Main MCPEDL API class
 */
class McpedlAPI {
    client;
    limiter;
    config;
    constructor(config = {}) {
        this.config = {
            baseURL: config.baseURL || 'https://mcpedl.org',
            timeout: config.timeout || 10000,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            rateLimit: {
                minTime: config.rateLimit?.minTime || 1000,
                maxConcurrent: config.rateLimit?.maxConcurrent || 2
            },
            userAgent: config.userAgent || 'Mozilla/5.0 (compatible; McpedlAPI/2.0; +https://github.com/terastudio-org/mcpedl)'
        };
        // Initialize axios client with proper configuration
        this.client = axios_1.default.create({
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            headers: {
                'User-Agent': this.config.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            validateStatus: (status) => status < 500 // Don't reject on 4xx errors
        });
        // Setup rate limiting
        this.limiter = new bottleneck_1.default({
            minTime: this.config.rateLimit.minTime,
            maxConcurrent: this.config.rateLimit.maxConcurrent
        });
        // Add request/response interceptors for logging and error handling
        this.setupInterceptors();
    }
    setupInterceptors() {
        this.client.interceptors.request.use((config) => {
            return config;
        }, (error) => {
            return Promise.reject(new McpedlError('Request configuration error', 'CONFIG_ERROR', undefined, error));
        });
        this.client.interceptors.response.use((response) => response, (error) => {
            const status = error.response?.status;
            const message = error.response?.data || error.message;
            if (status === 404) {
                throw new McpedlError('Page Not Found', 'NOT_FOUND', status, error);
            }
            else if (status === 429) {
                throw new McpedlError('Rate Limit Exceeded', 'RATE_LIMIT', status, error);
            }
            else if (status && status >= 500) {
                throw new McpedlError('Server Error', 'SERVER_ERROR', status, error);
            }
            else if (error.code === 'ECONNABORTED') {
                throw new McpedlError('Request Timeout', 'TIMEOUT', undefined, error);
            }
            throw new McpedlError(`Request failed: ${message}`, 'REQUEST_FAILED', status, error);
        });
    }
    /**
     * Make a request with retry logic and rate limiting
     */
    async makeRequest(requestFn) {
        return this.limiter.schedule(async () => {
            return (0, p_retry_1.default)(requestFn, {
                retries: this.config.maxRetries,
                factor: 2,
                minTimeout: this.config.retryDelay,
                maxTimeout: this.config.retryDelay * 4
            }).then(response => response.data);
        });
    }
    /**
     * Validate search parameters
     */
    validateSearchParams(query, page) {
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new McpedlError('Search query must be a non-empty string', 'INVALID_QUERY');
        }
        if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
            throw new McpedlError('Page must be a positive integer', 'INVALID_PAGE');
        }
    }
    /**
     * Validate detail parameters
     */
    validateDetailParams(id) {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            throw new McpedlError('Detail ID must be a non-empty string', 'INVALID_ID');
        }
    }
    /**
     * Validate download parameters
     */
    validateDownloadParams(id) {
        if (!Number.isInteger(id) || id <= 0) {
            throw new McpedlError('Download ID must be a positive integer', 'INVALID_DOWNLOAD_ID');
        }
    }
    /**
     * Parse search page HTML and extract results
     */
    parseSearchResults($) {
        const list = [];
        const $next = $('a.next');
        $('.entries .g-grid .g-block article section').each((i, el) => {
            const $el = $(el);
            const href = $el.find('a').attr('href');
            if (href) {
                list.push({
                    name: $el.find('.entry-title a').attr('title') || $el.find('.entry-title a').text().trim(),
                    id: href.split('/').at(-2) || '',
                    img: $el.find('img').attr('src') || '',
                    rating: $el.find('.rating-wrapper span').text().trim()
                });
            }
        });
        return {
            list,
            hasNextPage: !!$next.attr('href'),
            nextPage: $next.attr('href') ? parseInt($next.attr('href').split('/').at(-2)) : undefined
        };
    }
    /**
     * Parse detail page HTML and extract comprehensive information
     */
    parseDetailResults($) {
        const info = {
            category: $('.categories .single-cat').text().trim(),
            postDate: $('.date').attr('content') || $('.date').text().trim(),
            author: $('.meta-author-link .author').text().trim()
        };
        const gallery = [];
        $('.entry-gallery div div div').each((_, el) => {
            const $el = $(el);
            const isVideo = el.attribs?.itemtype?.includes('Video');
            gallery.push({
                type: isVideo ? 'video' : 'image',
                img: $el.find('img').attr('src') || '',
                ...(isVideo ? {
                    name: $el.find('[itemprop="name"]').attr('content') || '',
                    postTime: $el.find('[itemprop="uploadDate"]').attr('content') || '',
                    duration: $el.find('[itemprop="duration"]').attr('content') || null,
                    video: $el.find('a[itemprop="embedUrl"]').attr('onclick')?.match(/src: '(.*?)'/)?.[1] || null
                } : {})
            });
        });
        const faq = [];
        $('#faqs div details').each((_, el) => {
            const $el = $(el);
            faq.push({
                question: $el.find('summary h3').text(),
                answer: $el.find('div p').text()
            });
        });
        // Parse additional info fields
        $('.entry-footer-column').each((_, el) => {
            const $el = $(el);
            const $content = $el.find('.entry-footer-content');
            let label = $content.find('div').first().text().trim().replace(':', '');
            let value = $content.find('span').last().text().trim();
            if (!label) {
                label = $content.contents().filter(function () {
                    return this.type === 'text';
                }).text().trim().replace(':', '');
            }
            if (label && value) {
                const key = label.toLowerCase().replace(/\s+/g, '_');
                if (!['categories', 'publication_date', 'author'].includes(key)) {
                    info[key] = value;
                }
                if (label === 'Author' && info.author && value !== info.author) {
                    info['game_author'] = value;
                }
            }
        });
        return {
            title: $('.entry-title').text().trim(),
            img: $('.post-thumbnail img').attr('src') || '',
            rating: {
                count: $('span[itemprop="ratingCount"]').text(),
                value: $('span[itemprop="ratingValue"]').text()
            },
            comment: $('span.comment-count').text(),
            content: $('section.entry-content div').text().trim(),
            info,
            gallery,
            faq,
            list: this.parseDownloadTable($)
        };
    }
    /**
     * Parse download table from detail page
     */
    parseDownloadTable($) {
        const results = [];
        $('#download-link table tbody tr').each((j, el) => {
            const $el = $(el);
            const tds = $el.find('td');
            let name = null;
            let version = 'N/A';
            let formContainer = null;
            if (tds.length === 3) {
                name = $(tds[0]).text().trim();
                version = $(tds[1]).text().trim();
                formContainer = $(tds[2]);
            }
            else if (tds.length === 2) {
                name = $(tds[0]).text().trim();
                formContainer = $(tds[1]);
            }
            const files = [];
            if (formContainer) {
                formContainer.find('form').each((i, formEl) => {
                    const $form = $(formEl);
                    const fileIdRaw = $form.find('input[name="file_id"]').val();
                    files.push({
                        index: i + 1,
                        type: $form.find('button').text().replace(/\s+/g, ' ').trim(),
                        id: parseInt(typeof fileIdRaw === 'string' ? fileIdRaw : fileIdRaw?.[0] ?? '0') || 0,
                        meta_title: (() => { const v = $form.find('input[name="post_title"]').val(); return typeof v === 'string' ? v : null; })()
                    });
                });
            }
            if (name) {
                results.push({
                    index: j + 1,
                    name,
                    version,
                    files
                });
            }
        });
        return results;
    }
    /**
     * Search for content on MCPEDL
     */
    async search(query, page = 1) {
        this.validateSearchParams(query, page);
        try {
            const data = await this.makeRequest(() => this.client.get(`/page/${page}/`, { params: { s: query.trim() } }));
            const $ = cheerio.load(data);
            return this.parseSearchResults($);
        }
        catch (error) {
            if (error instanceof McpedlError) {
                throw error;
            }
            throw new McpedlError('Failed to search content', 'SEARCH_FAILED', undefined, error instanceof Error ? error : undefined);
        }
    }
    /**
     * Get detailed information about a specific post
     */
    async detail(id) {
        this.validateDetailParams(id);
        try {
            const data = await this.makeRequest(() => this.client.get(`/${id.trim()}`));
            const $ = cheerio.load(data);
            return this.parseDetailResults($);
        }
        catch (error) {
            if (error instanceof McpedlError) {
                throw error;
            }
            throw new McpedlError('Failed to get post details', 'DETAIL_FAILED', undefined, error instanceof Error ? error : undefined);
        }
    }
    /**
     * Get download URL for a file
     *
     * 2026 fix: o site trocou o fluxo antigo (GET /dw_file.php?id=N) por
     * POST /show_file.php com file_id. O método mantém a assinatura e o
     * retorno documentados ({ url }), resolvendo do mesmo jeito que o
     * formulário do site resolve para um visitante normal.
     */
    async download(id) {
        this.validateDownloadParams(id);
        try {
            const data = await this.makeRequest(() => this.client.post('/show_file.php', new URLSearchParams({ file_id: String(id) }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }));
            const html = typeof data === 'string' ? data : String(data);
            const $ = cheerio.load(html);
            // 2026 fix (lote 2): alguns uploads têm espaço no nome do arquivo
            // (ex. "myth -and-dragons.mcaddon"). Regex antiga parava em \s; esta versão
            // tolera até 3 espaços no nome e é LINEAR (sem quantificadores aninhados —
            // a forma (A+B*)+? cravou hang síncrono em HTML grande).
            const mUpload = html.match(/https?:\/\/[^\s"'<>]+\/uploads_files\/[^\s"'<>]*(?:[ \t][^\s"'<>]*){0,3}\.(?:mcaddon|mcpack|zip|rar)/i);
            const url = $('a[href*="uploads_files"]').attr('href') ||
                $('a.button:not(#download-link)').attr('href') ||
                (mUpload?.[0] ?? '')?.replace(/&amp;/g, '&') ||
                '';
            if (!url || url.includes('show_file')) {
                throw new McpedlError('Download URL not found', 'DOWNLOAD_URL_NOT_FOUND');
            }
            return { url };
        }
        catch (error) {
            if (error instanceof McpedlError) {
                throw error;
            }
            throw new McpedlError('Failed to get download URL', 'DOWNLOAD_FAILED', undefined, error instanceof Error ? error : undefined);
        }
    }
    /**
     * Get latest Minecraft content
     */
    async mclatest(page = 1) {
        if (!Number.isInteger(page) || page < 1) {
            throw new McpedlError('Page must be a positive integer', 'INVALID_PAGE');
        }
        try {
            const data = await this.makeRequest(() => this.client.get(`/downloading/page/${page}/`));
            const $ = cheerio.load(data);
            const quick = [];
            const list = [];
            $('.archive .dwbuttonslist div[style*="solid"]').each((i, el) => {
                const $el = $(el);
                const href = $el.find('a').attr('href');
                if (href) {
                    quick.push({
                        name: $el.find('span[style*="font-weight: 900"]').text(),
                        id: href.replace(/\//g, ''),
                        file: parseInt($el.find('form').attr('action')?.split('/').at(-2) || '0')
                    });
                }
            });
            $('.entries .g-grid .g-block article section').each((i, el) => {
                const $el = $(el);
                const href = $el.find('a').attr('href');
                if (href) {
                    list.push({
                        name: $el.find('.entry-title a').attr('title') || $el.find('.entry-title a').text().trim(),
                        id: href.split('/').at(-2) || '',
                        img: $el.find('img').attr('src') || '',
                        rating: $el.find('.rating-wrapper span').text().trim()
                    });
                }
            });
            return { quick, list };
        }
        catch (error) {
            if (error instanceof McpedlError) {
                throw error;
            }
            throw new McpedlError('Failed to get latest content', 'LATEST_FAILED', undefined, error instanceof Error ? error : undefined);
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration at runtime
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig,
            rateLimit: {
                ...this.config.rateLimit,
                ...newConfig.rateLimit
            }
        };
        // Update axios instance
        this.client.defaults.timeout = this.config.timeout;
        this.client.defaults.baseURL = this.config.baseURL;
        this.client.defaults.headers['User-Agent'] = this.config.userAgent;
        // Update rate limiter
        this.limiter.updateSettings({
            minTime: this.config.rateLimit.minTime,
            maxConcurrent: this.config.rateLimit.maxConcurrent
        });
    }
}
exports.McpedlAPI = McpedlAPI;
// Default export for convenience
exports.default = McpedlAPI;
// Utility function for creating instances with default config
const createMcpedl = (config) => {
    return new McpedlAPI(config);
};
exports.createMcpedl = createMcpedl;
