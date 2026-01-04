import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    LayoutDashboard,
    Plus,
    ClipboardList,
    FileText,
    BarChart3,
    Settings,
    Users,
    Layers,
    GitBranch,
    Lock,
    LogOut,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, useUserRole } from '@/stores/auth-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const mainMenuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, url: '/' },
    { title: 'Create Transaction', icon: Plus, url: '/create', roles: ['MAKER', 'ADMIN'] },
    { title: 'My Tasks', icon: ClipboardList, url: '/tasks' },
    { title: 'My Tickets', icon: FileText, url: '/my-tickets', roles: ['MAKER', 'ADMIN'] },
    { title: 'Reports', icon: BarChart3, url: '/reports' },
];

const adminMenuItems = [
    { title: 'User Management', icon: Users, url: '/admin/users' },
    { title: 'Transaction Types', icon: Layers, url: '/admin/transaction-types' },
    { title: 'Field Master', icon: FileText, url: '/admin/fields' },
    { title: 'Routing Matrix', icon: GitBranch, url: '/admin/routing' },
    { title: 'Field Access', icon: Lock, url: '/admin/field-access' },
    { title: 'Statement Config', icon: FileText, url: '/admin/statements' },
    { title: 'SLA Config', icon: Settings, url: '/admin/sla' },
];

export function AppSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const userRole = useUserRole();
    const { user, logout } = useAuthStore();

    const isAdmin = userRole === 'ADMIN';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredMainMenu = mainMenuItems.filter(
        (item) => !item.roles || item.roles.includes(userRole || '')
    );

    return (
        <Sidebar>
            <SidebarHeader className="border-b px-4 py-3">
                <div className="flex items-center justify-center">
                    <img src="/logo-sentra.png" alt="SENTRA" className="h-10 w-auto object-contain" />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {filteredMainMenu.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        isActive={location.pathname === item.url}
                                        onClick={() => navigate(item.url)}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {isAdmin && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Administration</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {adminMenuItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            isActive={location.pathname === item.url}
                                            onClick={() => navigate(item.url)}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter className="border-t p-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>
                            {user?.fullName?.charAt(0) || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.fullName || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.role?.name || 'Role'}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-muted rounded-md transition-colors"
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
