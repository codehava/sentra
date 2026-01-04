import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getFields,
    createField,
    updateField,
    deleteField,
    getSystemFieldOptions,
    addSystemFieldOption,
    updateSystemFieldOption,
    deleteSystemFieldOption,
    type FieldWithSystem,
} from '@/services/fields.service';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Loader2, X, ChevronDown, ChevronUp, Shield, Database } from 'lucide-react';
import { toast } from 'sonner';

const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'currency', label: 'Currency' },
    { value: 'date', label: 'Date' },
    { value: 'file', label: 'File Upload' },
    { value: 'select', label: 'Dropdown Select' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'statement', label: 'Statement/Pernyataan' },
];

interface OptionItem {
    label: string;
    value: string;
}

export function FieldMasterPage() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSystemOptionsOpen, setIsSystemOptionsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FieldWithSystem | null>(null);
    const [selectedSystemField, setSelectedSystemField] = useState<FieldWithSystem | null>(null);
    const [newOptionForm, setNewOptionForm] = useState({ code: '', name: '' });
    const [editingOption, setEditingOption] = useState<{ code: string; name: string } | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'text',
        description: '',
        is_active: true,
    });
    const [options, setOptions] = useState<OptionItem[]>([]);

    const { data: fields = [], isLoading } = useQuery({
        queryKey: ['fields'],
        queryFn: getFields,
    });

    const { data: systemOptions = [], refetch: refetchOptions } = useQuery({
        queryKey: ['system-options', selectedSystemField?.source_table],
        queryFn: () => getSystemFieldOptions(selectedSystemField?.source_table || ''),
        enabled: !!selectedSystemField?.source_table,
    });

    const createMutation = useMutation({
        mutationFn: createField,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fields'] });
            toast.success('Field created');
            closeDialog();
        },
        onError: (error: Error) => toast.error(`Failed: ${error.message}`),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateField(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fields'] });
            toast.success('Field updated');
            closeDialog();
        },
        onError: (error: Error) => toast.error(`Failed: ${error.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteField,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fields'] });
            toast.success('Field deleted');
        },
        onError: (error: Error) => toast.error(`Failed: ${error.message}`),
    });

    const addOptionMutation = useMutation({
        mutationFn: ({ table, option }: { table: string; option: any }) =>
            addSystemFieldOption(table, option),
        onSuccess: () => {
            refetchOptions();
            setNewOptionForm({ code: '', name: '' });
            toast.success('Option added');
        },
        onError: (error: Error) => toast.error(`Failed: ${error.message}`),
    });

    const updateOptionMutation = useMutation({
        mutationFn: ({ table, code, updates }: { table: string; code: string; updates: any }) =>
            updateSystemFieldOption(table, code, updates),
        onSuccess: () => {
            refetchOptions();
            setEditingOption(null);
            toast.success('Option updated');
        },
        onError: (error: Error) => toast.error(`Failed: ${error.message}`),
    });

    const deleteOptionMutation = useMutation({
        mutationFn: ({ table, code }: { table: string; code: string }) =>
            deleteSystemFieldOption(table, code),
        onSuccess: () => {
            refetchOptions();
            toast.success('Option deleted');
        },
        onError: (error: Error) => toast.error(`Failed: ${error.message}`),
    });

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData({ code: '', name: '', type: 'text', description: '', is_active: true });
        setOptions([]);
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: FieldWithSystem) => {
        setEditingItem(item);
        setFormData({
            code: item.code,
            name: item.name,
            type: item.type,
            description: item.description || '',
            is_active: item.is_active,
        });
        if (item.options && Array.isArray(item.options)) {
            setOptions(item.options);
        } else {
            setOptions([]);
        }
        setIsDialogOpen(true);
    };

    const openSystemOptionsDialog = (field: FieldWithSystem) => {
        setSelectedSystemField(field);
        setNewOptionForm({ code: '', name: '' });
        setIsSystemOptionsOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingItem(null);
        setOptions([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data: any = {
            code: formData.code,
            name: formData.name,
            type: formData.type,
            description: formData.description || null,
            is_active: formData.is_active,
            options: formData.type === 'select' ? options : null,
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (field: FieldWithSystem) => {
        if (field.is_system) {
            toast.error('System fields cannot be deleted');
            return;
        }
        if (confirm('Delete this field?')) {
            deleteMutation.mutate(field.id);
        }
    };

    const handleAddSystemOption = () => {
        if (!selectedSystemField?.source_table || !newOptionForm.code || !newOptionForm.name) {
            toast.error('Code and name are required');
            return;
        }
        addOptionMutation.mutate({
            table: selectedSystemField.source_table,
            option: {
                code: newOptionForm.code.toUpperCase(),
                name: newOptionForm.name,
                is_active: true,
            },
        });
    };

    // Options management for regular select fields
    const addOption = () => setOptions([...options, { label: '', value: '' }]);

    const updateOption = (index: number, field: 'label' | 'value', value: string) => {
        const newOptions = [...options];
        newOptions[index][field] = value;
        if (field === 'label' && !newOptions[index].value) {
            newOptions[index].value = value.toLowerCase().replace(/\s+/g, '_');
        }
        setOptions(newOptions);
    };

    const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index));

    const moveOption = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === options.length - 1) return;
        const newOptions = [...options];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];
        setOptions(newOptions);
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;
    const systemFields = fields.filter((f) => f.is_system);
    const customFields = fields.filter((f) => !f.is_system);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Field Master</h1>
                    <p className="text-muted-foreground">Kelola daftar field yang tersedia untuk transaksi</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                </Button>
            </div>

            <Tabs defaultValue="all">
                <TabsList>
                    <TabsTrigger value="all">All Fields ({fields.length})</TabsTrigger>
                    <TabsTrigger value="system">
                        <Shield className="h-4 w-4 mr-1" />
                        System ({systemFields.length})
                    </TabsTrigger>
                    <TabsTrigger value="custom">Custom ({customFields.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <FieldTable
                        fields={fields}
                        isLoading={isLoading}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                        onManageOptions={openSystemOptionsDialog}
                    />
                </TabsContent>
                <TabsContent value="system" className="mt-4">
                    <FieldTable
                        fields={systemFields}
                        isLoading={isLoading}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                        onManageOptions={openSystemOptionsDialog}
                    />
                </TabsContent>
                <TabsContent value="custom" className="mt-4">
                    <FieldTable
                        fields={customFields}
                        isLoading={isLoading}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                        onManageOptions={openSystemOptionsDialog}
                    />
                </TabsContent>
            </Tabs>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'Edit Field' : 'Create Field'}
                            {editingItem?.is_system && (
                                <Badge variant="secondary" className="ml-2">
                                    <Shield className="h-3 w-3 mr-1" />
                                    System
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Code</Label>
                                    <Input
                                        placeholder="e.g., nomor_dokumen"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                        required
                                        disabled={!!editingItem}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(v) => setFormData({ ...formData, type: v })}
                                        disabled={editingItem?.is_system}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FIELD_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    placeholder="e.g., Nomor Dokumen"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                    placeholder="Deskripsi field (opsional)"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* Options Editor for regular select fields (not system) */}
                            {formData.type === 'select' && !editingItem?.is_system && (
                                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <Label>Dropdown Options</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addOption}>
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add
                                        </Button>
                                    </div>
                                    {options.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No options. Click "Add" to create choices.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {options.map((opt, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className="flex flex-col gap-1">
                                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveOption(idx, 'up')} disabled={idx === 0}>
                                                            <ChevronUp className="h-3 w-3" />
                                                        </Button>
                                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveOption(idx, 'down')} disabled={idx === options.length - 1}>
                                                            <ChevronDown className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <Input placeholder="Label" value={opt.label} onChange={(e) => updateOption(idx, 'label', e.target.value)} className="flex-1" />
                                                    <Input placeholder="Value" value={opt.value} onChange={(e) => updateOption(idx, 'value', e.target.value)} className="w-32" />
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(idx)}>
                                                        <X className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* System field info */}
                            {editingItem?.is_system && (
                                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                                    <p className="text-sm text-blue-700">
                                        <Shield className="h-4 w-4 inline mr-1" />
                                        System field options are managed from the database table: <code className="bg-blue-100 px-1 rounded">{editingItem.source_table}</code>
                                    </p>
                                </div>
                            )}

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

            {/* System Field Options Dialog */}
            <Dialog open={isSystemOptionsOpen} onOpenChange={setIsSystemOptionsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Manage {selectedSystemField?.name} Options
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Add new option */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Code"
                                value={newOptionForm.code}
                                onChange={(e) => setNewOptionForm({ ...newOptionForm, code: e.target.value.toUpperCase() })}
                                className="w-28"
                            />
                            <Input
                                placeholder="Name"
                                value={newOptionForm.name}
                                onChange={(e) => setNewOptionForm({ ...newOptionForm, name: e.target.value })}
                                className="flex-1"
                            />
                            <Button onClick={handleAddSystemOption} disabled={addOptionMutation.isPending}>
                                {addOptionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </Button>
                        </div>

                        {/* Options list */}
                        <div className="max-h-80 overflow-auto border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-28">Code</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {systemOptions.map((opt: any) => (
                                        <TableRow key={opt.value}>
                                            <TableCell>
                                                <Badge variant="outline">{opt.value}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {editingOption?.code === opt.value ? (
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={editingOption.name}
                                                            onChange={(e) => setEditingOption({ ...editingOption, name: e.target.value })}
                                                            className="h-8"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                if (selectedSystemField?.source_table) {
                                                                    updateOptionMutation.mutate({
                                                                        table: selectedSystemField.source_table,
                                                                        code: opt.value,
                                                                        updates: { name: editingOption.name },
                                                                    });
                                                                }
                                                            }}
                                                            disabled={updateOptionMutation.isPending}
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingOption(null)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    opt.label
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {!editingOption && (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => setEditingOption({ code: opt.value, name: opt.label })}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => {
                                                                if (confirm(`Delete ${opt.label}?`) && selectedSystemField?.source_table) {
                                                                    deleteOptionMutation.mutate({
                                                                        table: selectedSystemField.source_table,
                                                                        code: opt.value,
                                                                    });
                                                                }
                                                            }}
                                                            disabled={deleteOptionMutation.isPending}
                                                        >
                                                            <Trash2 className="h-3 w-3 text-destructive" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSystemOptionsOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Field Table Component
function FieldTable({
    fields,
    isLoading,
    onEdit,
    onDelete,
    onManageOptions,
}: {
    fields: FieldWithSystem[];
    isLoading: boolean;
    onEdit: (f: FieldWithSystem) => void;
    onDelete: (f: FieldWithSystem) => void;
    onManageOptions: (f: FieldWithSystem) => void;
}) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">ID</TableHead>
                            <TableHead className="w-40">Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-28">Type</TableHead>
                            <TableHead>Options</TableHead>
                            <TableHead className="w-24">Status</TableHead>
                            <TableHead className="w-28 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No fields found
                                </TableCell>
                            </TableRow>
                        ) : (
                            fields.map((field) => (
                                <TableRow key={field.id}>
                                    <TableCell>{field.id}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{field.code}</code>
                                            {field.is_system && (
                                                <Badge variant="secondary" className="text-xs">
                                                    <Shield className="h-3 w-3" />
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{field.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{field.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {field.is_system && field.source_table ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => onManageOptions(field)}
                                            >
                                                <Database className="h-3 w-3 mr-1" />
                                                {field.source_table}
                                            </Button>
                                        ) : field.type === 'select' && field.options ? (
                                            <span className="text-xs text-muted-foreground">
                                                {(field.options as any[]).length} options
                                            </span>
                                        ) : null}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={field.is_active ? 'default' : 'secondary'}>
                                            {field.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(field)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDelete(field)}
                                                disabled={field.is_system}
                                            >
                                                <Trash2 className={`h-4 w-4 ${field.is_system ? 'text-muted-foreground' : 'text-destructive'}`} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
