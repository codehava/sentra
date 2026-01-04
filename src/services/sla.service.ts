import { supabase } from '@/lib/supabase';

export interface SlaConfig {
    id: number;
    transaction_type_id: number;
    total_sla_hours: number;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    is_active: boolean;
    created_at: string;
    updated_at: string;
    transaction_type?: { id: number; code: string; name: string };
}

export interface StageSlaConfig {
    id: number;
    transaction_type_id: number;
    stage_code: string;
    sla_hours: number;
    warning_threshold_percent: number;
    escalation_enabled: boolean;
    escalation_to_role_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface SlaSettings {
    id: number;
    working_hour_start: number;
    working_hour_end: number;
    working_days: number[];
    warning_threshold_percent: number;
    created_at: string;
    updated_at: string;
}

// Get SLA settings
export async function getSlaSettings(): Promise<SlaSettings | null> {
    const { data, error } = await supabase
        .from('sla_settings')
        .select('*')
        .limit(1)
        .single();

    if (error) return null;
    return data;
}

// Update SLA settings
export async function updateSlaSettings(settings: Partial<SlaSettings>): Promise<SlaSettings> {
    const { data: existing } = await supabase.from('sla_settings').select('id').limit(1).single();

    if (existing) {
        const { data, error } = await supabase
            .from('sla_settings')
            .update(settings)
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('sla_settings')
            .insert(settings)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

// Get all SLA configs
export async function getSlaConfigs(): Promise<SlaConfig[]> {
    const { data, error } = await supabase
        .from('sla_config')
        .select(`
      *,
      transaction_type:transaction_types(id, code, name)
    `)
        .order('transaction_type_id', { ascending: true });

    if (error) throw error;
    return data || [];
}

// Get SLA config for a transaction type
export async function getSlaConfigByType(transactionTypeId: number): Promise<SlaConfig | null> {
    const { data, error } = await supabase
        .from('sla_config')
        .select('*')
        .eq('transaction_type_id', transactionTypeId)
        .single();

    if (error) return null;
    return data;
}

// Create or update SLA config
export async function upsertSlaConfig(
    transactionTypeId: number,
    config: Partial<SlaConfig>
): Promise<SlaConfig> {
    const existing = await getSlaConfigByType(transactionTypeId);

    if (existing) {
        const { data, error } = await supabase
            .from('sla_config')
            .update(config)
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('sla_config')
            .insert({ ...config, transaction_type_id: transactionTypeId })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

// Get stage SLA configs for a transaction type
export async function getStageSlaConfigs(transactionTypeId: number): Promise<StageSlaConfig[]> {
    const { data, error } = await supabase
        .from('stage_sla_config')
        .select('*')
        .eq('transaction_type_id', transactionTypeId)
        .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
}

// Create or update stage SLA config
export async function upsertStageSlaConfig(
    transactionTypeId: number,
    stageCode: string,
    config: Partial<StageSlaConfig>
): Promise<StageSlaConfig> {
    const { data: existing } = await supabase
        .from('stage_sla_config')
        .select('id')
        .eq('transaction_type_id', transactionTypeId)
        .eq('stage_code', stageCode)
        .single();

    if (existing) {
        const { data, error } = await supabase
            .from('stage_sla_config')
            .update(config)
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('stage_sla_config')
            .insert({
                ...config,
                transaction_type_id: transactionTypeId,
                stage_code: stageCode,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

// Get holidays
export async function getHolidays(year?: number): Promise<{ id: number; date: string; name: string; is_recurring: boolean }[]> {
    let query = supabase
        .from('holidays')
        .select('*')
        .order('date', { ascending: true });

    if (year) {
        query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// Create holiday
export async function createHoliday(holiday: {
    date: string;
    name: string;
    is_recurring?: boolean;
}): Promise<void> {
    const { error } = await supabase.from('holidays').insert(holiday);
    if (error) throw error;
}

// Delete holiday
export async function deleteHoliday(id: number): Promise<void> {
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    if (error) throw error;
}
