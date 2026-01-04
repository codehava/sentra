import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    ClipboardList,
    FileText,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    Loader2,
    TrendingUp,
    ArrowRight,
    Building2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { getUserBranches } from '@/services/user-branches.service';
import {
    getDashboardStats,
    getSlaBreachedTransactions,
    getSlaAtRiskTransactions,
} from '@/services/dashboard.service';

export function DashboardPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [selectedBranch, setSelectedBranch] = useState<string>('all');

    // Get user's assigned branches
    const { data: userBranches = [] } = useQuery({
        queryKey: ['user-branches', user?.id],
        queryFn: () => getUserBranches(user?.id || ''),
        enabled: !!user?.id,
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats', user?.id, user?.role?.code, selectedBranch],
        queryFn: () => getDashboardStats(user?.id, user?.role?.code, selectedBranch),
        enabled: !!user,
    });

    const { data: breached = [] } = useQuery({
        queryKey: ['sla-breached'],
        queryFn: () => getSlaBreachedTransactions(5),
    });

    const { data: atRisk = [] } = useQuery({
        queryKey: ['sla-at-risk'],
        queryFn: () => getSlaAtRiskTransactions(5),
    });

    const statCards = [
        {
            title: 'My Tasks',
            value: stats?.myTasks || 0,
            icon: ClipboardList,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50',
            link: '/tasks',
        },
        {
            title: 'My Tickets',
            value: stats?.totalCreated || 0,
            icon: FileText,
            color: 'text-purple-500',
            bgColor: 'bg-purple-50',
            link: '/my-tickets',
        },
        {
            title: 'Completed',
            value: stats?.completedThisMonth || 0,
            icon: CheckCircle,
            color: 'text-green-500',
            bgColor: 'bg-green-50',
        },
        {
            title: 'Pending',
            value: stats?.pendingApproval || 0,
            icon: Clock,
            color: 'text-orange-500',
            bgColor: 'bg-orange-50',
        },
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Selamat pagi';
        if (hour < 15) return 'Selamat siang';
        if (hour < 18) return 'Selamat sore';
        return 'Selamat malam';
    };

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return `${Math.floor(diff / (1000 * 60))} menit`;
        if (hours < 24) return `${hours} jam`;
        return `${Math.floor(hours / 24)} hari`;
    };

    const totalOpen =
        (stats?.slaOnTrack || 0) + (stats?.slaAtRisk || 0) + (stats?.slaBreached || 0);
    const compliance =
        totalOpen > 0
            ? Math.round(((stats?.slaOnTrack || 0) / totalOpen) * 100)
            : 100;

    return (
        <div className="space-y-6">
            {/* Header with Branch Filter */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">
                        {getGreeting()}, {user?.fullName} 👋
                    </h1>
                    <p className="text-muted-foreground">Berikut ringkasan aktivitas Anda</p>
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

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <Card
                        key={stat.title}
                        className={stat.link ? 'cursor-pointer hover:border-primary transition-colors' : ''}
                        onClick={() => stat.link && navigate(stat.link)}
                    >
                        <CardContent className="p-6">
                            {statsLoading ? (
                                <div className="flex items-center justify-center h-16">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                                        <p className="text-3xl font-bold mt-1">{stat.value}</p>
                                    </div>
                                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* SLA Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Breached */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            SLA Breached
                            <Badge variant="destructive" className="ml-auto">
                                {stats?.slaBreached || 0}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {breached.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
                                Tidak ada SLA yang breach
                            </div>
                        ) : (
                            breached.map((item: any) => (
                                <div
                                    key={item.id}
                                    className="p-3 bg-red-50 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100 transition-colors"
                                    onClick={() => navigate(`/tasks/${item.id}`)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-sm">{item.ticket_number}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.transaction_type?.name}
                                            </p>
                                        </div>
                                        <Badge variant="destructive" className="text-xs">
                                            +{getTimeAgo(item.stage_started_at)}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Stage: {item.current_stage}
                                    </p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* At Risk */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            At Risk
                            <Badge
                                variant="secondary"
                                className="ml-auto bg-orange-100 text-orange-700"
                            >
                                {stats?.slaAtRisk || 0}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {atRisk.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
                                Semua transaksi on track
                            </div>
                        ) : (
                            atRisk.map((item: any) => (
                                <div
                                    key={item.id}
                                    className="p-3 bg-orange-50 rounded-lg border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors"
                                    onClick={() => navigate(`/tasks/${item.id}`)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-sm">{item.ticket_number}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.transaction_type?.name}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs bg-orange-100 text-orange-700"
                                        >
                                            {item.stage_sla_deadline
                                                ? getTimeAgo(item.stage_sla_deadline)
                                                : '-'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Stage: {item.current_stage}
                                    </p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* SLA Compliance */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-500" />
                            SLA Compliance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-4">
                            <p
                                className={`text-5xl font-bold ${compliance >= 85 ? 'text-green-600' : 'text-orange-600'
                                    }`}
                            >
                                {compliance}%
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">Bulan ini</p>
                            {compliance >= 85 ? (
                                <p className="text-xs text-green-600 mt-2">✓ Di atas target 85%</p>
                            ) : (
                                <p className="text-xs text-orange-600 mt-2">⚠ Di bawah target 85%</p>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                            <div className="p-2 bg-green-50 rounded">
                                <p className="font-medium text-green-700">{stats?.slaOnTrack || 0}</p>
                                <p className="text-muted-foreground">On Track</p>
                            </div>
                            <div className="p-2 bg-orange-50 rounded">
                                <p className="font-medium text-orange-700">{stats?.slaAtRisk || 0}</p>
                                <p className="text-muted-foreground">At Risk</p>
                            </div>
                            <div className="p-2 bg-red-50 rounded">
                                <p className="font-medium text-red-700">{stats?.slaBreached || 0}</p>
                                <p className="text-muted-foreground">Breached</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={() => navigate('/create')}>
                            <FileText className="h-4 w-4 mr-2" />
                            Create Transaction
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/tasks')}>
                            <ClipboardList className="h-4 w-4 mr-2" />
                            My Tasks
                            {(stats?.myTasks || 0) > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {stats?.myTasks}
                                </Badge>
                            )}
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/my-tickets')}>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            My Tickets
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
