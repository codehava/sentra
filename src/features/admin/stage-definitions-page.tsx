import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getStageDefinitions,
    createStageDefinition,
    updateStageDefinition,
    deleteStageDefinition,
} from '@/services/stages.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface StageForm {
    code: string;
    name: string;
    description: string;
    sequence: number;
    is_active: boolean;
}

const defaultForm: StageForm = {
    code: '',
    name: '',
    description: '',
    sequence: 0,
    is_active: true,
};

export function StageDefinitionsPage() {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<StageForm>(defaultForm);

    const { data: stages = [], isLoading } = useQuery({
        queryKey: ['stage-definitions'],
        queryFn: getStageDefinitions,
    });

    const createMutation = useMutation({
        mutationFn: createStageDefinition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-definitions'] });
            toast.success('Stage created');
            closeDialog();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateStageDefinition(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-definitions'] });
            toast.success('Stage updated');
            closeDialog();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteStageDefinition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-definitions'] });
            toast.success('Stage deleted');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const openCreate = () => {
        const maxSeq = stages.reduce((max: number, s: any) => Math.max(max, s.sequence), 0);
        setForm({ ...defaultForm, sequence: maxSeq + 1 });
        setEditId(null);
        setDialogOpen(true);
    };

    const openEdit = (stage: any) => {
        setForm({
            code: stage.code,
            name: stage.name,
            description: stage.description || '',
            sequence: stage.sequence,
            is_active: stage.is_active,
        });
        setEditId(stage.id);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setForm(defaultForm);
        setEditId(null);
    };

    const handleSubmit = () => {
        if (!form.code || !form.name) {
            toast.error('Code and name are required');
            return;
        }

        if (editId) {
            updateMutation.mutate({ id: editId, data: form });
        } else {
            createMutation.mutate(form as any);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Delete this stage? This may affect routing configurations.')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Stage Definitions</h1>
                    <p className="text-muted-foreground">Kelola kode stage untuk routing</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stage
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : stages.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No stages configured</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Order</TableHead>
                                    <TableHead className="w-32">Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-24">Status</TableHead>
                                    <TableHead className="w-24">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stages.map((stage: any) => (
                                    <TableRow key={stage.id}>
                                        <TableCell>
                                            <Badge variant="outline">{stage.sequence}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge>{stage.code}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{stage.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {stage.description || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={stage.is_active ? 'default' : 'secondary'}>
                                                {stage.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(stage)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(stage.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editId ? 'Edit Stage' : 'Add Stage'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Code *</Label>
                                <Input
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    placeholder="CHECKER"
                                    disabled={!!editId}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Sequence</Label>
                                <Input
                                    type="number"
                                    value={form.sequence}
                                    onChange={(e) => setForm({ ...form, sequence: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Checker"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Role yang melakukan pengecekan"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {(createMutation.isPending || updateMutation.isPending) && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {editId ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
