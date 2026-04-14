import { AwsClient } from 'aws4fetch';
import { S3Config } from '../types';

export const S3BackupClient = {
    /**
     * Create an AwsClient instance
     */
    getClient(config: S3Config): AwsClient {
        return new AwsClient({
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            service: 's3',
            region: config.region || 'auto',
        });
    },

    /**
     * Get normalized URL
     */
    getNormalizedUrl(config: S3Config, filename: string): string {
        let endpoint = config.endpoint || '';
        if (endpoint && !endpoint.startsWith('http')) {
            endpoint = `https://${endpoint}`;
        }
        endpoint = endpoint.replace(/\/+$/, '');

        let key = filename;
        if (config.path) {
            let path = config.path.replace(/^\/+/, '').replace(/\/+$/, '');
            if (path.length > 0) {
                key = `${path}/${filename}`;
            }
        }
        
        // Always use Path-style URL (https://endpoint/bucket/key)
        // aws4fetch calculates the signature using the URL path.
        // For non-AWS domains, virtual-hosted style causes a signature mismatch in aws4fetch.
        return `${endpoint}/${config.bucketName}/${key}`;
    },

    /**
     * Upload a file
     */
    async uploadBackup(config: S3Config, filename: string, content: Blob): Promise<boolean> {
        const client = this.getClient(config);
        const url = this.getNormalizedUrl(config, filename);
        
        try {
            // Convert Blob to ArrayBuffer so aws4fetch can correctly calculate the SHA256 signature hash.
            // Using a raw Blob forces UNSIGNED-PAYLOAD which some S3 services reject.
            const buffer = await content.arrayBuffer();

            const response = await client.fetch(url, {
                method: 'PUT',
                body: buffer,
                headers: {
                    'Content-Type': 'application/zip'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }

            return true;
        } catch (e: any) {
            console.error('[S3] Upload failed', e);
            throw new Error(e.message || 'Unknown network error');
        }
    },

    /**
     * Download a file
     */
    async downloadBackup(config: S3Config, filename: string): Promise<Blob> {
        const client = this.getClient(config);
        const baseUrl = this.getNormalizedUrl(config, filename);
        // Add cache buster to bypass any intermediary caches
        const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        
        try {
            const response = await client.fetch(url, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            
            const buffer = await response.arrayBuffer();
            
            if (buffer.byteLength === 0) {
                throw new Error('下载的文件为空');
            }

            return new Blob([buffer], { type: 'application/zip' });
        } catch (e: any) {
            console.error('[S3] Download failed', e);
            throw new Error(`S3 Download failed: ${e.message}`);
        }
    },

    /**
     * List backups
     */
    async listBackups(config: S3Config): Promise<{ key: string, lastModified: string, size: number }[]> {
        const client = this.getClient(config);
        
        let endpoint = config.endpoint || '';
        if (endpoint && !endpoint.startsWith('http')) {
            endpoint = `https://${endpoint}`;
        }
        endpoint = endpoint.replace(/\/+$/, '');
        
        const prefix = config.path ? config.path.replace(/^\/+/, '').replace(/\/+$/, '') + '/' : '';
        const url = `${endpoint}/${config.bucketName}?list-type=2&prefix=${encodeURIComponent(prefix)}`;
        
        try {
            const response = await client.fetch(url, {
                method: 'GET'
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const contents = xmlDoc.getElementsByTagName("Contents");
            
            const backups: { key: string, lastModified: string, size: number }[] = [];
            for (let i = 0; i < contents.length; i++) {
                const keyNode = contents[i].getElementsByTagName("Key")[0];
                const lastModifiedNode = contents[i].getElementsByTagName("LastModified")[0];
                const sizeNode = contents[i].getElementsByTagName("Size")[0];
                
                if (keyNode && keyNode.textContent && keyNode.textContent.endsWith('.zip')) {
                    const fullKey = keyNode.textContent;
                    let filename = fullKey;
                    if (prefix && fullKey.startsWith(prefix)) {
                        filename = fullKey.substring(prefix.length);
                    }
                    
                    backups.push({
                        key: filename,
                        lastModified: lastModifiedNode ? lastModifiedNode.textContent || '' : '',
                        size: sizeNode ? parseInt(sizeNode.textContent || '0', 10) : 0
                    });
                }
            }
            
            backups.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
            return backups;
        } catch (e: any) {
            console.error('[S3] List backups failed', e);
            throw new Error(`S3 List failed: ${e.message}`);
        }
    },

    /**
     * Delete a file
     */
    async deleteBackup(config: S3Config, filename: string): Promise<boolean> {
        const client = this.getClient(config);
        const url = this.getNormalizedUrl(config, filename);
        
        try {
            const response = await client.fetch(url, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            
            return true;
        } catch (e: any) {
            console.error('[S3] Delete failed', e);
            throw new Error(`S3 Delete failed: ${e.message}`);
        }
    }
};
