import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactionTypes } from '@/services/transaction-types.service';
import { getRoutingMatrix } from '@/services/routing.service';
import {
    getSlaSettings,
    updateSlaSettings,
    getSlaConfigs,
    upsertSlaConfig,
    getStageSlaConfigs,
    upsertStageSlaConfig,
    getHolidays,
    createHoliday,
    deleteHoliday,
} from '@/services/sla.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Loader2, Clock, Calendar, Settings, Trash2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

const PRIORITIES = [
    { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-700' },
    { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
    { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export function SlaConfigPage() {
    const queryClient = useQueryClient();
    const [selectedTypeId, setSelectedTypeId] = useState<string>('');
    const [newHoliday, setNewHoliday] = useState({ date: '', name: '', is_recurring: false });

    // Fetch all data
    const { data: settings, isLoading: settingsLoading } = useQuery({
        queryKey: ['sla-settings'],
        queryFn: getSlaSettings,
    });

    const { data: types = [] } = useQuery({
        queryKey: ['transaction-types'],
        queryFn: getTransactionTypes,
    });

    const { data: slaConfigs = [] } = useQuery({
        queryKey: ['sla-configs'],
        queryFn: getSlaConfigs,
    });

    const { data: routing = [] } = useQuery({
        queryKey: ['routing-matrix', selectedTypeId],
        queryFn: () => getRoutingMatrix(selectedTypeId ? parseInt(selectedTypeId) : undefined),
        enabled: !!selectedTypeId,
    });

    const { data: stageSlaConfigs = [] } = useQuery({
        queryKey: ['stage-sla-configs', selectedTypeId],
        queryFn: () => getStageSlaConfigs(parseInt(selectedTypeId)),
        enabled: !!selectedTypeId,
    });

    const { data: holidays = [] } = useQuery({
        queryKey: ['holidays'],
        queryFn: () => getHolidays(),
    });

    // Mutations
    const updateSettingsMutation = useMutation({
        mutationFn: updateSlaSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sla-settings'] });
            toast.success('Settings updated');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateSlaConfigMutation = useMutation({
        mutationFn: ({ typeId, config }: { typeId: number; config: any }) =>
            upsertSlaConfig(typeId, config),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sla-configs'] });
            toast.success('SLA config updated');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateStageSlaConfigMutation = useMutation({
        mutationFn: ({ typeId, stageCode, config }: { typeId: number; stageCode: string; config: any }) =>
            upsertStageSlaConfig(typeId, stageCode, config),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-sla-configs'] });
            toast.success('Stage SLA updated');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const addHolidayMutation = useMutation({
        mutationFn: createHoliday,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            setNewHoliday({ date: '', name: '', is_recurring: false });
            toast.success('Holiday added');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteHolidayMutation = useMutation({
        mutationFn: deleteHoliday,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            toast.success('Holiday deleted');
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const getSlaConfigForType = (typeId: number) =>
        slaConfigs.find((c: any) => c.transaction_type_id === typeId);

    const getStageSla = (stageCode: string) =>
        stageSlaConfigs.find((c: any) => c.stage_code === stageCode);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">SLA Configuration</h1>
                <p className="text-muted-foreground">Kelola pengaturan SLA untuk transaksi</p>
            </div>

            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general">
                        <Settings className="h-4 w-4 mr-2" />
                        General Settings
                    </TabsTrigger>
                    <TabsTrigger value="types">
                        <Clock className="h-4 w-4 mr-2" />
                        Per Type
                    </TabsTrigger>
                    <TabsTrigger value="holidays">
                        <Calendar className="h-4 w-4 mr-2" />
                        Holidays
                    </TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Working Hours</CardTitle>
                            <CardDescription>Set jam kerja untuk kalkulasi SLA</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {settingsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="grid gap-4 max-w-md">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Start Hour</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="23"
                                                defaultValue={settings?.working_hour_start || 8}
                                                onBlur={(e) =>
                                                    updateSettingsMutation.mutate({
                                                        working_hour_start: parseInt(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>End Hour</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="23"
                                                defaultValue={settings?.working_hour_end || 17}
                                                onBlur={(e) =>
                                                    updateSettingsMutation.mutate({
                                                        working_hour_end: parseInt(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Warning Threshold (%)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            defaultValue={settings?.warning_threshold_percent || 75}
                                            onBlur={(e) =>
                                                updateSettingsMutation.mutate({
                                                    warning_threshold_percent: parseInt(e.target.value),
                                                })
                                            }
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            SLA status akan menjadi WARNING setelah persentase ini tercapai
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Per Type SLA */}
                <TabsContent value="types" className="mt-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction Type SLA</CardTitle>
                            <CardDescription>Konfigurasi SLA per jenis transaksi</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="w-32">Total Hours</TableHead>
                                        <TableHead className="w-32">Priority</TableHead>
                                        <TableHead className="w-24">Active</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {types.map((type: any) => {
                                        const config = getSlaConfigForType(type.id);
                                        return (
                                            <TableRow key={type.id}>
                                                <TableCell>
                                                    <Badge variant="outline" className="mr-2">{type.code}</Badge>
                                                    {type.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        className="w-20"
                                                        defaultValue={config?.total_sla_hours || 48}
                                                        onBlur={(e) =>
                                                            updateSlaConfigMutation.mutate({
                                                                typeId: type.id,
                                                                config: { total_sla_hours: parseInt(e.target.value) },
                                                            })
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        defaultValue={config?.priority || 'NORMAL'}
                                                        onValueChange={(v) =>
                                                            updateSlaConfigMutation.mutate({
                                                                typeId: type.id,
                                                                config: { priority: v },
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger className="w-28">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {PRIORITIES.map((p) => (
                                                                <SelectItem key={p.value} value={p.value}>
                                                                    {p.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        defaultChecked={config?.is_active !== false}
                                                        onChange={(e) =>
                                                            updateSlaConfigMutation.mutate({
                                                                typeId: type.id,
                                                                config: { is_active: e.target.checked },
                                                            })
                                                        }
                                                        className="h-4 w-4"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Stage SLA Config */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <CardTitle>Stage SLA</CardTitle>
                                    <CardDescription>Set SLA per stage untuk setiap transaction type</CardDescription>
                                </div>
                                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {types.map((t: any) => (
                                            <SelectItem key={t.id} value={String(t.id)}>
                                                {t.code} - {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!selectedTypeId ? (
                                <p className="text-center py-8 text-muted-foreground">
                                    Select a transaction type
                                </p>
                            ) : routing.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">
                                    No routing stages configured
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order</TableHead>
                                            <TableHead>Stage</TableHead>
                                            <TableHead className="w-32">SLA Hours</TableHead>
                                            <TableHead className="w-32">Warning %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {routing.map((stage: any) => {
                                            const stageSla = getStageSla(stage.stage_code);
                                            return (
                                                <TableRow key={stage.id}>
                                                    <TableCell>
                                                        <Badge variant="outline">{stage.stage_order}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {stage.stage_name}
                                                        <span className="text-muted-foreground ml-2 text-xs">
                                                            ({stage.stage_code})
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            className="w-20"
                                                            defaultValue={stageSla?.sla_hours || 8}
                                                            onBlur={(e) =>
                                                                updateStageSlaConfigMutation.mutate({
                                                                    typeId: parseInt(selectedTypeId),
                                                                    stageCode: stage.stage_code,
                                                                    config: { sla_hours: parseInt(e.target.value) },
                                                                })
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            className="w-20"
                                                            defaultValue={stageSla?.warning_threshold_percent || 75}
                                                            onBlur={(e) =>
                                                                updateStageSlaConfigMutation.mutate({
                                                                    typeId: parseInt(selectedTypeId),
                                                                    stageCode: stage.stage_code,
                                                                    config: {
                                                                        warning_threshold_percent: parseInt(e.target.value),
                                                                    },
                                                                })
                                                            }
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Holidays */}
                <TabsContent value="holidays" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Holidays</CardTitle>
                            <CardDescription>
                                Hari libur tidak dihitung dalam kalkulasi SLA
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 mb-4">
                                <Input
                                    type="date"
                                    className="w-40"
                                    value={newHoliday.date}
                                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                />
                                <Input
                                    placeholder="Holiday name"
                                    className="flex-1"
                                    value={newHoliday.name}
                                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                                />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="recurring"
                                        checked={newHoliday.is_recurring}
                                        onChange={(e) =>
                                            setNewHoliday({ ...newHoliday, is_recurring: e.target.checked })
                                        }
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="recurring">Recurring</Label>
                                </div>
                                <Button
                                    onClick={() => addHolidayMutation.mutate(newHoliday)}
                                    disabled={!newHoliday.date || !newHoliday.name}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                </Button>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-32">Date</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="w-24">Recurring</TableHead>
                                        <TableHead className="w-20"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {holidays.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No holidays configured
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        holidays.map((h: any) => (
                                            <TableRow key={h.id}>
                                                <TableCell>
                                                    {new Date(h.date).toLocaleDateString('id-ID', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </TableCell>
                                                <TableCell>{h.name}</TableCell>
                                                <TableCell>
                                                    {h.is_recurring ? (
                                                        <Badge variant="secondary">Yearly</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => deleteHolidayMutation.mutate(h.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
