import { supabase } from '@/lib/supabase';
import type { TransactionType } from '@/types';

export async function getTransactionTypes(): Promise<TransactionType[]> {
    const { data, error } = await supabase
        .from('transaction_types')
        .select('*')
        .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function getTransactionType(id: number): Promise<TransactionType | null> {
    const { data, error } = await supabase
        .from('transaction_types')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createTransactionType(
    transactionType: Omit<TransactionType, 'id'>
): Promise<TransactionType> {
    const { data, error } = await supabase
        .from('transaction_types')
        .insert(transactionType)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateTransactionType(
    id: number,
    transactionType: Partial<TransactionType>
): Promise<TransactionType> {
    const { data, error } = await supabase
        .from('transaction_types')
        .update(transactionType)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteTransactionType(id: number): Promise<void> {
    const { error } = await supabase
        .from('transaction_types')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
