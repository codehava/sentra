import { supabase } from '@/lib/supabase';
import type { FieldAccessMatrix } from '@/types';

export interface FieldAccessWithField extends FieldAccessMatrix {
    field?: { id: number; code: string; name: string; type: string; options?: any; source_table?: string; description?: string };
}

export async function getFieldAccess(
    transactionTypeId?: number,
    stageCode?: string
): Promise<FieldAccessWithField[]> {
    let query = supabase
        .from('field_access_matrix')
        .select(`
      *,
      field:field_master(id, code, name, type, options, source_table, description)
    `)
        .order('field_order', { ascending: true });

    if (transactionTypeId) {
        query = query.eq('transaction_type_id', transactionTypeId);
    }
    if (stageCode) {
        query = query.eq('stage_code', stageCode);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function createFieldAccess(
    entry: Omit<FieldAccessMatrix, 'id'>
): Promise<FieldAccessMatrix> {
    const { data, error } = await supabase
        .from('field_access_matrix')
        .insert(entry)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateFieldAccess(
    id: number,
    entry: Partial<FieldAccessMatrix>
): Promise<FieldAccessMatrix> {
    const { data, error } = await supabase
        .from('field_access_matrix')
        .update(entry)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteFieldAccess(id: number): Promise<void> {
    const { error } = await supabase
        .from('field_access_matrix')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Batch upsert field access for a transaction type and stage
export async function upsertFieldAccessBatch(
    transactionTypeId: number,
    stageCode: string,
    entries: Omit<FieldAccessMatrix, 'id'>[]
): Promise<void> {
    // Delete existing entries for this type + stage
    await supabase
        .from('field_access_matrix')
        .delete()
        .eq('transaction_type_id', transactionTypeId)
        .eq('stage_code', stageCode);

    // Insert new entries
    if (entries.length > 0) {
        const { error } = await supabase
            .from('field_access_matrix')
            .insert(entries.map(e => ({
                ...e,
                transaction_type_id: transactionTypeId,
                stage_code: stageCode
            })));

        if (error) throw error;
    }
}
