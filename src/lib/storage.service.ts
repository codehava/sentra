/**
 * Unified Storage Service
 * 
 * Automatically switches between Supabase Storage and Cloudflare R2 based on
 * VITE_STORAGE_PROVIDER environment variable.
 * 
 * - supabase (default): Uses Supabase Storage (good for UAT/dev)
 * - r2: Uses Cloudflare R2 (better for production at scale)
 */

import * as SupabaseStorage from './supabase-storage';
import * as R2Storage from './r2-storage';

// Determine which storage provider to use
const STORAGE_PROVIDER = import.meta.env.VITE_STORAGE_PROVIDER || 'supabase';

// Export shared config
export const FILE_UPLOAD_CONFIG = SupabaseStorage.FILE_UPLOAD_CONFIG;

// Check if using R2
export const isUsingR2 = (): boolean => {
    return STORAGE_PROVIDER === 'r2' && R2Storage.isR2Configured();
};

// Check which provider is active
export const getStorageProvider = (): 'supabase' | 'r2' => {
    return isUsingR2() ? 'r2' : 'supabase';
};

// Validate file (same for both providers)
export const validateFile = SupabaseStorage.validateFile;

// Upload file to the configured storage
export const uploadFile = async (
    file: File,
    transactionId: string,
    fieldCode: string,
    onProgress?: (progress: number) => void
): Promise<{ success: boolean; path?: string; key?: string; url?: string; error?: string }> => {
    if (isUsingR2()) {
        const result = await R2Storage.uploadFile(file, transactionId, fieldCode, onProgress);
        return {
            success: result.success,
            key: result.key,
            path: result.key, // alias for compatibility
            url: result.url,
            error: result.error,
        };
    }
    return SupabaseStorage.uploadFile(file, transactionId, fieldCode, onProgress);
};

// Get file URL
export const getFileUrl = async (filePath: string, expiresInSeconds?: number): Promise<string | null> => {
    if (isUsingR2()) {
        return R2Storage.getFileUrl(filePath, expiresInSeconds);
    }
    // For Supabase, use signed URL if expiry specified, otherwise public URL
    if (expiresInSeconds) {
        return SupabaseStorage.getSignedUrl(filePath, expiresInSeconds);
    }
    return SupabaseStorage.getFileUrl(filePath);
};

// Delete file
export const deleteFile = async (filePath: string): Promise<boolean> => {
    if (isUsingR2()) {
        return R2Storage.deleteFile(filePath);
    }
    return SupabaseStorage.deleteFile(filePath);
};

// Upload multiple files
export const uploadFiles = async (
    files: File[],
    transactionId: string,
    fieldCode: string,
    onProgress?: (uploaded: number, total: number) => void
): Promise<{
    success: boolean;
    results: Array<{ fileName: string; path?: string; key?: string; url?: string; error?: string }>
}> => {
    if (isUsingR2()) {
        const result = await R2Storage.uploadFiles(files, transactionId, fieldCode, onProgress);
        return {
            success: result.success,
            results: result.results.map(r => ({
                ...r,
                path: r.key, // alias for compatibility
            })),
        };
    }
    return SupabaseStorage.uploadFiles(files, transactionId, fieldCode, onProgress);
};

// Log current storage configuration (for debugging)
export const logStorageConfig = (): void => {
    console.log('[Storage]', {
        provider: getStorageProvider(),
        configuredProvider: STORAGE_PROVIDER,
        r2Configured: R2Storage.isR2Configured(),
    });
};
