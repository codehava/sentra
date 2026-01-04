import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactionTypes } from '@/services/transaction-types.service';
import { getRoutingMatrix } from '@/services/routing.service';
import {
    getStatementsByType,
    createStatement,
    updateStatement,
    deleteStatement,
} from '@/services/statements.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, FileCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StatementForm {
    stage_code: string;
    text: string;
    is_required: boolean;
    sequence: number;
    is_active: boolean;
}

const defaultForm: StatementForm = {
    stage_code: '',
    text: '',
    is_required: true,
    sequence: 1,
    is_active: true,
};

export function StatementsConfigPage() {
    const queryClient = useQueryClient();
    const [selectedTypeId, setSelectedTypeId] = useState<string>('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<StatementForm>(defaultForm);

    const { data: types = [] } = useQuery({
        queryKey: ['transaction-types'],
        queryFn: getTransactionTypes,
    });

    const { data: routing = [] } = useQuery({
        queryKey: ['routing-matrix', selectedTypeId],
        queryFn: () => getRoutingMatrix(selectedTypeId ? parseInt(selectedTypeId) : undefined),
        enabled: !!selectedTypeId,
    });

    const { data: statements = [], isLoading } = useQuery({
        queryKey: ['statements', selectedTypeId],
        queryFn: () => getStatementsByType(parseInt(selectedTypeId)),
        enabled: !!selectedTypeId,
    });

    const createMutation = useMutation({
        mutationFn: createStatement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statements'] });
            toast.success('Statement created');
            closeDialog();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateStatement(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statements'] });
            toast.success('Statement updated');
            closeDialog();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteStatement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statements'] });
            toast.success('Statement deleted');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const openCreate = () => {
        const maxSeq = statements.reduce((max: number, s: any) => Math.max(max, s.sequence || 0), 0);
        setForm({ ...defaultForm, sequence: maxSeq + 1 });
        setEditId(null);
        setDialogOpen(true);
    };

    const openEdit = (statement: any) => {
        setForm({
            stage_code: statement.stage_code,
            text: statement.text,
            is_required: statement.is_required,
            sequence: statement.sequence,
            is_active: statement.is_active,
        });
        setEditId(statement.id);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setForm(defaultForm);
        setEditId(null);
    };

    const handleSubmit = () => {
        if (!form.stage_code || !form.text.trim()) {
            toast.error('Stage and text are required');
            return;
        }

        const data = {
            transaction_type_id: parseInt(selectedTypeId),
            ...form,
        };

        if (editId) {
            updateMutation.mutate({ id: editId, data });
        } else {
            createMutation.mutate(data as any);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Delete this statement?')) {
            deleteMutation.mutate(id);
        }
    };

    const selectedType = types.find((t: any) => t.id === parseInt(selectedTypeId));

    // Group statements by stage
    const groupedStatements = statements.reduce((acc: any, s: any) => {
        if (!acc[s.stage_code]) acc[s.stage_code] = [];
        acc[s.stage_code].push(s);
        return acc;
    }, {});

    // Get stage name from routing
    const getStageName = (code: string) => {
        const stage = routing.find((r: any) => r.stage_code === code);
        return stage?.stage_name || code;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Statement Config</h1>
                    <p className="text-muted-foreground">Kelola pernyataan per jenis transaksi dan stage</p>
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
                            <Button onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Statement
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {!selectedTypeId ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <FileCheck className="h-12 w-12 mb-4 opacity-50" />
                            <p>Select a transaction type to view statements</p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : statements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                            <p>No statements configured for {selectedType?.name}</p>
                            <Button variant="outline" className="mt-4" onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add First Statement
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedStatements).map(([stageCode, stageStatements]: [string, any]) => (
                                <div key={stageCode} className="border rounded-lg">
                                    <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge>{stageCode}</Badge>
                                            <span className="font-medium">{getStageName(stageCode)}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {stageStatements.length} statement(s)
                                        </span>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>Statement Text</TableHead>
                                                <TableHead className="w-24">Required</TableHead>
                                                <TableHead className="w-24">Status</TableHead>
                                                <TableHead className="w-24">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {stageStatements
                                                .sort((a: any, b: any) => a.sequence - b.sequence)
                                                .map((s: any) => (
                                                    <TableRow key={s.id}>
                                                        <TableCell>
                                                            <Badge variant="outline">{s.sequence}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-sm">{s.text}</p>
                                                        </TableCell>
                                                        <TableCell>
                                                            {s.is_required ? (
                                                                <Badge variant="destructive">Wajib</Badge>
                                                            ) : (
                                                                <Badge variant="secondary">Opsional</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={s.is_active ? 'default' : 'secondary'}>
                                                                {s.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1">
                                                                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editId ? 'Edit Statement' : 'Add Statement'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Stage *</Label>
                                <Select
                                    value={form.stage_code}
                                    onValueChange={(v) => setForm({ ...form, stage_code: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {routing.map((r: any) => (
                                            <SelectItem key={r.stage_code} value={r.stage_code}>
                                                {r.stage_code} - {r.stage_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Sequence</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.sequence}
                                    onChange={(e) => setForm({ ...form, sequence: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Statement Text *</Label>
                            <textarea
                                className="w-full min-h-[100px] p-3 border rounded-md resize-none text-sm"
                                placeholder="Enter statement text..."
                                value={form.text}
                                onChange={(e) => setForm({ ...form, text: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_required"
                                    checked={form.is_required}
                                    onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="is_required">Required (Wajib dicentang)</Label>
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
