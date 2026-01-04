import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 Configuration from environment variables
const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || 'sentra-files';
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

// File upload constraints
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

// Create S3 client configured for Cloudflare R2
const createR2Client = () => {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        console.warn('R2 credentials not configured. File uploads will be disabled.');
        return null;
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });
};

let r2Client: S3Client | null = null;

const getR2Client = () => {
    if (!r2Client) {
        r2Client = createR2Client();
    }
    return r2Client;
};

// Check if R2 is configured
export const isR2Configured = (): boolean => {
    return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
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

// Generate unique file key
const generateFileKey = (transactionId: string, fieldCode: string, fileName: string): string => {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `transactions/${transactionId}/${fieldCode}/${timestamp}_${sanitizedName}`;
};

// Upload file to R2
export const uploadFile = async (
    file: File,
    transactionId: string,
    fieldCode: string,
    onProgress?: (progress: number) => void
): Promise<{ success: boolean; key?: string; url?: string; error?: string }> => {
    const client = getR2Client();

    if (!client) {
        return { success: false, error: 'R2 storage belum dikonfigurasi.' };
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const fileKey = generateFileKey(transactionId, fieldCode, file.name);

    try {
        // Convert file to array buffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Simulate progress (actual progress requires more complex XHR implementation)
        onProgress?.(10);

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileKey,
            Body: uint8Array,
            ContentType: file.type,
            ContentLength: file.size,
            Metadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
            },
        });

        onProgress?.(50);

        await client.send(command);

        onProgress?.(100);

        // Generate public URL if configured
        const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${fileKey}` : undefined;

        return {
            success: true,
            key: fileKey,
            url: publicUrl,
        };
    } catch (error) {
        console.error('Error uploading file to R2:', error);
        return {
            success: false,
            error: `Gagal upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
};

// Get signed URL for private file access
export const getFileUrl = async (fileKey: string, expiresInSeconds = 3600): Promise<string | null> => {
    const client = getR2Client();

    if (!client) {
        return null;
    }

    // If public URL is configured, return public URL
    if (R2_PUBLIC_URL) {
        return `${R2_PUBLIC_URL}/${fileKey}`;
    }

    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileKey,
        });

        const signedUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
        return signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return null;
    }
};

// Delete file from R2
export const deleteFile = async (fileKey: string): Promise<boolean> => {
    const client = getR2Client();

    if (!client) {
        return false;
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileKey,
        });

        await client.send(command);
        return true;
    } catch (error) {
        console.error('Error deleting file from R2:', error);
        return false;
    }
};

// Upload multiple files
export const uploadFiles = async (
    files: File[],
    transactionId: string,
    fieldCode: string,
    onProgress?: (uploaded: number, total: number) => void
): Promise<{ success: boolean; results: Array<{ fileName: string; key?: string; url?: string; error?: string }> }> => {
    const results: Array<{ fileName: string; key?: string; url?: string; error?: string }> = [];
    let uploaded = 0;

    for (const file of files) {
        const result = await uploadFile(file, transactionId, fieldCode);

        results.push({
            fileName: file.name,
            key: result.key,
            url: result.url,
            error: result.error,
        });

        uploaded++;
        onProgress?.(uploaded, files.length);
    }

    const allSuccess = results.every(r => !r.error);
    return { success: allSuccess, results };
};
