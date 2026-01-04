import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTransaction,
    getTransactionHistory,
    processTransaction,
} from '@/services/transactions.service';
import { getFieldAccess } from '@/services/field-access.service';
import { getRoutingMatrix } from '@/services/routing.service';
import { getStatements } from '@/services/statements.service';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Loader2,
    ArrowLeft,
    CheckCircle,
    XCircle,
    RotateCcw,
    Clock,
    User,
    FileText,
    History,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
    OPEN: { label: 'Open', variant: 'default' as const, className: 'bg-blue-100 text-blue-700' },
    CLOSED: { label: 'Closed', variant: 'secondary' as const, className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejected', variant: 'destructive' as const, className: 'bg-red-100 text-red-700' },
};

const ACTION_CONFIG = {
    CREATED: { label: 'Dibuat', icon: FileText, color: 'text-blue-600' },
    APPROVED: { label: 'Disetujui', icon: CheckCircle, color: 'text-green-600' },
    REJECTED: { label: 'Ditolak', icon: XCircle, color: 'text-red-600' },
    RETURNED: { label: 'Dikembalikan', icon: RotateCcw, color: 'text-orange-600' },
};

export function ProcessTransactionPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | null>(null);
    const [comment, setComment] = useState('');
    const [statementsAccepted, setStatementsAccepted] = useState<Record<number, boolean>>({});

    // Fetch transaction
    const { data: transaction, isLoading: txLoading } = useQuery({
        queryKey: ['transaction', id],
        queryFn: () => getTransaction(id!),
        enabled: !!id,
    });

    // Fetch history
    const { data: history = [] } = useQuery({
        queryKey: ['transaction-history', id],
        queryFn: () => getTransactionHistory(id!),
        enabled: !!id,
    });

    // Fetch field access for current stage
    const { data: fieldAccess = [] } = useQuery({
        queryKey: ['field-access', transaction?.transaction_type?.id, transaction?.current_stage],
        queryFn: () => getFieldAccess(transaction?.transaction_type?.id, transaction?.current_stage),
        enabled: !!transaction?.transaction_type?.id && !!transaction?.current_stage,
    });

    // Fetch routing to check if user can process
    const { data: routing = [] } = useQuery({
        queryKey: ['routing-matrix', transaction?.transaction_type?.id],
        queryFn: () => getRoutingMatrix(transaction?.transaction_type?.id),
        enabled: !!transaction?.transaction_type?.id,
    });

    // Fetch statements for current stage
    const { data: statements = [] } = useQuery({
        queryKey: ['statements', transaction?.transaction_type?.id, transaction?.current_stage],
        queryFn: () => getStatements(transaction?.transaction_type?.id, transaction?.current_stage),
        enabled: !!transaction?.transaction_type?.id && !!transaction?.current_stage,
    });

    const currentStageInfo = routing.find(
        (r: any) => r.stage_code === transaction?.current_stage
    );
    const canProcess =
        user?.role?.code === currentStageInfo?.role?.code &&
        transaction?.status === 'OPEN';

    // Process mutation
    const processMutation = useMutation({
        mutationFn: ({
            action,
            comment,
        }: {
            action: 'APPROVED' | 'REJECTED';
            comment?: string;
        }) => processTransaction(id!, action, user?.id || '', comment),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['transaction', id] });
            queryClient.invalidateQueries({ queryKey: ['transaction-history', id] });
            queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
            toast.success(
                actionDialog === 'approve'
                    ? 'Transaksi berhasil disetujui'
                    : 'Transaksi berhasil ditolak'
            );
            setActionDialog(null);
            if (data.status !== 'OPEN') {
                navigate('/tasks');
            }
        },
        onError: (error: Error) => {
            toast.error(`Gagal memproses: ${error.message}`);
        },
    });

    const handleAction = () => {
        if (!actionDialog) return;

        // Check if all required statements are accepted for approval
        if (actionDialog === 'approve') {
            const requiredStatements = statements.filter((s: any) => s.is_required);
            const allAccepted = requiredStatements.every((s: any) => statementsAccepted[s.id]);
            if (!allAccepted) {
                return;
            }
        }

        processMutation.mutate({
            action: actionDialog === 'approve' ? 'APPROVED' : 'REJECTED',
            comment,
        });
    };

    // Check if all required statements are accepted
    const allRequiredStatementsAccepted = statements
        .filter((s: any) => s.is_required)
        .every((s: any) => statementsAccepted[s.id]);

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

    if (txLoading) {
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
                <Button variant="link" onClick={() => navigate('/tasks')}>
                    Kembali ke daftar tugas
                </Button>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[transaction.status as keyof typeof STATUS_CONFIG];
    const visibleFields = fieldAccess.filter((fa: any) => fa.is_visible);

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold font-mono">
                                {transaction.ticket_number}
                            </h1>
                            <Badge className={statusConfig?.className}>{statusConfig?.label}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            {transaction.transaction_type?.code} - {transaction.transaction_type?.name}
                        </p>
                    </div>
                </div>

                {canProcess && (
                    <div className="flex gap-2">
                        <Button variant="outline" className="text-red-600" onClick={() => setActionDialog('reject')}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Tolak
                        </Button>
                        <Button onClick={() => setActionDialog('approve')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Setujui
                        </Button>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <Card className="bg-muted/50">
                <CardContent className="p-4">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Current Stage</span>
                            <p className="font-medium">{transaction.current_stage}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Handler</span>
                            <p className="font-medium">{currentStageInfo?.role?.name || '-'}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Created By</span>
                            <p className="font-medium">{transaction.creator?.full_name}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Created At</span>
                            <p className="font-medium">{formatDate(transaction.created_at)}</p>
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
                                    Tidak ada field yang ditampilkan untuk stage ini
                                </p>
                            ) : (
                                <div className="grid gap-4">
                                    {visibleFields.map((fa: any) => {
                                        const field = fa.field;
                                        const value = transaction.data?.[field?.code];

                                        return (
                                            <div key={fa.id} className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
                                                <div className="font-medium text-muted-foreground">
                                                    {field?.name}
                                                </div>
                                                <div className="col-span-2">
                                                    {field?.type === 'currency' && value
                                                        ? formatCurrency(value)
                                                        : value || '-'}
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
                                    {history.map((h: any, idx: number) => {
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

            {/* Action Dialog */}
            <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionDialog === 'approve' ? 'Setujui Transaksi' : 'Tolak Transaksi'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionDialog === 'approve'
                                ? 'Transaksi akan dilanjutkan ke stage berikutnya'
                                : 'Transaksi akan ditolak dan tidak dapat diproses kembali'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {actionDialog === 'approve' && statements.length > 0 && (
                            <div className="space-y-3">
                                <Label>Saya menyatakan bahwa :</Label>
                                {statements.map((stmt: any) => (
                                    <label
                                        key={stmt.id}
                                        htmlFor={`stmt-${stmt.id}`}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${statementsAccepted[stmt.id]
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-muted/30 hover:bg-muted/50'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`stmt-${stmt.id}`}
                                            checked={statementsAccepted[stmt.id] || false}
                                            onChange={(e) =>
                                                setStatementsAccepted({ ...statementsAccepted, [stmt.id]: e.target.checked })
                                            }
                                            className="h-4 w-4 mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <span className="text-sm">{stmt.text}</span>
                                            {stmt.is_required && (
                                                <span className="text-destructive ml-1">*</span>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="comment">
                                Komentar {actionDialog === 'reject' && '(wajib)'}
                            </Label>
                            <textarea
                                id="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                                placeholder={
                                    actionDialog === 'approve'
                                        ? 'Komentar tambahan (opsional)'
                                        : 'Masukkan alasan penolakan'
                                }
                                required={actionDialog === 'reject'}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog(null)}>
                            Batal
                        </Button>
                        <Button
                            variant={actionDialog === 'reject' ? 'destructive' : 'default'}
                            onClick={handleAction}
                            disabled={
                                processMutation.isPending ||
                                (actionDialog === 'reject' && !comment) ||
                                (actionDialog === 'approve' && statements.length > 0 && !allRequiredStatementsAccepted)
                            }
                        >
                            {processMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {actionDialog === 'approve' ? 'Setujui' : 'Tolak'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
