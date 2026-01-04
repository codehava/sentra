import { supabase } from '@/lib/supabase';

export interface Statement {
    id: number;
    transaction_type_id: number;
    stage_code: string;
    text: string;
    is_required: boolean;
    sequence: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    transaction_type?: { id: number; code: string; name: string };
}

// Get statements for a transaction type and stage
export async function getStatements(transactionTypeId: number, stageCode: string): Promise<Statement[]> {
    const { data, error } = await supabase
        .from('statements')
        .select('*')
        .eq('transaction_type_id', transactionTypeId)
        .eq('stage_code', stageCode)
        .eq('is_active', true)
        .order('sequence', { ascending: true });

    if (error) throw error;
    return data || [];
}

// Get all statements for a transaction type
export async function getStatementsByType(transactionTypeId: number): Promise<Statement[]> {
    const { data, error } = await supabase
        .from('statements')
        .select('*')
        .eq('transaction_type_id', transactionTypeId)
        .order('stage_code', { ascending: true })
        .order('sequence', { ascending: true });

    if (error) throw error;
    return data || [];
}

// Create statement
export async function createStatement(statement: Omit<Statement, 'id' | 'created_at' | 'updated_at' | 'transaction_type'>): Promise<Statement> {
    const { data, error } = await supabase
        .from('statements')
        .insert(statement)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Update statement
export async function updateStatement(id: number, statement: Partial<Statement>): Promise<Statement> {
    const { data, error } = await supabase
        .from('statements')
        .update({ ...statement, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Delete statement
export async function deleteStatement(id: number): Promise<void> {
    const { error } = await supabase
        .from('statements')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
