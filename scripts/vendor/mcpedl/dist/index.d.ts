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
export interface McpedlConfig {
    baseURL?: string;
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    rateLimit?: {
        minTime?: number;
        maxConcurrent?: number;
    };
    userAgent?: string;
}
export interface SearchResult {
    list: SearchItem[];
    hasNextPage: boolean;
    nextPage?: number;
}
export interface SearchItem {
    name: string;
    id: string;
    img: string;
    rating: string;
}
export interface DetailResult {
    title: string;
    img: string;
    rating: {
        count: string;
        value: string;
    };
    comment: string;
    content: string;
    info: PostInfo;
    gallery: GalleryItem[];
    faq: FAQItem[];
    list: DownloadItem[];
}
export interface PostInfo {
    category: string;
    postDate: string;
    author: string;
    [key: string]: any;
}
export interface GalleryItem {
    type: 'image' | 'video';
    img: string;
    name?: string;
    postTime?: string;
    duration?: string | null;
    video?: string | null;
}
export interface FAQItem {
    question: string;
    answer: string;
}
export interface DownloadItem {
    index: number;
    name: string;
    version: string;
    files: DownloadFile[];
}
export interface DownloadFile {
    index: number;
    type: string;
    id: number;
    meta_title?: string | null;
}
export interface DownloadResult {
    url: string;
}
export interface LatestResult {
    quick: QuickDownload[];
    list: SearchItem[];
}
export interface QuickDownload {
    name: string;
    id: string;
    file: number;
}
export interface McpedlError extends Error {
    code?: string;
    status?: number;
    originalError?: Error;
}
export declare class McpedlError extends Error implements McpedlError {
    code?: string;
    status?: number;
    originalError?: Error;
    constructor(message: string, code?: string, status?: number, originalError?: Error);
}
/**
 * Main MCPEDL API class
 */
export declare class McpedlAPI {
    private client;
    private limiter;
    private config;
    constructor(config?: McpedlConfig);
    private setupInterceptors;
    /**
     * Make a request with retry logic and rate limiting
     */
    private makeRequest;
    /**
     * Validate search parameters
     */
    private validateSearchParams;
    /**
     * Validate detail parameters
     */
    private validateDetailParams;
    /**
     * Validate download parameters
     */
    private validateDownloadParams;
    /**
     * Parse search page HTML and extract results
     */
    private parseSearchResults;
    /**
     * Parse detail page HTML and extract comprehensive information
     */
    private parseDetailResults;
    /**
     * Parse download table from detail page
     */
    private parseDownloadTable;
    /**
     * Search for content on MCPEDL
     */
    search(query: string, page?: number): Promise<SearchResult>;
    /**
     * Get detailed information about a specific post
     */
    detail(id: string): Promise<DetailResult>;
    /**
     * Get download URL for a file
     *
     * 2026 fix: o site trocou o fluxo antigo (GET /dw_file.php?id=N) por
     * POST /show_file.php com file_id. O método mantém a assinatura e o
     * retorno documentados ({ url }), resolvendo do mesmo jeito que o
     * formulário do site resolve para um visitante normal.
     */
    download(id: number): Promise<DownloadResult>;
    /**
     * Get latest Minecraft content
     */
    mclatest(page?: number): Promise<LatestResult>;
    /**
     * Get current configuration
     */
    getConfig(): Required<McpedlConfig>;
    /**
     * Update configuration at runtime
     */
    updateConfig(newConfig: Partial<McpedlConfig>): void;
}
export default McpedlAPI;
export declare const createMcpedl: (config?: McpedlConfig) => McpedlAPI;
//# sourceMappingURL=index.d.ts.map