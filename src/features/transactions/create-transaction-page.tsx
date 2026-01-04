import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { getTransactionTypes } from '@/services/transaction-types.service';
import { getFieldAccess } from '@/services/field-access.service';
import { createTransaction } from '@/services/transactions.service';
import { getSystemFieldOptions } from '@/services/fields.service';
import { getUserBranches } from '@/services/user-branches.service';
import { validateFile, FILE_UPLOAD_CONFIG } from '@/lib/r2-storage';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, CheckCircle, Upload, X, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function CreateTransactionPage() {
    const { type: typeCode } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});
    const [selectedBranch, setSelectedBranch] = useState<string>('');

    // Get transaction type by code
    const { data: types = [] } = useQuery({
        queryKey: ['transaction-types'],
        queryFn: getTransactionTypes,
    });

    const transactionType = types.find((t: any) => t.code === typeCode);

    // Get user's assigned branches
    const { data: userBranches = [] } = useQuery({
        queryKey: ['user-branches', user?.id],
        queryFn: () => getUserBranches(user?.id || ''),
        enabled: !!user?.id,
    });

    // Auto-select first branch if only one
    useEffect(() => {
        if (userBranches.length === 1 && !selectedBranch) {
            setSelectedBranch(userBranches[0].code);
        }
    }, [userBranches, selectedBranch]);

    // Get fields for MAKER stage
    const { data: fieldAccess = [], isLoading: fieldsLoading } = useQuery({
        queryKey: ['field-access', transactionType?.id, 'MAKER'],
        queryFn: () => getFieldAccess(transactionType?.id, 'MAKER'),
        enabled: !!transactionType?.id,
    });

    // Filter visible fields
    const visibleFields = fieldAccess.filter((fa: any) => fa.is_visible);

    // Create form
    const form = useForm({ defaultValues: {} });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: createTransaction,
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success(`Transaksi berhasil dibuat: ${data.ticket_number}`);
            navigate('/my-tickets');
        },
        onError: (error: Error) => {
            toast.error(`Gagal membuat transaksi: ${error.message}`);
        },
    });

    const handleSubmit = (formData: any) => {
        if (!transactionType || !user) return;

        // Check branch selection
        if (!selectedBranch) {
            toast.error('Silakan pilih Kantor Cabang');
            return;
        }

        // Check mandatory fields (including file fields)
        const mandatoryFields = fieldAccess.filter((fa: any) => fa.is_mandatory);
        for (const mf of mandatoryFields) {
            const fieldCode = mf.field?.code;
            const fieldType = mf.field?.type;

            // For file fields, check uploadedFiles state
            if (fieldType === 'file') {
                if (fieldCode && (!uploadedFiles[fieldCode] || uploadedFiles[fieldCode].length === 0)) {
                    toast.error(`Field ${mf.field?.name} wajib diisi`);
                    return;
                }
            } else {
                // For other fields, check formData
                if (fieldCode && !formData[fieldCode]) {
                    toast.error(`Field ${mf.field?.name} wajib diisi`);
                    return;
                }
            }
        }

        // Add uploaded files to form data
        const dataWithFiles = { ...formData };
        Object.entries(uploadedFiles).forEach(([fieldCode, files]) => {
            dataWithFiles[fieldCode] = files.map(f => f.name);
        });

        createMutation.mutate({
            transaction_type_id: transactionType.id,
            data: dataWithFiles,
            created_by: user.id,
            branch_code: selectedBranch,
        });
    };

    const formatCurrency = (value: string) => {
        const number = value.replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(Number(number));
    };

    const handleFileChange = (fieldCode: string, files: FileList | null) => {
        if (!files) return;

        const validFiles: File[] = [];
        const fileArray = Array.from(files);

        for (const file of fileArray) {
            const validation = validateFile(file);
            if (!validation.valid) {
                toast.error(validation.error);
            } else {
                validFiles.push(file);
            }
        }

        if (validFiles.length > 0) {
            setUploadedFiles(prev => ({
                ...prev,
                [fieldCode]: [...(prev[fieldCode] || []), ...validFiles],
            }));
        }
    };

    const removeFile = (fieldCode: string, index: number) => {
        setUploadedFiles(prev => ({
            ...prev,
            [fieldCode]: prev[fieldCode].filter((_, i) => i !== index),
        }));
    };

    if (!typeCode || !transactionType) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Jenis transaksi tidak ditemukan</p>
                <Button variant="outline" onClick={() => navigate('/create')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali ke pilihan jenis transaksi
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/create')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-sm">{transactionType.code}</Badge>
                        <h1 className="text-2xl font-bold">{transactionType.name}</h1>
                    </div>
                    {transactionType.description && (
                        <p className="text-muted-foreground mt-1">{transactionType.description}</p>
                    )}
                </div>
            </div>

            {fieldsLoading ? (
                <Card>
                    <CardContent className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </CardContent>
                </Card>
            ) : visibleFields.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-center">
                            Tidak ada field yang dikonfigurasi untuk stage ini.<br />
                            <span className="text-sm">Hubungi Administrator untuk konfigurasi Field Access Matrix.</span>
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Form Fields Card */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Data Transaksi</CardTitle>
                            <CardDescription>
                                Lengkapi informasi berikut. Field bertanda <span className="text-destructive">*</span> wajib diisi.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6">
                                {/* Branch Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="branch">
                                        Kantor Cabang <span className="text-destructive">*</span>
                                    </Label>
                                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Pilih Kantor Cabang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {userBranches.length === 0 ? (
                                                <div className="p-3 text-sm text-muted-foreground text-center">
                                                    Tidak ada cabang yang di-assign ke Anda
                                                </div>
                                            ) : (
                                                userBranches.map((branch: any) => (
                                                    <SelectItem key={branch.code} value={branch.code}>
                                                        {branch.code} - {branch.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {userBranches.length === 0 && (
                                        <p className="text-xs text-destructive">
                                            Hubungi Administrator untuk assign kantor cabang ke akun Anda
                                        </p>
                                    )}
                                </div>

                                {visibleFields.map((fa: any) => (
                                    <FieldRenderer
                                        key={fa.id}
                                        fieldAccess={fa}
                                        form={form}
                                        formatCurrency={formatCurrency}
                                        uploadedFiles={uploadedFiles}
                                        onFileChange={handleFileChange}
                                        onRemoveFile={removeFile}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => navigate('/create')}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="min-w-[140px]"
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Submit
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}

// Field Renderer Component
function FieldRenderer({
    fieldAccess,
    form,
    formatCurrency,
    uploadedFiles,
    onFileChange,
    onRemoveFile,
}: {
    fieldAccess: any;
    form: any;
    formatCurrency: (v: string) => string;
    uploadedFiles: Record<string, File[]>;
    onFileChange: (code: string, files: FileList | null) => void;
    onRemoveFile: (code: string, index: number) => void;
}) {
    const field = fieldAccess.field;
    const isEditable = fieldAccess.is_editable;
    const isMandatory = fieldAccess.is_mandatory;

    const [dynamicOptions, setDynamicOptions] = useState<{ label: string; value: string }[]>([]);

    useEffect(() => {
        if (field?.type === 'select' && field?.source_table) {
            getSystemFieldOptions(field.source_table).then(setDynamicOptions);
        }
    }, [field?.source_table, field?.type]);

    const options = field?.source_table ? dynamicOptions : (field?.options || []);

    const renderField = () => {
        switch (field?.type) {
            case 'text':
                return (
                    <Input
                        id={field.code}
                        {...form.register(field.code)}
                        disabled={!isEditable}
                        placeholder={`Masukkan ${field.name.toLowerCase()}`}
                        className="h-11"
                    />
                );

            case 'number':
                return (
                    <Input
                        id={field.code}
                        type="number"
                        {...form.register(field.code)}
                        disabled={!isEditable}
                        placeholder="0"
                        className="h-11"
                    />
                );

            case 'currency':
                return (
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                            Rp
                        </span>
                        <Input
                            id={field.code}
                            className="pl-12 h-11 text-right font-mono"
                            {...form.register(field.code, {
                                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                    const formatted = formatCurrency(e.target.value);
                                    e.target.value = formatted;
                                },
                            })}
                            disabled={!isEditable}
                            placeholder="0"
                        />
                    </div>
                );

            case 'date':
                return (
                    <Input
                        id={field.code}
                        type="date"
                        {...form.register(field.code)}
                        disabled={!isEditable}
                        className="h-11"
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        id={field.code}
                        {...form.register(field.code)}
                        disabled={!isEditable}
                        className="w-full min-h-[120px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder={`Masukkan ${field.name.toLowerCase()}`}
                    />
                );

            case 'select':
                return (
                    <Controller
                        name={field.code}
                        control={form.control}
                        render={({ field: formField }) => (
                            <Select
                                value={formField.value || ''}
                                onValueChange={formField.onChange}
                                disabled={!isEditable}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder={`Pilih ${field.name.toLowerCase()}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.length === 0 ? (
                                        <div className="p-3 text-sm text-muted-foreground text-center">
                                            Tidak ada pilihan tersedia
                                        </div>
                                    ) : (
                                        options.map((opt: any) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    />
                );

            case 'file':
                const files = uploadedFiles[field.code] || [];
                return (
                    <div className="space-y-3">
                        {/* Upload Area */}
                        <label
                            htmlFor={field.code}
                            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${!isEditable
                                ? 'opacity-50 cursor-not-allowed bg-muted'
                                : 'hover:bg-muted/50 hover:border-primary/50'
                                }`}
                        >
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm font-medium">Klik untuk upload file</span>
                            <span className="text-xs text-muted-foreground mt-1">
                                Maks 5MB per file • PDF, Gambar, Office
                            </span>
                        </label>
                        <input
                            id={field.code}
                            type="file"
                            multiple
                            onChange={(e) => onFileChange(field.code, e.target.files)}
                            disabled={!isEditable}
                            className="hidden"
                        />

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="space-y-2">
                                {files.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                                    >
                                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 flex-shrink-0"
                                            onClick={() => onRemoveFile(field.code, idx)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'checkbox':
                return (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <input
                            type="checkbox"
                            id={field.code}
                            {...form.register(field.code)}
                            disabled={!isEditable}
                            className="h-5 w-5 rounded"
                        />
                        <span className="text-sm">{field.description || field.name}</span>
                    </div>
                );

            case 'statement':
                return (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">{field.description || field.name}</p>
                    </div>
                );

            default:
                return (
                    <Input
                        id={field.code}
                        {...form.register(field.code)}
                        disabled={!isEditable}
                        className="h-11"
                    />
                );
        }
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={field?.code} className="text-sm font-medium">
                {field?.name}
                {isMandatory && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field?.description && field?.type !== 'checkbox' && field?.type !== 'statement' && (
                <p className="text-xs text-muted-foreground -mt-1">{field.description}</p>
            )}
            {renderField()}
        </div>
    );
}
