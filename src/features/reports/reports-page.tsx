import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactionTypes } from '@/services/transaction-types.service';
import { getTransactionReport, getReportSummary, getStageHistoryReport } from '@/services/reports.service';
import { getUserBranches } from '@/services/user-branches.service';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Loader2,
    Download,
    Search,
    Filter,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Building2,
    Settings2,
} from 'lucide-react';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'OPEN', label: 'Open' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'REJECTED', label: 'Rejected' },
];

const SLA_OPTIONS = [
    { value: 'all', label: 'All SLA Status' },
    { value: 'ON_TRACK', label: 'On Track' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'AT_RISK', label: 'At Risk' },
    { value: 'BREACHED', label: 'Breached' },
];

const STATUS_CONFIG = {
    OPEN: { color: 'bg-blue-100 text-blue-700', icon: Clock },
    CLOSED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
    REJECTED: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

const SLA_CONFIG = {
    ON_TRACK: { color: 'bg-green-100 text-green-700' },
    WARNING: { color: 'bg-yellow-100 text-yellow-700' },
    AT_RISK: { color: 'bg-orange-100 text-orange-700' },
    BREACHED: { color: 'bg-red-100 text-red-700' },
};

// Exportable fields configuration
const EXPORT_FIELDS = [
    { key: 'ticket_number', label: 'Ticket Number', default: true },
    { key: 'transaction_type_code', label: 'Transaction Type', default: true },
    { key: 'branch_code', label: 'Kantor Cabang', default: true },
    { key: 'status', label: 'Status', default: true },
    { key: 'sla_status', label: 'SLA Status', default: true },
    { key: 'current_stage', label: 'Current Stage', default: true },
    { key: 'creator_name', label: 'Creator Name', default: true },
    { key: 'creator_nip', label: 'Creator NIP', default: false },
    { key: 'created_at', label: 'Created At', default: true },
    { key: 'updated_at', label: 'Updated At', default: false },
    { key: 'stage_started_at', label: 'Stage Started At', default: false },
    { key: 'stage_sla_deadline', label: 'SLA Deadline', default: false },
];

export function ReportsPage() {
    const { user } = useAuthStore();
    const [showFieldSelector, setShowFieldSelector] = useState(false);
    const [selectedFields, setSelectedFields] = useState<string[]>(
        EXPORT_FIELDS.filter(f => f.default).map(f => f.key)
    );
    const [filters, setFilters] = useState({
        transactionTypeId: 'all',
        branchCode: 'all',
        status: 'all',
        slaStatus: 'all',
        dateFrom: '',
        dateTo: '',
    });

    // Get user's assigned branches
    const { data: userBranches = [] } = useQuery({
        queryKey: ['user-branches', user?.id],
        queryFn: () => getUserBranches(user?.id || ''),
        enabled: !!user?.id,
    });

    const { data: types = [] } = useQuery({
        queryKey: ['transaction-types'],
        queryFn: getTransactionTypes,
    });

    const buildFilters = () => ({
        transactionTypeId: filters.transactionTypeId !== 'all' ? parseInt(filters.transactionTypeId) : undefined,
        branchCode: filters.branchCode !== 'all' ? filters.branchCode : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        slaStatus: filters.slaStatus !== 'all' ? filters.slaStatus : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
    });

    const { data: transactions = [], isLoading, refetch } = useQuery({
        queryKey: ['report-transactions', filters],
        queryFn: () => getTransactionReport(buildFilters()),
    });

    const { data: summary } = useQuery({
        queryKey: ['report-summary', filters],
        queryFn: () => getReportSummary(buildFilters()),
    });

    const handleExport = () => {
        const filename = `sentra-report-${new Date().toISOString().split('T')[0]}`;

        // Build headers from selected fields
        const headers = selectedFields.map(key =>
            EXPORT_FIELDS.find(f => f.key === key)?.label || key
        );

        // Build rows from selected fields
        const rows = transactions.map((tx: any) =>
            selectedFields.map(key => {
                switch (key) {
                    case 'ticket_number': return tx.ticket_number;
                    case 'transaction_type_code': return tx.transaction_type?.code || '';
                    case 'branch_code': return tx.branch_code || '';
                    case 'status': return tx.status;
                    case 'sla_status': return tx.sla_status || '';
                    case 'current_stage': return tx.current_stage;
                    case 'creator_name': return tx.creator?.full_name || '';
                    case 'creator_nip': return tx.creator?.nip || '';
                    case 'created_at': return new Date(tx.created_at).toLocaleString('id-ID');
                    case 'updated_at': return new Date(tx.updated_at).toLocaleString('id-ID');
                    case 'stage_started_at': return tx.stage_started_at ? new Date(tx.stage_started_at).toLocaleString('id-ID') : '';
                    case 'stage_sla_deadline': return tx.stage_sla_deadline ? new Date(tx.stage_sla_deadline).toLocaleString('id-ID') : '';
                    default: return '';
                }
            })
        );

        // Generate CSV
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleField = (key: string) => {
        setSelectedFields(prev =>
            prev.includes(key)
                ? prev.filter(k => k !== key)
                : [...prev, key]
        );
    };

    const selectAllFields = () => setSelectedFields(EXPORT_FIELDS.map(f => f.key));
    const selectDefaultFields = () => setSelectedFields(EXPORT_FIELDS.filter(f => f.default).map(f => f.key));

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Transaction Reports</h1>
                    <p className="text-muted-foreground">Laporan dan analisis transaksi</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setShowFieldSelector(true)}>
                        <Settings2 className="h-4 w-4 mr-2" />
                        Fields ({selectedFields.length})
                    </Button>
                    <Button onClick={handleExport} disabled={transactions.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    {user?.role?.code === 'ADMIN' && (
                        <Button
                            variant="secondary"
                            onClick={async () => {
                                const filename = `sentra-stage-history-${new Date().toISOString().split('T')[0]}`;
                                const data = await getStageHistoryReport(buildFilters());

                                const headers = [
                                    'Ticket Number',
                                    'Transaction Type',
                                    'Branch',
                                    'Stage',
                                    'Action',
                                    'Action By',
                                    'NIP',
                                    'Start Time',
                                    'End Time',
                                    'Duration (Hours)',
                                    'Comment'
                                ];

                                const csvContent = [
                                    headers.join(','),
                                    ...data.map(row => [
                                        row.ticket_number,
                                        row.transaction_type,
                                        row.branch_code,
                                        row.stage_code,
                                        row.action,
                                        row.action_by,
                                        row.action_by_nip,
                                        row.start_time,
                                        row.end_time,
                                        row.duration_hours,
                                        row.comment
                                    ].map(cell => `"${cell || ''}"`).join(','))
                                ].join('\n');

                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                link.setAttribute('href', URL.createObjectURL(blob));
                                link.setAttribute('download', `${filename}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            disabled={transactions.length === 0}
                        >
                            <Clock className="h-4 w-4 mr-2" />
                            Export Stage History
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Transaction Type</Label>
                            <Select
                                value={filters.transactionTypeId}
                                onValueChange={(v) => setFilters({ ...filters, transactionTypeId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {types.map((t: any) => (
                                        <SelectItem key={t.id} value={String(t.id)}>
                                            {t.code} - {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {userBranches.length > 0 && (
                            <div className="space-y-2">
                                <Label>Kantor Cabang</Label>
                                <Select
                                    value={filters.branchCode}
                                    onValueChange={(v) => setFilters({ ...filters, branchCode: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Semua Cabang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Cabang</SelectItem>
                                        {userBranches.map((branch: any) => (
                                            <SelectItem key={branch.code} value={branch.code}>
                                                {branch.code} - {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={filters.status}
                                onValueChange={(v) => setFilters({ ...filters, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>SLA Status</Label>
                            <Select
                                value={filters.slaStatus}
                                onValueChange={(v) => setFilters({ ...filters, slaStatus: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SLA_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>From Date</Label>
                            <Input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>To Date</Label>
                            <Input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold">{summary?.total || 0}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{summary?.open || 0}</p>
                        <p className="text-sm text-muted-foreground">Open</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{summary?.closed || 0}</p>
                        <p className="text-sm text-muted-foreground">Closed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-red-600">{summary?.rejected || 0}</p>
                        <p className="text-sm text-muted-foreground">Rejected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-orange-600">{summary?.breached || 0}</p>
                        <p className="text-sm text-muted-foreground">SLA Breached</p>
                    </CardContent>
                </Card>
            </div>

            {/* SLA by Stage and Transaction Type */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* SLA by Stage */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">SLA per Stage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const stageStats = transactions.reduce((acc: any, tx: any) => {
                                if (tx.status !== 'OPEN') return acc;
                                const stage = tx.current_stage || 'Unknown';
                                if (!acc[stage]) {
                                    acc[stage] = { ON_TRACK: 0, WARNING: 0, AT_RISK: 0, BREACHED: 0 };
                                }
                                const sla = tx.sla_status || 'ON_TRACK';
                                if (acc[stage][sla] !== undefined) acc[stage][sla]++;
                                return acc;
                            }, {});

                            const stages = Object.keys(stageStats);
                            if (stages.length === 0) {
                                return <p className="text-sm text-muted-foreground">Tidak ada data</p>;
                            }

                            return (
                                <div className="space-y-3">
                                    {stages.map(stage => (
                                        <div key={stage} className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{stage}</span>
                                            <div className="flex gap-2">
                                                <Badge className="bg-green-100 text-green-700 text-xs">
                                                    {stageStats[stage].ON_TRACK + (stageStats[stage].WARNING || 0)}
                                                </Badge>
                                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                                    {stageStats[stage].AT_RISK}
                                                </Badge>
                                                <Badge className="bg-red-100 text-red-700 text-xs">
                                                    {stageStats[stage].BREACHED}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-4 pt-2 border-t text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <div className="h-2 w-2 rounded bg-green-500"></div> On Track
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <div className="h-2 w-2 rounded bg-orange-500"></div> At Risk
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <div className="h-2 w-2 rounded bg-red-500"></div> Breached
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>

                {/* SLA by Transaction Type */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">SLA per Jenis Transaksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const typeStats = transactions.reduce((acc: any, tx: any) => {
                                if (tx.status !== 'OPEN') return acc;
                                const type = tx.transaction_type?.code || 'Unknown';
                                if (!acc[type]) {
                                    acc[type] = { ON_TRACK: 0, WARNING: 0, AT_RISK: 0, BREACHED: 0 };
                                }
                                const sla = tx.sla_status || 'ON_TRACK';
                                if (acc[type][sla] !== undefined) acc[type][sla]++;
                                return acc;
                            }, {});

                            const types = Object.keys(typeStats);
                            if (types.length === 0) {
                                return <p className="text-sm text-muted-foreground">Tidak ada data</p>;
                            }

                            return (
                                <div className="space-y-3">
                                    {types.map(type => (
                                        <div key={type} className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{type}</span>
                                            <div className="flex gap-2">
                                                <Badge className="bg-green-100 text-green-700 text-xs">
                                                    {typeStats[type].ON_TRACK + (typeStats[type].WARNING || 0)}
                                                </Badge>
                                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                                    {typeStats[type].AT_RISK}
                                                </Badge>
                                                <Badge className="bg-red-100 text-red-700 text-xs">
                                                    {typeStats[type].BREACHED}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-4 pt-2 border-t text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <div className="h-2 w-2 rounded bg-green-500"></div> On Track
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <div className="h-2 w-2 rounded bg-orange-500"></div> At Risk
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <div className="h-2 w-2 rounded bg-red-500"></div> Breached
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            </div>

            {/* TAT (Turn Around Time) Statistics */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* TAT by Stage (from history) - simplified: use stage_started_at */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">TAT per Stage (Rata-rata)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            // Calculate TAT for CLOSED transactions based on how long they spent in current stage
                            const openTx = transactions.filter((tx: any) => tx.status === 'OPEN' && tx.stage_started_at);
                            const stageStats: Record<string, { total: number; count: number; min: number; max: number }> = {};

                            openTx.forEach((tx: any) => {
                                const stage = tx.current_stage || 'Unknown';
                                const startTime = new Date(tx.stage_started_at).getTime();
                                const now = Date.now();
                                const hours = (now - startTime) / (1000 * 60 * 60);

                                if (!stageStats[stage]) {
                                    stageStats[stage] = { total: 0, count: 0, min: Infinity, max: 0 };
                                }
                                stageStats[stage].total += hours;
                                stageStats[stage].count++;
                                stageStats[stage].min = Math.min(stageStats[stage].min, hours);
                                stageStats[stage].max = Math.max(stageStats[stage].max, hours);
                            });

                            const stages = Object.keys(stageStats);
                            if (stages.length === 0) {
                                return <p className="text-sm text-muted-foreground">Tidak ada data transaksi aktif</p>;
                            }

                            const formatTime = (hours: number) => {
                                if (hours < 1) return `${Math.round(hours * 60)} menit`;
                                if (hours < 24) return `${hours.toFixed(1)} jam`;
                                return `${(hours / 24).toFixed(1)} hari`;
                            };

                            return (
                                <div className="space-y-3">
                                    {stages.map(stage => {
                                        const avg = stageStats[stage].total / stageStats[stage].count;
                                        return (
                                            <div key={stage} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">{stage}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        {stageStats[stage].count} transaksi
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Badge variant="outline">Avg: {formatTime(avg)}</Badge>
                                                    <Badge variant="outline" className="text-green-600">Min: {formatTime(stageStats[stage].min)}</Badge>
                                                    <Badge variant="outline" className="text-red-600">Max: {formatTime(stageStats[stage].max)}</Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>

                {/* TAT by Transaction Type */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">TAT per Jenis Transaksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            // Calculate TAT for CLOSED transactions (total time from created to closed)
                            const closedTx = transactions.filter((tx: any) => tx.status === 'CLOSED');
                            const typeStats: Record<string, { total: number; count: number; min: number; max: number }> = {};

                            closedTx.forEach((tx: any) => {
                                const type = tx.transaction_type?.code || 'Unknown';
                                const createdTime = new Date(tx.created_at).getTime();
                                const closedTime = new Date(tx.updated_at).getTime();
                                const hours = (closedTime - createdTime) / (1000 * 60 * 60);

                                if (!typeStats[type]) {
                                    typeStats[type] = { total: 0, count: 0, min: Infinity, max: 0 };
                                }
                                typeStats[type].total += hours;
                                typeStats[type].count++;
                                typeStats[type].min = Math.min(typeStats[type].min, hours);
                                typeStats[type].max = Math.max(typeStats[type].max, hours);
                            });

                            const types = Object.keys(typeStats);
                            if (types.length === 0) {
                                return <p className="text-sm text-muted-foreground">Tidak ada transaksi selesai</p>;
                            }

                            const formatTime = (hours: number) => {
                                if (hours < 1) return `${Math.round(hours * 60)} menit`;
                                if (hours < 24) return `${hours.toFixed(1)} jam`;
                                return `${(hours / 24).toFixed(1)} hari`;
                            };

                            return (
                                <div className="space-y-3">
                                    {types.map(type => {
                                        const avg = typeStats[type].total / typeStats[type].count;
                                        return (
                                            <div key={type} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">{type}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        {typeStats[type].count} selesai
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Badge variant="outline">Avg: {formatTime(avg)}</Badge>
                                                    <Badge variant="outline" className="text-green-600">Min: {formatTime(typeStats[type].min)}</Badge>
                                                    <Badge variant="outline" className="text-red-600">Max: {formatTime(typeStats[type].max)}</Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Tidak ada data transaksi</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ticket #</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>SLA</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Creator</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx: any) => {
                                    const statusCfg = STATUS_CONFIG[tx.status as keyof typeof STATUS_CONFIG];
                                    const slaCfg = SLA_CONFIG[tx.sla_status as keyof typeof SLA_CONFIG];
                                    const StatusIcon = statusCfg?.icon || Clock;

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-mono">{tx.ticket_number}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{tx.transaction_type?.code}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusCfg?.color}>
                                                    <StatusIcon className="h-3 w-3 mr-1" />
                                                    {tx.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {tx.sla_status && (
                                                    <Badge className={slaCfg?.color}>{tx.sla_status}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{tx.current_stage}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm">{tx.creator?.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{tx.creator?.nip}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {formatDate(tx.created_at)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Field Selector Dialog */}
            <Dialog open={showFieldSelector} onOpenChange={setShowFieldSelector}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pilih Fields untuk Export</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex gap-2 mb-4">
                            <Button variant="outline" size="sm" onClick={selectAllFields}>
                                Pilih Semua
                            </Button>
                            <Button variant="outline" size="sm" onClick={selectDefaultFields}>
                                Reset Default
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {EXPORT_FIELDS.map((field) => (
                                <label
                                    key={field.key}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${selectedFields.includes(field.key)
                                        ? 'bg-primary/10'
                                        : 'hover:bg-muted'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedFields.includes(field.key)}
                                        onChange={() => toggleField(field.key)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm">{field.label}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            {selectedFields.length} dari {EXPORT_FIELDS.length} field dipilih
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowFieldSelector(false)}>
                            Selesai
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
