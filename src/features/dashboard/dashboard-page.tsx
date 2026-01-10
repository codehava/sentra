import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlassContent, GlassHeader, GlassTitle } from '@/components/ui/glass-card';
import { BentoGrid, BentoItem } from '@/components/ui/bento-grid';
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
    Briefcase,
    Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { getUserBranches } from '@/services/user-branches.service';
import {
    getDashboardStats,
    getSlaBreachedTransactions,
    getSlaAtRiskTransactions,
} from '@/services/dashboard.service';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
            bgColor: 'bg-blue-500/10',
            link: '/tasks',
        },
        {
            title: 'My Tickets',
            value: stats?.totalCreated || 0,
            icon: FileText,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
            link: '/my-tickets',
        },
        {
            title: 'Completed',
            value: stats?.completedThisMonth || 0,
            icon: CheckCircle,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
        },
        {
            title: 'Pending',
            value: stats?.pendingApproval || 0,
            icon: Clock,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
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
            {/* Header with Branch Filter & Theme Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        {getGreeting()}, {user?.fullName?.split(' ')[0]}
                    </h1>
                    <p className="text-muted-foreground mt-1">Here's your daily overview</p>
                </div>
                <div className="flex items-center gap-3">
                    {userBranches.length > 1 && (
                        <div className="flex items-center gap-2 glass-panel rounded-lg px-3 py-1.5">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                <SelectTrigger className="w-40 border-0 bg-transparent h-8 focus:ring-0">
                                    <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Branches</SelectItem>
                                    {userBranches.map((branch: any) => (
                                        <SelectItem key={branch.code} value={branch.code}>
                                            {branch.code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <ThemeToggle />
                </div>
            </div>

            <BentoGrid>
                {/* Stats Cards */}
                {statCards.map((stat, i) => (
                    <BentoItem key={stat.title} className={stat.link ? 'cursor-pointer group' : ''} onClick={() => stat.link && navigate(stat.link)}>
                        <div className="flex justify-between items-start">
                            <div className={`p-3 rounded-xl ${stat.bgColor} transition-colors group-hover:scale-110 duration-300`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                            {stat.link && <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                            <h3 className="text-3xl font-bold tracking-tight">{statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stat.value}</h3>
                        </div>
                    </BentoItem>
                ))}

                {/* SLA Compliance - Large Block */}
                <BentoItem colSpan={2} rowSpan={2} className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Clock className="w-48 h-48" />
                    </div>
                    <div className="h-full flex flex-col">
                        <h3 className="text-lg font-semibold flex items-center gap-2 z-10">
                            <Clock className="h-5 w-5 text-primary" />
                            SLA Compliance
                        </h3>
                        <div className="flex-1 flex flex-col items-center justify-center z-10">
                            <div className="relative">
                                <svg className="w-40 h-40 transform -rotate-90">
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        className="text-muted/20"
                                    />
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        strokeDasharray={440}
                                        strokeDashoffset={440 - (440 * compliance) / 100}
                                        className={`${compliance >= 85 ? 'text-green-500' : 'text-orange-500'} transition-all duration-1000 ease-out`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                    <span className="text-4xl font-bold">{compliance}%</span>
                                    <span className="block text-xs text-muted-foreground">Score</span>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span>On Track ({stats?.slaOnTrack || 0})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                                    <span>At Risk ({stats?.slaAtRisk || 0})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span>Breached ({stats?.slaBreached || 0})</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </BentoItem>

                {/* Important Items List (Breached + At Risk) */}
                <BentoItem colSpan={2} rowSpan={2} className="flex flex-col">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Attention Needed
                    </h3>
                    <div className="flex-1 overflow-auto pr-2 space-y-3 custom-scrollbar">
                        {[...breached, ...atRisk].length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
                                <CheckCircle className="h-12 w-12 mb-3 text-green-500/50" />
                                <p>Everything is running smoothly!</p>
                            </div>
                        ) : (
                            [...breached, ...atRisk].slice(0, 5).map((item: any) => (
                                <div
                                    key={item.id}
                                    className="p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 transition-colors cursor-pointer group"
                                    onClick={() => navigate(`/tasks/${item.id}`)}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <Badge variant={item.stage_sla_status === 'BREACHED' ? 'destructive' : 'secondary'} className={item.stage_sla_status === 'AT_RISK' ? 'bg-orange-500/10 text-orange-600 border-orange-200' : ''}>
                                            {item.stage_sla_status === 'BREACHED' ? 'Breached' : 'At Risk'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {item.stage_sla_deadline ? getTimeAgo(item.stage_sla_deadline) + ' ago' : 'Unknown'}
                                        </span>
                                    </div>
                                    <p className="font-medium group-hover:text-primary transition-colors">{item.ticket_number}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 max-w-[280px] truncate">{item.transaction_type?.name} • {item.current_stage}</p>
                                </div>
                            ))
                        )}
                    </div>
                </BentoItem>

                {/* Quick Actions */}
                <BentoItem colSpan={4} className="flex-row items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold">Quick Actions</h4>
                            <p className="text-xs text-muted-foreground hidden md:block">Common tasks you perform often</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => navigate('/create')} className="glass-button">
                            <FileText className="h-4 w-4 mr-1.5" />
                            Create New
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate('/tasks')} className="bg-transparent border-primary/20 hover:bg-primary/5">
                            <ClipboardList className="h-4 w-4 mr-1.5" />
                            My Tasks
                        </Button>
                    </div>
                </BentoItem>
            </BentoGrid>
        </div>
    );
}
