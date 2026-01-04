import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMyTickets } from '@/services/transactions.service';
import { getUserBranches } from '@/services/user-branches.service';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Loader2, Eye, Clock, CheckCircle, XCircle, AlertTriangle, Building2 } from 'lucide-react';

const STATUS_CONFIG = {
    OPEN: { label: 'Open', variant: 'default' as const, icon: Clock },
    CLOSED: { label: 'Closed', variant: 'secondary' as const, icon: CheckCircle },
    REJECTED: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
};

const SLA_CONFIG = {
    ON_TRACK: { label: 'On Track', className: 'bg-green-100 text-green-700' },
    WARNING: { label: 'Warning', className: 'bg-yellow-100 text-yellow-700' },
    AT_RISK: { label: 'At Risk', className: 'bg-orange-100 text-orange-700' },
    BREACHED: { label: 'Breached', className: 'bg-red-100 text-red-700' },
};

export function MyTicketsPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [selectedBranch, setSelectedBranch] = useState<string>('all');

    // Get user's assigned branches
    const { data: userBranches = [] } = useQuery({
        queryKey: ['user-branches', user?.id],
        queryFn: () => getUserBranches(user?.id || ''),
        enabled: !!user?.id,
    });

    const { data: tickets = [], isLoading } = useQuery({
        queryKey: ['my-tickets', user?.id],
        queryFn: () => getMyTickets(user?.id || ''),
        enabled: !!user?.id,
    });

    // Filter by selected branch
    const filteredTickets = selectedBranch === 'all'
        ? tickets
        : tickets.filter((t: any) => t.branch_code === selectedBranch);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">My Tickets</h1>
                    <p className="text-muted-foreground">Daftar transaksi yang Anda buat</p>
                </div>
                {userBranches.length > 1 && (
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                            <SelectTrigger className="w-48">
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
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Tidak ada transaksi ditemukan</p>
                            <Button variant="link" onClick={() => navigate('/create')}>
                                Buat transaksi baru
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ticket #</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Current Stage</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>SLA</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="w-20">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTickets.map((ticket: any) => {
                                    const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG];
                                    const slaConfig = SLA_CONFIG[ticket.sla_status as keyof typeof SLA_CONFIG];
                                    const StatusIcon = statusConfig?.icon || Clock;

                                    return (
                                        <TableRow key={ticket.id}>
                                            <TableCell className="font-mono font-medium">
                                                {ticket.ticket_number}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {ticket.transaction_type?.code}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{ticket.current_stage}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusConfig?.variant}>
                                                    <StatusIcon className="h-3 w-3 mr-1" />
                                                    {statusConfig?.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {ticket.status === 'OPEN' && slaConfig && (
                                                    <Badge className={slaConfig.className}>
                                                        {slaConfig.label}
                                                    </Badge>
                                                )}
                                                {ticket.status !== 'OPEN' && (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {formatDate(ticket.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => navigate(`/my-tickets/${ticket.id}`)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
