import { supabase } from '@/lib/supabase';
import type { Transaction } from '@/types';

export interface TransactionWithDetails extends Transaction {
    transaction_type?: { id: number; code: string; name: string };
    creator?: { id: string; full_name: string; nip: string };
}

// Get all transactions
export async function getTransactions(filters?: {
    status?: string;
    transactionTypeId?: number;
    createdBy?: string;
}): Promise<TransactionWithDetails[]> {
    let query = supabase
        .from('transactions')
        .select(`
      *,
      transaction_type:transaction_types(id, code, name),
      creator:users!created_by(id, full_name, nip)
    `)
        .order('created_at', { ascending: false });

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.transactionTypeId) {
        query = query.eq('transaction_type_id', filters.transactionTypeId);
    }
    if (filters?.createdBy) {
        query = query.eq('created_by', filters.createdBy);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// Get transactions for current stage (inbox/tasks)
export async function getTasksForRole(roleCode: string, userId?: string): Promise<TransactionWithDetails[]> {
    // Get stages that this role handles
    const { data: stages, error: stagesError } = await supabase
        .from('routing_matrix')
        .select('stage_code, transaction_type_id')
        .eq('role_id', (await getRoleIdByCode(roleCode)));

    if (stagesError) throw stagesError;
    if (!stages || stages.length === 0) return [];

    // Build filter for matching transactions
    const stageConditions = stages.map(s =>
        `and(transaction_type_id.eq.${s.transaction_type_id},current_stage.eq.${s.stage_code})`
    ).join(',');

    // Get user's branches for filtering
    let branchCodes: string[] = [];
    if (userId) {
        const { data: userBranches } = await supabase
            .from('user_branches')
            .select('branch_code')
            .eq('user_id', userId);
        branchCodes = userBranches?.map(ub => ub.branch_code) || [];
    }

    let query = supabase
        .from('transactions')
        .select(`
      *,
      transaction_type:transaction_types(id, code, name),
      creator:users!created_by(id, full_name, nip)
    `)
        .eq('status', 'OPEN')
        .or(stageConditions)
        .order('created_at', { ascending: false });

    // Filter by user's branches if they have any assigned
    if (branchCodes.length > 0) {
        query = query.in('branch_code', branchCodes);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
}

// Get my created tickets
export async function getMyTickets(userId: string): Promise<TransactionWithDetails[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
      *,
      transaction_type:transaction_types(id, code, name),
      creator:users!created_by(id, full_name, nip)
    `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

// Get single transaction with details
export async function getTransaction(id: string): Promise<TransactionWithDetails | null> {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
      *,
      transaction_type:transaction_types(id, code, name),
      creator:users!created_by(id, full_name, nip)
    `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

// Create new transaction
export async function createTransaction(data: {
    transaction_type_id: number;
    data: Record<string, unknown>;
    created_by: string;
    branch_code?: string;
}): Promise<Transaction> {
    // Generate ticket number
    const { data: ticketData, error: ticketError } = await supabase
        .rpc('generate_ticket_number', { type_code: '' });

    // Get first stage for this transaction type
    const { data: firstStage, error: stageError } = await supabase
        .from('routing_matrix')
        .select('stage_code')
        .eq('transaction_type_id', data.transaction_type_id)
        .order('stage_order', { ascending: true })
        .limit(1)
        .single();

    if (stageError) throw stageError;

    const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
            transaction_type_id: data.transaction_type_id,
            ticket_number: ticketData || `TRX-${Date.now()}`,
            current_stage: firstStage?.stage_code || 'MAKER',
            status: 'OPEN',
            data: data.data,
            created_by: data.created_by,
            branch_code: data.branch_code,
            stage_started_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;

    // Create history entry
    await createHistoryEntry({
        transaction_id: transaction.id,
        stage_code: firstStage?.stage_code || 'MAKER',
        action: 'CREATED',
        action_by: data.created_by,
    });

    return transaction;
}

// Process transaction (approve/reject)
export async function processTransaction(
    transactionId: string,
    action: 'APPROVED' | 'REJECTED' | 'RETURNED',
    userId: string,
    comment?: string
): Promise<Transaction> {
    // Get current transaction
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*, transaction_type_id, current_stage')
        .eq('id', transactionId)
        .single();

    if (txError) throw txError;

    let updates: any = {};

    if (action === 'APPROVED') {
        // Get next stage
        const { data: currentStage } = await supabase
            .from('routing_matrix')
            .select('stage_order, is_final')
            .eq('transaction_type_id', transaction.transaction_type_id)
            .eq('stage_code', transaction.current_stage)
            .single();

        if (currentStage?.is_final) {
            // Final stage - close transaction
            updates = { status: 'CLOSED' };
        } else {
            // Move to next stage
            const { data: nextStage } = await supabase
                .from('routing_matrix')
                .select('stage_code')
                .eq('transaction_type_id', transaction.transaction_type_id)
                .eq('stage_order', (currentStage?.stage_order || 0) + 1)
                .single();

            if (nextStage) {
                updates = {
                    current_stage: nextStage.stage_code,
                    stage_started_at: new Date().toISOString(),
                };
            }
        }
    } else if (action === 'REJECTED') {
        updates = { status: 'REJECTED' };
    }

    // Update transaction
    const { data: updated, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transactionId)
        .select()
        .single();

    if (error) throw error;

    // Create history entry
    await createHistoryEntry({
        transaction_id: transactionId,
        stage_code: transaction.current_stage,
        action,
        action_by: userId,
        comment,
    });

    return updated;
}

// Helper: Create history entry
async function createHistoryEntry(data: {
    transaction_id: string;
    stage_code: string;
    action: string;
    action_by: string;
    comment?: string;
}) {
    await supabase.from('transaction_history').insert(data);
}

// Helper: Get role ID by code
async function getRoleIdByCode(code: string): Promise<number> {
    const { data, error } = await supabase
        .from('roles')
        .select('id')
        .eq('code', code)
        .single();

    if (error) throw error;
    return data?.id || 0;
}

// Get transaction history
export async function getTransactionHistory(transactionId: string) {
    const { data, error } = await supabase
        .from('transaction_history')
        .select(`
      *,
      actor:users!action_by(id, full_name, nip)
    `)
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}
