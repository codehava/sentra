import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser, getRoles, resetUserPassword } from '@/services/users.service';
import { getUserBranches, getAllBranches, assignUserBranches } from '@/services/user-branches.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, Building2, Key, Copy, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';


export function UsersPage() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [branchDialogOpen, setBranchDialogOpen] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [createdUserInfo, setCreatedUserInfo] = useState<{ email: string; password: string } | null>(null);
    const [copiedPassword, setCopiedPassword] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState({
        nip: '',
        full_name: '',
        email: '',
        role_id: '',
        is_active: true,
    });

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: getUsers,
    });

    const { data: roles = [] } = useQuery({
        queryKey: ['roles'],
        queryFn: getRoles,
    });

    const { data: allBranches = [] } = useQuery({
        queryKey: ['all-branches'],
        queryFn: getAllBranches,
    });

    const { data: userBranches = [] } = useQuery({
        queryKey: ['user-branches', selectedUser?.id],
        queryFn: () => getUserBranches(selectedUser?.id),
        enabled: !!selectedUser?.id,
    });

    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            closeDialog();
            // Show password dialog with the default password
            if (data.defaultPassword) {
                setCreatedUserInfo({
                    email: data.email,
                    password: data.defaultPassword,
                });
                setPasswordDialogOpen(true);
            } else {
                toast.success('User created');
            }
        },
        onError: (error: Error) => {
            toast.error(`Failed to create: ${error.message}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('User updated');
            closeDialog();
        },
        onError: (error: Error) => {
            toast.error(`Failed to update: ${error.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('User deleted');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete: ${error.message}`);
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: ({ userId, nip }: { userId: string; nip: string }) => resetUserPassword(userId, nip),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            // Show the password dialog
            setCreatedUserInfo({
                email: selectedUser?.email || '',
                password: data.newPassword,
            });
            setPasswordDialogOpen(true);
        },
        onError: (error: Error) => {
            toast.error(`Failed to reset password: ${error.message}`);
        },
    });

    const handleResetPassword = (user: any) => {
        if (confirm(`Reset password untuk ${user.full_name} ke default (Sentra@${user.nip})?`)) {
            setSelectedUser(user);
            resetPasswordMutation.mutate({ userId: user.id, nip: user.nip });
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData({ nip: '', full_name: '', email: '', role_id: '', is_active: true });
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: any) => {
        setEditingItem(item);
        setFormData({
            nip: item.nip,
            full_name: item.full_name,
            email: item.email,
            role_id: String(item.role_id),
            is_active: item.is_active,
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingItem(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            nip: formData.nip,
            full_name: formData.full_name,
            email: formData.email,
            role_id: parseInt(formData.role_id),
            is_active: formData.is_active,
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this user?')) {
            deleteMutation.mutate(id);
        }
    };

    // Branch assignment
    const openBranchDialog = async (user: any) => {
        setSelectedUser(user);
        const branches = await getUserBranches(user.id);
        setSelectedBranches(branches.map(b => b.code));
        setBranchDialogOpen(true);
    };

    const toggleBranch = (code: string) => {
        setSelectedBranches(prev =>
            prev.includes(code)
                ? prev.filter(c => c !== code)
                : [...prev, code]
        );
    };

    const saveBranches = async () => {
        if (!selectedUser) return;
        try {
            await assignUserBranches(selectedUser.id, selectedBranches);
            queryClient.invalidateQueries({ queryKey: ['user-branches'] });
            toast.success('Branches assigned');
            setBranchDialogOpen(false);
        } catch (error: any) {
            toast.error(`Failed: ${error.message}`);
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">User Management</h1>
                    <p className="text-muted-foreground">Kelola pengguna dan hak akses dalam sistem</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-28">NIP</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="w-28">Role</TableHead>
                                    <TableHead className="w-24">Status</TableHead>
                                    <TableHead className="w-32 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user: any) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <code className="text-xs bg-muted px-1 py-0.5 rounded">{user.nip}</code>
                                            </TableCell>
                                            <TableCell className="font-medium">{user.full_name}</TableCell>
                                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{user.role?.code || '-'}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openBranchDialog(user)} title="Assign Branches">
                                                        <Building2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleResetPassword(user)} title="Reset Password">
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit User' : 'Create User'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nip">NIP</Label>
                                    <Input
                                        id="nip"
                                        placeholder="e.g., MAKER001"
                                        value={formData.nip}
                                        onChange={(e) => setFormData({ ...formData, nip: e.target.value.toUpperCase() })}
                                        required
                                        disabled={!!editingItem}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={formData.role_id}
                                        onValueChange={(v) => setFormData({ ...formData, role_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role: any) => (
                                                <SelectItem key={role.id} value={String(role.id)}>
                                                    {role.code} - {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    placeholder="e.g., Budi Santoso"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="e.g., user@sentra.id"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="is_active">Active</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingItem ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Branch Assignment Dialog */}
            <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Branches - {selectedUser?.full_name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            Pilih kantor cabang yang bisa diakses oleh user ini:
                        </p>
                        <div className="max-h-64 overflow-auto space-y-2 border rounded-lg p-3">
                            {allBranches.map((branch: any) => (
                                <label
                                    key={branch.code}
                                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selectedBranches.includes(branch.code)
                                        ? 'bg-primary/10'
                                        : 'hover:bg-muted'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedBranches.includes(branch.code)}
                                        onChange={() => toggleBranch(branch.code)}
                                        className="h-4 w-4"
                                    />
                                    <div className="flex-1">
                                        <span className="font-medium">{branch.code}</span>
                                        <span className="text-muted-foreground ml-2">{branch.name}</span>
                                    </div>
                                </label>
                            ))}
                            {allBranches.length === 0 && (
                                <p className="text-center text-muted-foreground py-4">
                                    Tidak ada branch tersedia. Tambahkan di database.
                                </p>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {selectedBranches.length} branch dipilih
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBranchDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={saveBranches}>
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Password Info Dialog */}
            <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
                setPasswordDialogOpen(open);
                if (!open) {
                    setCopiedPassword(false);
                    setCreatedUserInfo(null);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-green-600" />
                            Password Berhasil Diatur
                        </DialogTitle>
                        <DialogDescription>
                            Berikut adalah informasi password user. Pastikan untuk menyimpan password ini.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">Email</Label>
                                <p className="font-medium">{createdUserInfo?.email}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Default Password</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="flex-1 px-3 py-2 bg-white border rounded font-mono text-lg">
                                        {createdUserInfo?.password}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            if (createdUserInfo?.password) {
                                                navigator.clipboard.writeText(createdUserInfo.password);
                                                setCopiedPassword(true);
                                                toast.success('Password copied to clipboard');
                                            }
                                        }}
                                    >
                                        {copiedPassword ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800">
                                <strong>Penting:</strong> User harus melakukan registrasi di Supabase Auth dengan email dan password ini,
                                atau admin dapat langsung menambahkan user di Supabase Dashboard → Authentication → Users.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setPasswordDialogOpen(false)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
