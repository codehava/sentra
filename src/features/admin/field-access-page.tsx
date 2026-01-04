import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactionTypes } from '@/services/transaction-types.service';
import { getFields } from '@/services/fields.service';
import { getRoutingMatrix } from '@/services/routing.service';
import { getFieldAccess, createFieldAccess, updateFieldAccess, deleteFieldAccess } from '@/services/field-access.service';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Loader2, Lock, Eye, Edit, CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function FieldAccessPage() {
    const queryClient = useQueryClient();
    const [selectedTypeId, setSelectedTypeId] = useState<string>('');
    const [selectedStage, setSelectedStage] = useState<string>('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        field_id: '',
        is_visible: true,
        is_editable: false,
        is_mandatory: false,
    });

    const { data: types = [] } = useQuery({
        queryKey: ['transaction-types'],
        queryFn: getTransactionTypes,
    });

    const { data: fields = [] } = useQuery({
        queryKey: ['fields'],
        queryFn: getFields,
    });

    const { data: stages = [] } = useQuery({
        queryKey: ['routing-matrix', selectedTypeId],
        queryFn: () => getRoutingMatrix(selectedTypeId ? parseInt(selectedTypeId) : undefined),
        enabled: !!selectedTypeId,
    });

    const { data: fieldAccess = [], isLoading } = useQuery({
        queryKey: ['field-access', selectedTypeId, selectedStage],
        queryFn: () => getFieldAccess(
            selectedTypeId ? parseInt(selectedTypeId) : undefined,
            selectedStage || undefined
        ),
        enabled: !!selectedTypeId && !!selectedStage,
    });

    const createMutation = useMutation({
        mutationFn: createFieldAccess,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['field-access'] });
            toast.success('Field access added');
            setIsDialogOpen(false);
        },
        onError: (error: Error) => {
            toast.error(`Failed to create: ${error.message}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateFieldAccess(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['field-access'] });
            toast.success('Field access updated');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update: ${error.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteFieldAccess,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['field-access'] });
            toast.success('Field access removed');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete: ${error.message}`);
        },
    });

    const openAddDialog = () => {
        if (!selectedTypeId || !selectedStage) {
            toast.error('Please select a transaction type and stage first');
            return;
        }
        setFormData({ field_id: '', is_visible: true, is_editable: false, is_mandatory: false });
        setIsDialogOpen(true);
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            transaction_type_id: parseInt(selectedTypeId),
            field_id: parseInt(formData.field_id),
            stage_code: selectedStage,
            is_visible: formData.is_visible,
            is_editable: formData.is_editable,
            is_mandatory: formData.is_mandatory,
            field_order: fieldAccess.length,
        } as any);
    };

    const toggleAccess = (item: any, field: 'is_visible' | 'is_editable' | 'is_mandatory') => {
        const newValue = !item[field];
        // If turning off visibility, also turn off editable and mandatory
        const updates: any = { [field]: newValue };
        if (field === 'is_visible' && !newValue) {
            updates.is_editable = false;
            updates.is_mandatory = false;
        }
        // If turning on mandatory, also turn on editable and visible
        if (field === 'is_mandatory' && newValue) {
            updates.is_visible = true;
            updates.is_editable = true;
        }
        // If turning on editable, also turn on visible
        if (field === 'is_editable' && newValue) {
            updates.is_visible = true;
        }
        updateMutation.mutate({ id: item.id, data: updates });
    };

    const handleDelete = (id: number) => {
        if (confirm('Remove this field from this stage?')) {
            deleteMutation.mutate(id);
        }
    };

    // Copy from previous stage
    const copyFromPreviousStage = async () => {
        if (!selectedTypeId || !selectedStage) return;

        // Find current stage index and previous stage
        const currentIndex = stages.findIndex((s: any) => s.stage_code === selectedStage);
        if (currentIndex <= 0) {
            toast.error('Tidak ada stage sebelumnya untuk di-copy');
            return;
        }

        const previousStage = stages[currentIndex - 1];

        // Get field access from previous stage
        const { data: prevAccess, error } = await import('@/lib/supabase').then(m =>
            m.supabase
                .from('field_access_matrix')
                .select('*')
                .eq('transaction_type_id', parseInt(selectedTypeId))
                .eq('stage_code', previousStage.stageCode)
        );

        if (error || !prevAccess || prevAccess.length === 0) {
            toast.error('Stage sebelumnya tidak memiliki field access');
            return;
        }

        // Copy each entry to current stage
        const copyPromises = prevAccess.map((entry: any) => {
            return createMutation.mutateAsync({
                transaction_type_id: parseInt(selectedTypeId),
                field_id: entry.field_id,
                stage_code: selectedStage,
                is_visible: entry.is_visible,
                is_editable: entry.is_editable,
                is_mandatory: entry.is_mandatory,
                field_order: entry.field_order,
            } as any);
        });

        try {
            await Promise.all(copyPromises);
            toast.success(`${prevAccess.length} field berhasil di-copy dari ${previousStage.stageName}`);
            queryClient.invalidateQueries({ queryKey: ['field-access'] });
        } catch (e) {
            toast.error('Gagal copy beberapa field');
        }
    };

    const existingFieldIds = fieldAccess.map((fa: any) => fa.field_id);
    const availableFields = fields.filter((f: any) => !existingFieldIds.includes(f.id) && f.is_active);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Field Access Matrix</h1>
                    <p className="text-muted-foreground">Kelola akses field per stage untuk setiap transaksi</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label>Transaction Type</Label>
                            <Select value={selectedTypeId} onValueChange={(v) => { setSelectedTypeId(v); setSelectedStage(''); }}>
                                <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Select type" />
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
                    </div>
                </CardHeader>
                <CardContent>
                    {!selectedTypeId ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Lock className="h-12 w-12 mb-4" />
                            <p>Select a transaction type to configure field access</p>
                        </div>
                    ) : stages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <p>No routing stages configured for this type.</p>
                            <p className="text-sm">Add stages in Routing Matrix first.</p>
                        </div>
                    ) : (
                        <Tabs value={selectedStage} onValueChange={setSelectedStage}>
                            <TabsList className="mb-4">
                                {stages.map((stage: any) => (
                                    <TabsTrigger key={stage.stage_code} value={stage.stage_code}>
                                        {stage.stage_name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {stages.map((stage: any) => (
                                <TabsContent key={stage.stage_code} value={stage.stage_code}>
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-sm text-muted-foreground">
                                            Configure which fields are visible, editable, and mandatory at the <b>{stage.stage_name}</b> stage.
                                        </p>
                                        <div className="flex gap-2">
                                            {stages.findIndex((s: any) => s.stage_code === stage.stage_code) > 0 && fieldAccess.length === 0 && (
                                                <Button variant="outline" onClick={copyFromPreviousStage}>
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copy dari Stage Sebelumnya
                                                </Button>
                                            )}
                                            <Button onClick={openAddDialog} disabled={availableFields.length === 0}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Field
                                            </Button>
                                        </div>
                                    </div>

                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        </div>
                                    ) : fieldAccess.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground border rounded-lg">
                                            No fields configured for this stage
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Field</TableHead>
                                                    <TableHead className="w-28 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Eye className="h-4 w-4" /> Visible
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className="w-28 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Edit className="h-4 w-4" /> Editable
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className="w-28 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <CheckCircle className="h-4 w-4" /> Mandatory
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className="w-20 text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {fieldAccess.map((item: any) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <div>
                                                                <span className="font-medium">{item.field?.name}</span>
                                                                <Badge variant="outline" className="ml-2 text-xs">{item.field?.type}</Badge>
                                                            </div>
                                                            <code className="text-xs text-muted-foreground">{item.field?.code}</code>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <button
                                                                onClick={() => toggleAccess(item, 'is_visible')}
                                                                className={`p-2 rounded-full transition-colors ${item.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <button
                                                                onClick={() => toggleAccess(item, 'is_editable')}
                                                                className={`p-2 rounded-full transition-colors ${item.is_editable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <button
                                                                onClick={() => toggleAccess(item, 'is_mandatory')}
                                                                className={`p-2 rounded-full transition-colors ${item.is_mandatory ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </button>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Field to Stage</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdd}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Field</Label>
                                <Select value={formData.field_id} onValueChange={(v) => setFormData({ ...formData, field_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableFields.map((field: any) => (
                                            <SelectItem key={field.id} value={String(field.id)}>
                                                {field.name} ({field.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="is_visible" checked={formData.is_visible} onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })} className="h-4 w-4" />
                                    <Label htmlFor="is_visible">Visible</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="is_editable" checked={formData.is_editable} onChange={(e) => setFormData({ ...formData, is_editable: e.target.checked })} className="h-4 w-4" />
                                    <Label htmlFor="is_editable">Editable</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="is_mandatory" checked={formData.is_mandatory} onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })} className="h-4 w-4" />
                                    <Label htmlFor="is_mandatory">Mandatory</Label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={!formData.field_id || createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
