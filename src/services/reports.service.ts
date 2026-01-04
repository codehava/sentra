import { supabase } from '@/lib/supabase';
import type { Transaction } from '@/types';

export interface ReportFilters {
    transactionTypeId?: number;
    branchCode?: string;
    status?: string;
    slaStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    createdBy?: string;
}

export interface TransactionReport extends Transaction {
    transaction_type?: { id: number; code: string; name: string };
    creator?: { id: string; full_name: string; nip: string };
}

// Get transactions with filters for reports
export async function getTransactionReport(filters: ReportFilters): Promise<TransactionReport[]> {
    let query = supabase
        .from('transactions')
        .select(`
      *,
      transaction_type:transaction_types(id, code, name),
      creator:users!created_by(id, full_name, nip)
    `)
        .order('created_at', { ascending: false });

    if (filters.transactionTypeId) {
        query = query.eq('transaction_type_id', filters.transactionTypeId);
    }
    if (filters.branchCode) {
        query = query.eq('branch_code', filters.branchCode);
    }
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.slaStatus) {
        query = query.eq('sla_status', filters.slaStatus);
    }
    if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
    }
    if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// Export to CSV format
export function exportToCSV(data: TransactionReport[], filename: string): void {
    const headers = [
        'Ticket Number',
        'Type',
        'Status',
        'SLA Status',
        'Current Stage',
        'Creator',
        'Creator NIP',
        'Created At',
        'Updated At',
    ];

    const rows = data.map((tx) => [
        tx.ticket_number,
        tx.transaction_type?.code || '',
        tx.status,
        tx.sla_status || '',
        tx.current_stage,
        tx.creator?.full_name || '',
        tx.creator?.nip || '',
        new Date(tx.created_at).toLocaleString('id-ID'),
        new Date(tx.updated_at).toLocaleString('id-ID'),
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Get summary stats for report
export async function getReportSummary(filters: ReportFilters): Promise<{
    total: number;
    open: number;
    closed: number;
    rejected: number;
    breached: number;
}> {
    const data = await getTransactionReport(filters);

    return {
        total: data.length,
        open: data.filter((t) => t.status === 'OPEN').length,
        closed: data.filter((t) => t.status === 'CLOSED').length,
        rejected: data.filter((t) => t.status === 'REJECTED').length,
        breached: data.filter((t) => t.sla_status === 'BREACHED').length,
    };
}

// Get detailed stage history for all transactions (Admin only)
export async function getStageHistoryReport(filters: ReportFilters): Promise<any[]> {
    // First get filtered transactions
    const transactions = await getTransactionReport(filters);
    const transactionIds = transactions.map(t => t.id);

    if (transactionIds.length === 0) return [];

    // Get all history for these transactions
    const { data: history, error } = await supabase
        .from('transaction_history')
        .select(`
            *,
            actor:users!action_by(full_name, nip)
        `)
        .in('transaction_id', transactionIds)
        .order('created_at', { ascending: true });

    if (error) throw error;

    // Process history to calculate stage durations
    const result: any[] = [];

    transactions.forEach(tx => {
        const txHistory = (history || []).filter(h => h.transaction_id === tx.id);

        txHistory.forEach((entry, index) => {
            // Find next entry to calculate duration
            const nextEntry = txHistory[index + 1];
            const startTime = new Date(entry.created_at);
            const endTime = nextEntry ? new Date(nextEntry.created_at) : null;
            const durationHours = endTime
                ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
                : null;

            result.push({
                ticket_number: tx.ticket_number,
                transaction_type: tx.transaction_type?.code || '',
                branch_code: tx.branch_code || '',
                stage_code: entry.stage_code,
                action: entry.action,
                action_by: entry.actor?.full_name || '',
                action_by_nip: entry.actor?.nip || '',
                start_time: startTime.toISOString(),
                end_time: endTime?.toISOString() || '',
                duration_hours: durationHours !== null ? durationHours.toFixed(2) : '',
                comment: entry.comment || '',
            });
        });
    });

    return result;
}

