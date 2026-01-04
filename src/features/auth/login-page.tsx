import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
    nip: z.string().min(1, 'NIP wajib diisi'),
    password: z.string().min(1, 'Password wajib diisi'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Mock users untuk demo - nanti diganti dengan API
// UUIDs harus match dengan data di tabel users di database
const MOCK_USERS = [
    { id: '00000000-0000-0000-0000-000000000001', nip: 'admin', password: 'admin', fullName: 'Administrator', email: 'admin@sentra.id', roleId: 1, role: { id: 1, code: 'ADMIN' as const, name: 'Administrator' }, isActive: true, createdAt: '', updatedAt: '' },
    { id: '00000000-0000-0000-0000-000000000002', nip: 'maker', password: 'maker', fullName: 'Budi Maker', email: 'maker@sentra.id', roleId: 2, role: { id: 2, code: 'MAKER' as const, name: 'Maker' }, isActive: true, createdAt: '', updatedAt: '' },
    { id: '00000000-0000-0000-0000-000000000003', nip: 'approver', password: 'approver', fullName: 'Dewi Approver', email: 'approver@sentra.id', roleId: 3, role: { id: 3, code: 'APPROVER' as const, name: 'Approver' }, isActive: true, createdAt: '', updatedAt: '' },
];

export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            nip: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setError('');

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const user = MOCK_USERS.find(
            (u) => u.nip === data.nip && u.password === data.password
        );

        if (user) {
            login(user, 'mock-jwt-token');
            navigate('/');
        } else {
            setError('NIP atau password salah');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <img src="/logo-sentra.png" alt="SENTRA" className="h-20 w-auto object-contain" />
                    </div>
                    <CardDescription className="text-base">
                        Sistem End to End Monitoring Transaksi
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="nip"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>NIP</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Masukkan NIP" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Masukkan password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {error && (
                                <div className="text-sm text-destructive text-center">{error}</div>
                            )}

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Masuk
                            </Button>
                        </form>
                    </Form>

                    <div className="mt-6 pt-4 border-t">
                        <p className="text-xs text-muted-foreground text-center mb-2">Demo Accounts:</p>
                        <div className="grid grid-cols-3 gap-2 text-xs text-center">
                            <div className="p-2 bg-muted rounded">
                                <div className="font-medium">admin</div>
                                <div className="text-muted-foreground">admin</div>
                            </div>
                            <div className="p-2 bg-muted rounded">
                                <div className="font-medium">maker</div>
                                <div className="text-muted-foreground">maker</div>
                            </div>
                            <div className="p-2 bg-muted rounded">
                                <div className="font-medium">approver</div>
                                <div className="text-muted-foreground">approver</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
