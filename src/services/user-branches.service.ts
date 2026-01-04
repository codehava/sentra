import { supabase } from '@/lib/supabase';

export interface UserBranch {
    id: number;
    user_id: string;
    branch_code: string;
    created_at: string;
}

export interface Branch {
    code: string;
    name: string;
}

// Get branches assigned to a user
export async function getUserBranches(userId: string): Promise<Branch[]> {
    const { data, error } = await supabase
        .from('user_branches')
        .select('branch_code')
        .eq('user_id', userId);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Get branch details
    const branchCodes = data.map(ub => ub.branch_code);
    const { data: branches, error: branchError } = await supabase
        .from('branches')
        .select('code, name')
        .in('code', branchCodes)
        .order('name');

    if (branchError) throw branchError;
    return branches || [];
}

// Get all branches
export async function getAllBranches(): Promise<Branch[]> {
    const { data, error } = await supabase
        .from('branches')
        .select('code, name')
        .order('name');

    if (error) throw error;
    return data || [];
}

// Assign branches to a user
export async function assignUserBranches(userId: string, branchCodes: string[]): Promise<void> {
    // Delete existing assignments
    await supabase
        .from('user_branches')
        .delete()
        .eq('user_id', userId);

    // Insert new assignments
    if (branchCodes.length > 0) {
        const entries = branchCodes.map(code => ({
            user_id: userId,
            branch_code: code,
        }));

        const { error } = await supabase
            .from('user_branches')
            .insert(entries);

        if (error) throw error;
    }
}

// Get users assigned to a branch
export async function getBranchUsers(branchCode: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('user_branches')
        .select('user_id')
        .eq('branch_code', branchCode);

    if (error) throw error;
    return data?.map(ub => ub.user_id) || [];
}
