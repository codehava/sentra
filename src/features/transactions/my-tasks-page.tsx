import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getTasksForRole } from '@/services/transactions.service';
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
import { Loader2, ClipboardList, Clock, AlertTriangle, Play, Building2 } from 'lucide-react';

const SLA_CONFIG = {
    ON_TRACK: { label: 'On Track', className: 'bg-green-100 text-green-700', icon: Clock },
    WARNING: { label: 'Warning', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
    AT_RISK: { label: 'At Risk', className: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
    BREACHED: { label: 'Breached', className: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export function MyTasksPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const roleCode = user?.role?.code || '';
    const [selectedBranch, setSelectedBranch] = useState<string>('all');

    // Get user's assigned branches
    const { data: userBranches = [] } = useQuery({
        queryKey: ['user-branches', user?.id],
        queryFn: () => getUserBranches(user?.id || ''),
        enabled: !!user?.id,
    });

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['my-tasks', roleCode, user?.id],
        queryFn: () => getTasksForRole(roleCode, user?.id),
        enabled: !!roleCode && !!user?.id,
    });

    // Filter tasks by selected branch
    const filteredTasks = selectedBranch === 'all'
        ? tasks
        : tasks.filter((t: any) => t.branch_code === selectedBranch);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTimeRemaining = (deadline?: string) => {
        if (!deadline) return null;
        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diff = deadlineDate.getTime() - now.getTime();

        if (diff < 0) {
            const overdue = Math.abs(diff) / (1000 * 60 * 60);
            return `+${overdue.toFixed(1)} jam`;
        }

        const hours = diff / (1000 * 60 * 60);
        if (hours < 1) {
            return `${Math.round(hours * 60)} menit`;
        }
        return `${hours.toFixed(1)} jam`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">My Tasks</h1>
                    <p className="text-muted-foreground">
                        Transaksi yang menunggu tindakan Anda sebagai <Badge variant="outline">{roleCode}</Badge>
                    </p>
                </div>
                <div className="flex items-center gap-4">
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
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                        {filteredTasks.length} tugas
                    </Badge>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Tidak ada tugas yang menunggu</p>
                            <p className="text-sm mt-1">Anda sudah menyelesaikan semua tugas 🎉</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ticket #</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Creator</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>SLA Status</TableHead>
                                    <TableHead>Time Remaining</TableHead>
                                    <TableHead>Received</TableHead>
                                    <TableHead className="w-24">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.map((task: any) => {
                                    const slaConfig = SLA_CONFIG[task.sla_status as keyof typeof SLA_CONFIG];
                                    const SlaIcon = slaConfig?.icon || Clock;
                                    const timeRemaining = getTimeRemaining(task.stage_sla_deadline);

                                    return (
                                        <TableRow
                                            key={task.id}
                                            className={task.sla_status === 'BREACHED' ? 'bg-red-50' : ''}
                                        >
                                            <TableCell className="font-mono font-medium">
                                                {task.ticket_number}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {task.transaction_type?.code}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{task.creator?.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{task.creator?.nip}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{task.current_stage}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {slaConfig && (
                                                    <Badge className={slaConfig.className}>
                                                        <SlaIcon className="h-3 w-3 mr-1" />
                                                        {slaConfig.label}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {timeRemaining && (
                                                    <span className={task.sla_status === 'BREACHED' ? 'text-red-600 font-medium' : ''}>
                                                        {timeRemaining}
                                                    </span>
                                                )}
                                                {!timeRemaining && <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {formatDate(task.stage_started_at)}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    onClick={() => navigate(`/tasks/${task.id}`)}
                                                >
                                                    <Play className="h-4 w-4 mr-1" />
                                                    Process
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
