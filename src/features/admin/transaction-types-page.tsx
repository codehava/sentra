import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTransactionTypes,
    createTransactionType,
    updateTransactionType,
    deleteTransactionType,
} from '@/services/transaction-types.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TransactionType } from '@/types';

export function TransactionTypesPage() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TransactionType | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        icon: '',
        description: '',
        is_active: true,
    });

    const { data: types = [], isLoading } = useQuery({
        queryKey: ['transaction-types'],
        queryFn: getTransactionTypes,
    });

    const createMutation = useMutation({
        mutationFn: createTransactionType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transaction-types'] });
            toast.success('Transaction type created');
            closeDialog();
        },
        onError: (error: Error) => {
            toast.error(`Failed to create: ${error.message}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<TransactionType> }) =>
            updateTransactionType(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transaction-types'] });
            toast.success('Transaction type updated');
            closeDialog();
        },
        onError: (error: Error) => {
            toast.error(`Failed to update: ${error.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTransactionType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transaction-types'] });
            toast.success('Transaction type deleted');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete: ${error.message}`);
        },
    });

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData({ code: '', name: '', icon: '', description: '', is_active: true });
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: TransactionType) => {
        setEditingItem(item);
        setFormData({
            code: item.code,
            name: item.name,
            icon: item.icon || '',
            description: item.description || '',
            is_active: item.isActive,
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingItem(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: formData });
        } else {
            createMutation.mutate(formData as any);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this transaction type?')) {
            deleteMutation.mutate(id);
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Transaction Types</h1>
                    <p className="text-muted-foreground">Kelola jenis transaksi yang tersedia dalam sistem</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Type
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
                                    <TableHead className="w-16">ID</TableHead>
                                    <TableHead className="w-24">Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-24">Status</TableHead>
                                    <TableHead className="w-24 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {types.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No transaction types found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    types.map((type: any) => (
                                        <TableRow key={type.id}>
                                            <TableCell>{type.id}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{type.code}</Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{type.name}</TableCell>
                                            <TableCell className="text-muted-foreground max-w-xs truncate">
                                                {type.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={type.is_active ? 'default' : 'secondary'}>
                                                    {type.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog({ ...type, isActive: type.is_active })}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(type.id)}
                                                    >
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
                        <DialogTitle>
                            {editingItem ? 'Edit Transaction Type' : 'Create Transaction Type'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Code</Label>
                                    <Input
                                        id="code"
                                        placeholder="e.g., BU"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        required
                                        disabled={!!editingItem}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="icon">Icon</Label>
                                    <Input
                                        id="icon"
                                        placeholder="e.g., wallet"
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Beban Usaha"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    placeholder="Brief description..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        </div>
    );
}
