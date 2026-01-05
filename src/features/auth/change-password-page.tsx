import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function ChangePasswordPage() {
    const { user } = useAuthStore();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [success, setSuccess] = useState(false);

    const mutation = useMutation({
        mutationFn: () => changePassword(formData.newPassword),
        onSuccess: () => {
            setSuccess(true);
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('Password berhasil diubah');
        },
        onError: (error: Error) => {
            toast.error(`Gagal mengubah password: ${error.message}`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (formData.newPassword.length < 6) {
            toast.error('Password minimal 6 karakter');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('Konfirmasi password tidak cocok');
            return;
        }

        mutation.mutate();
    };

    const toggleShowPassword = (field: 'current' | 'new' | 'confirm') => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto py-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-semibold">Password Berhasil Diubah</h2>
                            <p className="text-muted-foreground">
                                Password Anda telah berhasil diubah. Gunakan password baru saat login berikutnya.
                            </p>
                            <Button onClick={() => setSuccess(false)} variant="outline">
                                Ubah Password Lagi
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Ubah Password
                    </CardTitle>
                    <CardDescription>
                        Masukkan password baru untuk akun {user?.email}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Password Baru</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPasswords.new ? 'text' : 'password'}
                                    placeholder="Minimal 6 karakter"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full"
                                    onClick={() => toggleShowPassword('new')}
                                >
                                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    placeholder="Ketik ulang password baru"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full"
                                    onClick={() => toggleShowPassword('confirm')}
                                >
                                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                                <p className="text-xs text-destructive">Password tidak cocok</p>
                            )}
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={mutation.isPending || !formData.newPassword || formData.newPassword !== formData.confirmPassword}
                            >
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ubah Password
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
