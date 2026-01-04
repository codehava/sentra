import { supabase } from '@/lib/supabase';
import type { RoutingMatrix } from '@/types';

export interface RoutingMatrixWithRole extends RoutingMatrix {
    role?: { id: number; code: string; name: string };
}

export async function getRoutingMatrix(transactionTypeId?: number): Promise<RoutingMatrixWithRole[]> {
    let query = supabase
        .from('routing_matrix')
        .select(`
      *,
      role:roles(id, code, name)
    `)
        .order('transaction_type_id', { ascending: true })
        .order('stage_order', { ascending: true });

    if (transactionTypeId) {
        query = query.eq('transaction_type_id', transactionTypeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function createRoutingEntry(entry: Omit<RoutingMatrix, 'id'>): Promise<RoutingMatrix> {
    const { data, error } = await supabase
        .from('routing_matrix')
        .insert(entry)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateRoutingEntry(
    id: number,
    entry: Partial<RoutingMatrix>
): Promise<RoutingMatrix> {
    const { data, error } = await supabase
        .from('routing_matrix')
        .update(entry)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteRoutingEntry(id: number): Promise<void> {
    const { error } = await supabase
        .from('routing_matrix')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Batch update routing for a transaction type
export async function updateRoutingForType(
    transactionTypeId: number,
    entries: Omit<RoutingMatrix, 'id'>[]
): Promise<void> {
    // Delete existing entries
    await supabase
        .from('routing_matrix')
        .delete()
        .eq('transaction_type_id', transactionTypeId);

    // Insert new entries
    if (entries.length > 0) {
        const { error } = await supabase
            .from('routing_matrix')
            .insert(entries.map(e => ({ ...e, transaction_type_id: transactionTypeId })));

        if (error) throw error;
    }
}
