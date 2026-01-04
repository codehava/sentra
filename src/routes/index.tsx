import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { LoginPage } from '@/features/auth/login-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';

// Admin pages
import { TransactionTypesPage } from '@/features/admin/transaction-types-page';
import { FieldMasterPage } from '@/features/admin/field-master-page';
import { UsersPage } from '@/features/admin/users-page';
import { RoutingMatrixPage } from '@/features/admin/routing-matrix-page';
import { FieldAccessPage } from '@/features/admin/field-access-page';
import { SlaConfigPage } from '@/features/admin/sla-config-page';
import { BranchesPage } from '@/features/admin/branches-page';
import { StageDefinitionsPage } from '@/features/admin/stage-definitions-page';
import { StatementsConfigPage } from '@/features/admin/statements-config-page';

// Transaction pages
import { SelectTransactionTypePage } from '@/features/transactions/select-type-page';
import { CreateTransactionPage } from '@/features/transactions/create-transaction-page';
import { MyTasksPage } from '@/features/transactions/my-tasks-page';
import { MyTicketsPage } from '@/features/transactions/my-tickets-page';
import { ProcessTransactionPage } from '@/features/transactions/process-transaction-page';
import { TicketDetailPage } from '@/features/transactions/ticket-detail-page';

// Reports
import { ReportsPage } from '@/features/reports/reports-page';

// Placeholder pages - akan diimplementasi nanti
const PlaceholderPage = ({ title }: { title: string }) => (
    <div className="flex items-center justify-center h-64">
        <div className="text-center">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-2">Coming soon...</p>
        </div>
    </div>
);

const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <MainLayout />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <DashboardPage /> },

            // Transaction routes
            { path: 'create', element: <SelectTransactionTypePage /> },
            { path: 'create/:type', element: <CreateTransactionPage /> },
            { path: 'tasks', element: <MyTasksPage /> },
            { path: 'tasks/:id', element: <ProcessTransactionPage /> },
            { path: 'my-tickets', element: <MyTicketsPage /> },
            { path: 'my-tickets/:id', element: <TicketDetailPage /> },
            { path: 'reports', element: <ReportsPage /> },

            // Admin routes
            {
                path: 'admin/users',
                element: (
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <UsersPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'admin/transaction-types',
                element: (
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <TransactionTypesPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'admin/fields',
                element: (
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <FieldMasterPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'admin/routing',
                element: (
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <RoutingMatrixPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'admin/field-access',
                element: (
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <FieldAccessPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'admin/sla',
                element: (
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <SlaConfigPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'admin/branches',
                element: (
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <BranchesPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'admin/stages',
                element: (
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <StageDefinitionsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'admin/statements',
                element: (
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <StatementsConfigPage />
                    </ProtectedRoute>
                ),
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);

export function AppRouter() {
    return <RouterProvider router={router} />;
}
