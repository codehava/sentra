import { supabase } from './supabase';

// Supabase Storage Configuration
const BUCKET_NAME = 'sentra-files';

// File upload constraints (shared with r2-storage)
export const FILE_UPLOAD_CONFIG = {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    maxSizeMB: 5,
    allowedTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx'],
};

// Validate file before upload
export const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > FILE_UPLOAD_CONFIG.maxSizeBytes) {
        return {
            valid: false,
            error: `File "${file.name}" terlalu besar. Maksimal ${FILE_UPLOAD_CONFIG.maxSizeMB}MB.`,
        };
    }

    // Check file type
    if (!FILE_UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !FILE_UPLOAD_CONFIG.allowedExtensions.includes(`.${ext}`)) {
            return {
                valid: false,
                error: `Tipe file "${file.name}" tidak diizinkan. Gunakan: PDF, gambar, atau dokumen Office.`,
            };
        }
    }

    return { valid: true };
};

// Generate unique file path
const generateFilePath = (transactionId: string, fieldCode: string, fileName: string): string => {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `transactions/${transactionId}/${fieldCode}/${timestamp}_${sanitizedName}`;
};

// Upload file to Supabase Storage
export const uploadFile = async (
    file: File,
    transactionId: string,
    fieldCode: string,
    onProgress?: (progress: number) => void
): Promise<{ success: boolean; path?: string; url?: string; error?: string }> => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const filePath = generateFilePath(transactionId, fieldCode, file.name);

    try {
        onProgress?.(10);

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            throw error;
        }

        onProgress?.(80);

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

        onProgress?.(100);

        return {
            success: true,
            path: data.path,
            url: urlData.publicUrl,
        };
    } catch (error) {
        console.error('Error uploading file to Supabase:', error);
        return {
            success: false,
            error: `Gagal upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
};

// Get file URL from Supabase Storage
export const getFileUrl = async (filePath: string): Promise<string | null> => {
    try {
        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error getting file URL:', error);
        return null;
    }
};

// Get signed URL for private files
export const getSignedUrl = async (filePath: string, expiresInSeconds = 3600): Promise<string | null> => {
    try {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(filePath, expiresInSeconds);

        if (error) throw error;
        return data.signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return null;
    }
};

// Delete file from Supabase Storage
export const deleteFile = async (filePath: string): Promise<boolean> => {
    try {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

// Upload multiple files
export const uploadFiles = async (
    files: File[],
    transactionId: string,
    fieldCode: string,
    onProgress?: (uploaded: number, total: number) => void
): Promise<{ success: boolean; results: Array<{ fileName: string; path?: string; url?: string; error?: string }> }> => {
    const results: Array<{ fileName: string; path?: string; url?: string; error?: string }> = [];
    let uploaded = 0;

    for (const file of files) {
        const result = await uploadFile(file, transactionId, fieldCode);

        results.push({
            fileName: file.name,
            path: result.path,
            url: result.url,
            error: result.error,
        });

        uploaded++;
        onProgress?.(uploaded, files.length);
    }

    const allSuccess = results.every(r => !r.error);
    return { success: allSuccess, results };
};
