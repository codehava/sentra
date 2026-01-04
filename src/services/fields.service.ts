import { supabase } from '@/lib/supabase';
import type { FieldMaster } from '@/types';

export interface FieldWithSystem extends FieldMaster {
    is_system?: boolean;
    source_table?: string;
    description?: string;
}

export async function getFields(): Promise<FieldWithSystem[]> {
    const { data, error } = await supabase
        .from('field_master')
        .select('*')
        .order('is_system', { ascending: false })
        .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function getField(id: number): Promise<FieldWithSystem | null> {
    const { data, error } = await supabase
        .from('field_master')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createField(field: Omit<FieldWithSystem, 'id'>): Promise<FieldWithSystem> {
    const { data, error } = await supabase
        .from('field_master')
        .insert({ ...field, is_system: false }) // New fields are never system fields
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateField(id: number, field: Partial<FieldWithSystem>): Promise<FieldWithSystem> {
    // Don't allow changing is_system or source_table via update
    const { is_system, source_table, ...updateData } = field;

    const { data, error } = await supabase
        .from('field_master')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteField(id: number): Promise<void> {
    // First check if it's a system field
    const field = await getField(id);
    if (field?.is_system) {
        throw new Error('Cannot delete system field');
    }

    const { error } = await supabase
        .from('field_master')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Get options for a system field from its source table
export async function getSystemFieldOptions(sourceTable: string): Promise<{ label: string; value: string }[]> {
    let query;

    switch (sourceTable) {
        case 'branches':
            query = supabase
                .from('branches')
                .select('code, name')
                .eq('is_active', true)
                .order('name');
            break;
        case 'roles':
            query = supabase
                .from('roles')
                .select('code, name')
                .order('name');
            break;
        case 'transaction_types':
            query = supabase
                .from('transaction_types')
                .select('code, name')
                .eq('is_active', true)
                .order('name');
            break;
        default:
            return [];
    }

    const { data, error } = await query;
    if (error) return [];

    return (data || []).map((item: any) => ({
        label: item.name,
        value: item.code,
    }));
}

// Add option to a source table (for system fields)
export async function addSystemFieldOption(
    sourceTable: string,
    option: { code: string; name: string;[key: string]: any }
): Promise<void> {
    const { error } = await supabase
        .from(sourceTable)
        .insert(option);

    if (error) throw error;
}

// Update option in a source table
export async function updateSystemFieldOption(
    sourceTable: string,
    code: string,
    updates: { name?: string; is_active?: boolean;[key: string]: any }
): Promise<void> {
    const { error } = await supabase
        .from(sourceTable)
        .update(updates)
        .eq('code', code);

    if (error) throw error;
}

// Delete option from a source table
export async function deleteSystemFieldOption(
    sourceTable: string,
    code: string
): Promise<void> {
    const { error } = await supabase
        .from(sourceTable)
        .delete()
        .eq('code', code);

    if (error) throw error;
}
