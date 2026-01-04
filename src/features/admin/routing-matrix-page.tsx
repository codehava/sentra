import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactionTypes } from '@/services/transaction-types.service';
import { getRoutingMatrix, createRoutingEntry, updateRoutingEntry, deleteRoutingEntry } from '@/services/routing.service';
import { getRoles } from '@/services/users.service';
import { getActiveStages } from '@/services/stages.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Plus, Pencil, Trash2, Loader2, GitBranch, CornerDownLeft } from 'lucide-react';
import { toast } from 'sonner';

export function RoutingMatrixPage() {
    const queryClient = useQueryClient();
    const [selectedTypeId, setSelectedTypeId] = useState<string>('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState({
        stage_order: '',
        stage_code: '',
        stage_name: '',
        role_id: '',
        is_final: false,
        return_to_stage: '',
    });

    const { data: types = [] } = useQuery({
        queryKey: ['transaction-types'],
        queryFn: getTransactionTypes,
    });

    const { data: roles = [] } = useQuery({
        queryKey: ['roles'],
        queryFn: getRoles,
    });

    const { data: stageDefinitions = [] } = useQuery({
        queryKey: ['active-stages'],
        queryFn: getActiveStages,
    });

    const { data: routing = [], isLoading } = useQuery({
        queryKey: ['routing-matrix', selectedTypeId],
        queryFn: () => getRoutingMatrix(selectedTypeId ? parseInt(selectedTypeId) : undefined),
        enabled: !!selectedTypeId,
    });

    const createMutation = useMutation({
        mutationFn: createRoutingEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['routing-matrix'] });
            toast.success('Stage added');
            closeDialog();
        },
        onError: (error: Error) => {
            toast.error(`Failed to create: ${error.message}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateRoutingEntry(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['routing-matrix'] });
            toast.success('Stage updated');
            closeDialog();
        },
        onError: (error: Error) => {
            toast.error(`Failed to update: ${error.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRoutingEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['routing-matrix'] });
            toast.success('Stage deleted');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete: ${error.message}`);
        },
    });

    const openCreateDialog = () => {
        if (!selectedTypeId) {
            toast.error('Please select a transaction type first');
            return;
        }
        setEditingItem(null);
        const nextOrder = routing.length + 1;
        setFormData({
            stage_order: String(nextOrder),
            stage_code: '',
            stage_name: '',
            role_id: '',
            is_final: false,
            return_to_stage: 'MAKER',
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: any) => {
        setEditingItem(item);
        setFormData({
            stage_order: String(item.stage_order),
            stage_code: item.stage_code,
            stage_name: item.stage_name,
            role_id: String(item.role_id),
            is_final: item.is_final,
            return_to_stage: item.return_to_stage || 'MAKER',
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingItem(null);
    };

    const handleStageSelect = (stageCode: string) => {
        const stage = stageDefinitions.find((s: any) => s.code === stageCode);
        if (stage) {
            setFormData({
                ...formData,
                stage_code: stage.code,
                stage_name: stage.name,
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            transaction_type_id: parseInt(selectedTypeId),
            stage_order: parseInt(formData.stage_order),
            stage_code: formData.stage_code.toUpperCase(),
            stage_name: formData.stage_name,
            role_id: parseInt(formData.role_id),
            is_final: formData.is_final,
            return_to_stage: formData.return_to_stage || null,
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data as any);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this stage?')) {
            deleteMutation.mutate(id);
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;
    const selectedType = types.find((t: any) => t.id === parseInt(selectedTypeId));

    // Get available stages for return (can only return to previous stages)
    const getReturnStageOptions = () => {
        return routing.filter((r: any) => r.stage_order < parseInt(formData.stage_order || '999'));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Routing Matrix</h1>
                    <p className="text-muted-foreground">Kelola alur approval untuk setiap jenis transaksi</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Label>Transaction Type</Label>
                            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                                <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Select transaction type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.map((type: any) => (
                                        <SelectItem key={type.id} value={String(type.id)}>
                                            {type.code} - {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedTypeId && (
                            <Button onClick={openCreateDialog}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Stage
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {!selectedTypeId ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <GitBranch className="h-12 w-12 mb-4" />
                            <p>Select a transaction type to view its routing stages</p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20">Order</TableHead>
                                    <TableHead className="w-32">Code</TableHead>
                                    <TableHead>Stage Name</TableHead>
                                    <TableHead className="w-32">Role</TableHead>
                                    <TableHead className="w-32">Return To</TableHead>
                                    <TableHead className="w-24">Final</TableHead>
                                    <TableHead className="w-24 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {routing.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No routing stages configured for {selectedType?.name}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    routing.map((stage: any) => (
                                        <TableRow key={stage.id}>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono">
                                                    {stage.stage_order}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                                    {stage.stage_code}
                                                </code>
                                            </TableCell>
                                            <TableCell className="font-medium">{stage.stage_name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{stage.role?.code || '-'}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {stage.return_to_stage ? (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <CornerDownLeft className="h-3 w-3 text-muted-foreground" />
                                                        <code className="text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded">
                                                            {stage.return_to_stage}
                                                        </code>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {stage.is_final ? (
                                                    <Badge variant="default" className="bg-green-600">Final</Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(stage)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(stage.id)}>
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
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Stage' : 'Add Stage'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="stage_order">Order</Label>
                                    <Input
                                        id="stage_order"
                                        type="number"
                                        min="1"
                                        value={formData.stage_order}
                                        onChange={(e) => setFormData({ ...formData, stage_order: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Stage Template</Label>
                                    <Select onValueChange={handleStageSelect}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select or type custom" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stageDefinitions.map((s: any) => (
                                                <SelectItem key={s.code} value={s.code}>
                                                    {s.code} - {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="stage_code">Stage Code</Label>
                                    <Input
                                        id="stage_code"
                                        placeholder="e.g., APPROVER"
                                        value={formData.stage_code}
                                        onChange={(e) => setFormData({ ...formData, stage_code: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="stage_name">Stage Name</Label>
                                    <Input
                                        id="stage_name"
                                        placeholder="e.g., Approver"
                                        value={formData.stage_name}
                                        onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role_id">Role</Label>
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
                            <div className="space-y-2">
                                <Label>Return To Stage (on reject)</Label>
                                <Select
                                    value={formData.return_to_stage}
                                    onValueChange={(v) => setFormData({ ...formData, return_to_stage: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select return stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MAKER">MAKER (Creator)</SelectItem>
                                        {getReturnStageOptions().map((s: any) => (
                                            <SelectItem key={s.stage_code} value={s.stage_code}>
                                                {s.stage_code} - {s.stage_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Stage yang akan dituju jika transaksi di-return/reject
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_final"
                                    checked={formData.is_final}
                                    onChange={(e) => setFormData({ ...formData, is_final: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="is_final">Final Stage (marks transaction as closed)</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingItem ? 'Update' : 'Add'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
