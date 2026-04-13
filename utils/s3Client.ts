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
        const url = this.getNormalizedUrl(config, filename);
        
        try {
            const response = await client.fetch(url, {
                method: 'GET'
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            
            return await response.blob();
        } catch (e: any) {
            console.error('[S3] Download failed', e);
            throw new Error(`S3 Download failed: ${e.message}`);
        }
    }
};
