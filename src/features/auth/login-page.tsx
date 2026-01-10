import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard, GlassContent, GlassHeader, GlassTitle, GlassDescription } from '@/components/ui/glass-card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuthStore } from '@/stores/auth-store';
import { loginWithNip } from '@/services/auth.service';
import { Loader2, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/20 blur-[120px]" />
            </div>

            {/* Theme Toggle removed as per user request */}

            <GlassCard className="w-full max-w-md z-10 glass-panel border-white/20 dark:border-white/10">
                <GlassHeader className="text-center space-y-4 pb-2">
                    <div className="flex justify-center mb-2">
                        <img src="/logo-sentra.png" alt="SENTRA" className="h-24 w-auto object-contain drop-shadow-lg" />
                    </div>
                    <div>
                        <GlassTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                            SENTRA
                        </GlassTitle>
                        <GlassDescription className="text-base mt-2">
                            Sistem End to End Monitoring Transaksi
                        </GlassDescription>
                    </div>
                </GlassHeader>
                <GlassContent>
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
                                                className="bg-background/50 border-input/50 focus:bg-background transition-colors"
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
                                                className="bg-background/50 border-input/50 focus:bg-background transition-colors"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full glass-button font-semibold h-11" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Masuk
                            </Button>
                        </form>
                    </Form>

                    <div className="mt-8 pt-6 border-t border-border/50">
                        <p className="text-xs text-muted-foreground text-center">
                            Hubungi Administrator jika Anda lupa password
                        </p>
                    </div>
                </GlassContent>
            </GlassCard>
        </div>
    );
}
