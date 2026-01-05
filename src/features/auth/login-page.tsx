import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuthStore } from '@/stores/auth-store';
import { loginWithNip } from '@/services/auth.service';
import { Loader2, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
    nip: z.string().min(1, 'NIP wajib diisi'),
    password: z.string().min(1, 'Password wajib diisi'),
});

type LoginFormData = z.infer<typeof loginSchema>;

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

        try {
            const { user, needsPasswordChange } = await loginWithNip({
                nip: data.nip,
                password: data.password,
            });

            // Store user in auth store
            login(user, 'custom-auth-token');

            // If user needs to change password, redirect to change password page
            if (needsPasswordChange) {
                navigate('/change-password', {
                    state: { message: 'Silakan ubah password default Anda untuk keamanan.' }
                });
            } else {
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat login');
        } finally {
            setIsLoading(false);
        }
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
                                            <Input
                                                placeholder="Masukkan NIP"
                                                autoComplete="username"
                                                {...field}
                                            />
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
                                            <Input
                                                type="password"
                                                placeholder="Masukkan password"
                                                autoComplete="current-password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Masuk
                            </Button>
                        </form>
                    </Form>

                    <div className="mt-6 pt-4 border-t">
                        <p className="text-xs text-muted-foreground text-center">
                            Hubungi Administrator jika Anda lupa password
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
