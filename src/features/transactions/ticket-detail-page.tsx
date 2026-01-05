import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTransaction, getTransactionHistory } from '@/services/transactions.service';
import { getFieldAccess } from '@/services/field-access.service';
import { Button } from '@/components/ui/button';
import { FileList } from '@/components/ui/file-preview-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Loader2,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    History,
    RotateCcw,
} from 'lucide-react';

const STATUS_CONFIG = {
    OPEN: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
    CLOSED: { label: 'Closed', className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
};

const ACTION_CONFIG = {
    CREATED: { label: 'Dibuat', icon: FileText, color: 'text-blue-600' },
    APPROVED: { label: 'Disetujui', icon: CheckCircle, color: 'text-green-600' },
    REJECTED: { label: 'Ditolak', icon: XCircle, color: 'text-red-600' },
    RETURNED: { label: 'Dikembalikan', icon: RotateCcw, color: 'text-orange-600' },
};

export function TicketDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: transaction, isLoading } = useQuery({
        queryKey: ['transaction', id],
        queryFn: () => getTransaction(id!),
        enabled: !!id,
    });

    const { data: history = [] } = useQuery({
        queryKey: ['transaction-history', id],
        queryFn: () => getTransactionHistory(id!),
        enabled: !!id,
    });

    const { data: fieldAccess = [] } = useQuery({
        queryKey: ['field-access', transaction?.transaction_type?.id, transaction?.current_stage],
        queryFn: () => getFieldAccess(transaction?.transaction_type?.id, transaction?.current_stage),
        enabled: !!transaction,
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value.replace(/\D/g, '')) : value;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(num);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!transaction) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Transaksi tidak ditemukan</p>
                <Button variant="link" onClick={() => navigate('/my-tickets')}>
                    Kembali ke daftar tiket
                </Button>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[transaction.status as keyof typeof STATUS_CONFIG];
    const visibleFields = fieldAccess.filter((fa: any) => fa.is_visible);

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/my-tickets')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-semibold font-mono">{transaction.ticket_number}</h1>
                        <Badge className={statusConfig?.className}>{statusConfig?.label}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        {transaction.transaction_type?.code} - {transaction.transaction_type?.name}
                    </p>
                </div>
            </div>

            {/* Status Progress */}
            <Card className="bg-muted/50">
                <CardContent className="p-4">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Current Stage</span>
                            <p className="font-medium">{transaction.current_stage}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Status</span>
                            <p className="font-medium">{statusConfig?.label}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Created</span>
                            <p className="font-medium">{formatDate(transaction.created_at)}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Last Update</span>
                            <p className="font-medium">{formatDate(transaction.updated_at)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="data">
                <TabsList>
                    <TabsTrigger value="data">
                        <FileText className="h-4 w-4 mr-2" />
                        Data Transaksi
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="h-4 w-4 mr-2" />
                        History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="data" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Transaksi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {visibleFields.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">
                                    Tidak ada data untuk ditampilkan
                                </p>
                            ) : (
                                <div className="grid gap-4">
                                    {visibleFields.map((fa: any) => {
                                        const field = fa.field;
                                        const value = transaction.data?.[field?.code];

                                        // Render field value based on type
                                        const renderFieldValue = () => {
                                            if (!value) return '-';

                                            if (field?.type === 'currency') {
                                                return formatCurrency(value);
                                            }

                                            if (field?.type === 'file') {
                                                // File field - render FileList with preview/download
                                                const files = Array.isArray(value) ? value : [value];
                                                return (
                                                    <FileList
                                                        files={files}
                                                        transactionId={transaction.id}
                                                        fieldCode={field.code}
                                                    />
                                                );
                                            }

                                            // Default: render as string
                                            return String(value);
                                        };

                                        return (
                                            <div key={fa.id} className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
                                                <div className="font-medium text-muted-foreground">{field?.name}</div>
                                                <div className="col-span-2">
                                                    {renderFieldValue()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
                                <div className="space-y-6">
                                    {history.map((h: any) => {
                                        const actionCfg = ACTION_CONFIG[h.action as keyof typeof ACTION_CONFIG];
                                        const ActionIcon = actionCfg?.icon || Clock;

                                        return (
                                            <div key={h.id} className="relative flex gap-4">
                                                <div
                                                    className={`z-10 flex-shrink-0 w-10 h-10 rounded-full bg-background border-2 flex items-center justify-center ${actionCfg?.color}`}
                                                >
                                                    <ActionIcon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 pt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{actionCfg?.label}</span>
                                                        <Badge variant="outline">{h.stage_code}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {h.actor?.full_name} • {formatDate(h.created_at)}
                                                    </p>
                                                    {h.comment && (
                                                        <p className="mt-2 text-sm p-2 bg-muted rounded">{h.comment}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
