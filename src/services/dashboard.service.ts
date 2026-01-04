import { supabase } from '@/lib/supabase';

export interface DashboardStats {
    myTasks: number;
    totalCreated: number;
    pendingApproval: number;
    completedThisMonth: number;
    slaBreached: number;
    slaAtRisk: number;
    slaOnTrack: number;
}

export interface SlaTransaction {
    id: string;
    ticket_number: string;
    transaction_type: any;
    current_stage: string;
    sla_status: string;
    stage_started_at: string;
    stage_sla_deadline: string | null;
    creator: any;
}

// Get dashboard statistics
export async function getDashboardStats(userId?: string, roleCode?: string, branchCode?: string): Promise<DashboardStats> {
    // Get user's branches for filtering
    let userBranchCodes: string[] = [];
    if (userId) {
        const { data: userBranches } = await supabase
            .from('user_branches')
            .select('branch_code')
            .eq('user_id', userId);
        userBranchCodes = userBranches?.map(ub => ub.branch_code) || [];
    }

    // Determine which branches to filter by
    const branchesToFilter = branchCode && branchCode !== 'all'
        ? [branchCode]
        : userBranchCodes;

    // Get total tasks for this role
    let myTasks = 0;
    if (roleCode) {
        const { data: roleData } = await supabase.from('roles').select('id').eq('code', roleCode).single();
        if (roleData) {
            const { data: stages } = await supabase
                .from('routing_matrix')
                .select('stage_code, transaction_type_id')
                .eq('role_id', roleData.id);

            if (stages && stages.length > 0) {
                // Count open transactions at these stages
                const conditions = stages.map(s =>
                    `and(transaction_type_id.eq.${s.transaction_type_id},current_stage.eq.${s.stage_code})`
                ).join(',');

                let query = supabase
                    .from('transactions')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'OPEN')
                    .or(conditions);

                if (branchesToFilter.length > 0) {
                    query = query.in('branch_code', branchesToFilter);
                }

                const { count } = await query;
                myTasks = count || 0;
            }
        }
    }

    // Get total created by user
    let totalCreated = 0;
    if (userId) {
        let query = supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId);

        if (branchesToFilter.length > 0) {
            query = query.in('branch_code', branchesToFilter);
        }

        const { count } = await query;
        totalCreated = count || 0;
    }

    // Get pending approval (all open transactions)
    let pendingQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'OPEN');

    if (branchesToFilter.length > 0) {
        pendingQuery = pendingQuery.in('branch_code', branchesToFilter);
    }

    const { count: pendingCount } = await pendingQuery;

    // Get completed this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let completedQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'CLOSED')
        .gte('updated_at', startOfMonth.toISOString());

    if (branchesToFilter.length > 0) {
        completedQuery = completedQuery.in('branch_code', branchesToFilter);
    }

    const { count: completedCount } = await completedQuery;

    // Get SLA status counts
    let breachedQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'OPEN')
        .eq('sla_status', 'BREACHED');

    if (branchesToFilter.length > 0) {
        breachedQuery = breachedQuery.in('branch_code', branchesToFilter);
    }

    const { count: breachedCount } = await breachedQuery;

    let atRiskQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'OPEN')
        .eq('sla_status', 'AT_RISK');

    if (branchesToFilter.length > 0) {
        atRiskQuery = atRiskQuery.in('branch_code', branchesToFilter);
    }

    const { count: atRiskCount } = await atRiskQuery;

    let onTrackQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'OPEN')
        .in('sla_status', ['ON_TRACK', 'WARNING']);

    if (branchesToFilter.length > 0) {
        onTrackQuery = onTrackQuery.in('branch_code', branchesToFilter);
    }

    const { count: onTrackCount } = await onTrackQuery;

    return {
        myTasks,
        totalCreated,
        pendingApproval: pendingCount || 0,
        completedThisMonth: completedCount || 0,
        slaBreached: breachedCount || 0,
        slaAtRisk: atRiskCount || 0,
        slaOnTrack: onTrackCount || 0,
    };
}

// Get SLA breached transactions
export async function getSlaBreachedTransactions(limit = 10): Promise<SlaTransaction[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
      id,
      ticket_number,
      current_stage,
      sla_status,
      stage_started_at,
      stage_sla_deadline,
      transaction_type:transaction_types(code, name),
      creator:users!created_by(full_name, nip)
    `)
        .eq('status', 'OPEN')
        .eq('sla_status', 'BREACHED')
        .order('stage_started_at', { ascending: true })
        .limit(limit);

    if (error) throw error;
    return (data || []) as SlaTransaction[];
}

// Get SLA at-risk transactions
export async function getSlaAtRiskTransactions(limit = 10): Promise<SlaTransaction[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
      id,
      ticket_number,
      current_stage,
      sla_status,
      stage_started_at,
      stage_sla_deadline,
      transaction_type:transaction_types(code, name),
      creator:users!created_by(full_name, nip)
    `)
        .eq('status', 'OPEN')
        .eq('sla_status', 'AT_RISK')
        .order('stage_sla_deadline', { ascending: true })
        .limit(limit);

    if (error) throw error;
    return (data || []) as SlaTransaction[];
}

// Get transaction summary by type
export async function getTransactionSummaryByType(): Promise<{ code: string; name: string; open: number; closed: number }[]> {
    const { data: types } = await supabase
        .from('transaction_types')
        .select('id, code, name')
        .eq('is_active', true);

    if (!types) return [];

    const summary = await Promise.all(
        types.map(async (type) => {
            const { count: openCount } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('transaction_type_id', type.id)
                .eq('status', 'OPEN');

            const { count: closedCount } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('transaction_type_id', type.id)
                .eq('status', 'CLOSED');

            return {
                code: type.code,
                name: type.name,
                open: openCount || 0,
                closed: closedCount || 0,
            };
        })
    );

    return summary;
}

// Get monthly transaction trend (last 6 months)
export async function getMonthlyTrend(): Promise<{ month: string; count: number }[]> {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startOfMonth = date.toISOString();
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { count } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth);

        months.push({
            month: date.toLocaleDateString('id-ID', { month: 'short' }),
            count: count || 0,
        });
    }

    return months;
}
