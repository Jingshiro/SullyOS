
import { WebDAVConfig } from '../types';

/**
 * A lightweight WebDAV client using fetch.
 */
export const WebDAVClient = {
    /**
     * Create a folder (MKCOL)
     */
    async createDirectory(config: WebDAVConfig, path: string): Promise<boolean> {
        const url = this.getNormalizedUrl(config, path);
        const headers = this.getAuthHeaders(config);
        
        try {
            const response = await fetch(url, {
                method: 'MKCOL',
                headers
            });
            // 201 Created, 405 Method Not Allowed (already exists)
            return response.status === 201 || response.status === 405;
        } catch (e) {
            console.error('[WebDAV] MKCOL failed', e);
            return false;
        }
    },

    /**
     * Upload a file (PUT)
     */
    async putFile(config: WebDAVConfig, path: string, content: Blob): Promise<boolean> {
        const url = this.getNormalizedUrl(config, path);
        const headers = this.getAuthHeaders(config);
        
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers,
                body: content
            });
            return response.status === 201 || response.status === 204 || response.status === 200;
        } catch (e) {
            console.error('[WebDAV] PUT failed', e);
            throw e;
        }
    },

    /**
     * Download a file (GET)
     */
    async getFile(config: WebDAVConfig, path: string): Promise<Blob> {
        const url = this.getNormalizedUrl(config, path);
        const headers = this.getAuthHeaders(config);
        
        const response = await fetch(url, {
            method: 'GET',
            headers
        });
        
        if (!response.ok) {
            throw new Error(`WebDAV Download failed: ${response.status}`);
        }
        
        return await response.blob();
    },

    /**
     * List files in a directory (PROPFIND)
     * Simplified: returns true if path exists, false if 404
     */
    async exists(config: WebDAVConfig, path: string): Promise<boolean> {
        const url = this.getNormalizedUrl(config, path);
        const headers = {
            ...this.getAuthHeaders(config),
            'Depth': '0'
        };
        
        try {
            const response = await fetch(url, {
                method: 'PROPFIND',
                headers
            });
            return response.status < 400;
        } catch (e) {
            return false;
        }
    },

    /**
     * Internal: Basic Auth Header
     */
    getAuthHeaders(config: WebDAVConfig): Record<string, string> {
        const auth = btoa(`${config.username}:${config.password}`);
        return {
            'Authorization': `Basic ${auth}`
        };
    },

    /**
     * Internal: Normalize URL
     */
    getNormalizedUrl(config: WebDAVConfig, path: string): string {
        let baseUrl = config.url.replace(/\/+$/, '');
        let targetPath = path.startsWith('/') ? path : `/${path}`;
        
        // If config.path is set, prepend it
        if (config.path) {
            let configPath = config.path.startsWith('/') ? config.path : `/${config.path}`;
            configPath = configPath.replace(/\/+$/, '');
            targetPath = `${configPath}${targetPath}`;
        }
        
        return `${baseUrl}${targetPath}`;
    }
};
