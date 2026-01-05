import { useState } from 'react';
import { getFileUrl } from '@/lib/storage.service';
import { Button } from './button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './dialog';
import {
    FileText,
    Image as ImageIcon,
    FileSpreadsheet,
    File,
    Download,
    Eye,
    Loader2,
    ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export type FileType = 'image' | 'pdf' | 'doc' | 'excel' | 'other';

/**
 * Detect file type from filename extension
 */
export const getFileType = (filename: string): FileType => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    return 'other';
};

/**
 * Get icon component based on file type
 */
export const getFileIcon = (type: FileType) => {
    switch (type) {
        case 'image':
            return ImageIcon;
        case 'pdf':
            return FileText;
        case 'doc':
            return FileText;
        case 'excel':
            return FileSpreadsheet;
        default:
            return File;
    }
};

/**
 * Get icon color based on file type
 */
const getIconColor = (type: FileType) => {
    switch (type) {
        case 'image':
            return 'text-green-600';
        case 'pdf':
            return 'text-red-600';
        case 'doc':
            return 'text-blue-600';
        case 'excel':
            return 'text-emerald-600';
        default:
            return 'text-gray-600';
    }
};

interface FilePreviewButtonProps {
    /**
     * The file path stored in storage (e.g., transactions/{id}/{field}/{filename})
     */
    filePath: string;
    /**
     * Original filename for display
     */
    fileName: string;
    /**
     * Transaction ID (used for constructing full path if needed)
     */
    transactionId?: string;
    /**
     * Compact mode - show only icons
     */
    compact?: boolean;
}

export function FilePreviewButton({
    filePath,
    fileName,
    transactionId,
    compact = false,
}: FilePreviewButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const fileType = getFileType(fileName);
    const FileIcon = getFileIcon(fileType);
    const iconColor = getIconColor(fileType);

    /**
     * Get signed URL for the file
     */
    const fetchFileUrl = async (): Promise<string | null> => {
        setIsLoading(true);
        try {
            const url = await getFileUrl(filePath);
            return url;
        } catch (error) {
            console.error('Error getting file URL:', error);
            toast.error('Gagal mendapatkan URL file');
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle preview action
     */
    const handlePreview = async () => {
        const url = await fetchFileUrl();
        if (!url) return;

        if (fileType === 'image') {
            // Show image in modal
            setPreviewUrl(url);
            setPreviewOpen(true);
        } else if (fileType === 'pdf') {
            // Open PDF in new tab
            window.open(url, '_blank');
        } else {
            // For other types, just download
            handleDownloadWithUrl(url);
        }
    };

    /**
     * Handle download action
     */
    const handleDownload = async () => {
        const url = await fetchFileUrl();
        if (!url) return;
        handleDownloadWithUrl(url);
    };

    /**
     * Trigger download with given URL
     */
    const handleDownloadWithUrl = (url: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (compact) {
        return (
            <div className="flex items-center gap-1">
                <FileIcon className={`h-4 w-4 ${iconColor}`} />
                <span className="text-sm truncate max-w-[150px]" title={fileName}>
                    {fileName}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handlePreview}
                    disabled={isLoading}
                    title="Preview"
                >
                    {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Eye className="h-3 w-3" />
                    )}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleDownload}
                    disabled={isLoading}
                    title="Download"
                >
                    <Download className="h-3 w-3" />
                </Button>

                {/* Image Preview Dialog */}
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-green-600" />
                                {fileName}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex items-center justify-center p-4">
                            {previewUrl && (
                                <img
                                    src={previewUrl}
                                    alt={fileName}
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                                />
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                                Tutup
                            </Button>
                            <Button onClick={handleDownload}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <FileIcon className={`h-8 w-8 ${iconColor} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={fileName}>
                    {fileName}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{fileType}</p>
            </div>
            <div className="flex items-center gap-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePreview}
                    disabled={isLoading}
                    className="gap-1"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : fileType === 'image' ? (
                        <Eye className="h-4 w-4" />
                    ) : (
                        <ExternalLink className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                        {fileType === 'image' ? 'Preview' : 'Buka'}
                    </span>
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={isLoading}
                    className="gap-1"
                >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Download</span>
                </Button>
            </div>

            {/* Image Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-green-600" />
                            {fileName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center p-4">
                        {previewUrl && (
                            <img
                                src={previewUrl}
                                alt={fileName}
                                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                            />
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                            Tutup
                        </Button>
                        <Button onClick={handleDownload}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

interface FileListProps {
    /**
     * Array of file names or file paths
     */
    files: string[];
    /**
     * Transaction ID for constructing file paths
     */
    transactionId: string;
    /**
     * Field code for constructing file paths
     */
    fieldCode: string;
    /**
     * Compact mode
     */
    compact?: boolean;
}

/**
 * Component to render a list of files with preview/download
 */
export function FileList({ files, transactionId, fieldCode, compact = false }: FileListProps) {
    if (!files || files.length === 0) {
        return <span className="text-muted-foreground">-</span>;
    }

    return (
        <div className={compact ? 'space-y-1' : 'space-y-2'}>
            {files.map((file, index) => {
                // Check if it's a full path or just filename
                const isFullPath = file.includes('/');
                const filePath = isFullPath
                    ? file
                    : `transactions/${transactionId}/${fieldCode}/${file}`;
                const fileName = isFullPath ? file.split('/').pop() || file : file;

                return (
                    <FilePreviewButton
                        key={index}
                        filePath={filePath}
                        fileName={fileName}
                        transactionId={transactionId}
                        compact={compact}
                    />
                );
            })}
        </div>
    );
}
