import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Bell, Check, User, Key, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from '@/services/notifications.service';
import { logout } from '@/services/auth.service';

export function AppHeader() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: () => getNotifications(user?.id || '', 10),
        enabled: !!user?.id,
        refetchInterval: 30000, // Refresh every 30s
    });

    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['unread-count', user?.id],
        queryFn: () => getUnreadCount(user?.id || ''),
        enabled: !!user?.id,
        refetchInterval: 30000,
    });

    const markReadMutation = useMutation({
        mutationFn: markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => markAllAsRead(user?.id || ''),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        },
    });

    const handleNotificationClick = (notification: any) => {
        if (!notification.is_read) {
            markReadMutation.mutate(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    };

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />

            <div className="flex-1" />

            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <div className="flex items-center justify-between p-2 border-b">
                            <span className="font-medium">Notifications</span>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => markAllReadMutation.mutate()}
                                >
                                    <Check className="h-3 w-3 mr-1" />
                                    Mark all read
                                </Button>
                            )}
                        </div>
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No notifications
                            </div>
                        ) : (
                            notifications.map((n: any) => (
                                <DropdownMenuItem
                                    key={n.id}
                                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!n.is_read ? 'bg-muted/50' : ''
                                        }`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-medium">{n.title}</span>
                                        <span className="text-xs text-muted-foreground">{formatTime(n.created_at)}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">{n.message}</span>
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <User className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <div className="p-2 border-b">
                            <p className="font-medium text-sm">{user?.fullName}</p>
                            <p className="text-xs text-muted-foreground">{user?.email}</p>
                            <Badge variant="outline" className="mt-1 text-xs">
                                {user?.role?.code}
                            </Badge>
                        </div>
                        <DropdownMenuItem onClick={() => navigate('/change-password')}>
                            <Key className="h-4 w-4 mr-2" />
                            Ubah Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={async () => {
                                await logout();
                                useAuthStore.getState().logout();
                                navigate('/login');
                            }}
                            className="text-destructive focus:text-destructive"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
