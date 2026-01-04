import { supabase } from '@/lib/supabase';

export interface Branch {
    id: number;
    code: string;
    name: string;
    address?: string;
    city?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Get all branches
export async function getBranches(): Promise<Branch[]> {
    const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('code', { ascending: true });

    if (error) throw error;
    return data || [];
}

// Get active branches
export async function getActiveBranches(): Promise<Branch[]> {
    const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
}

// Get branch by ID
export async function getBranch(id: number): Promise<Branch | null> {
    const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

// Create branch
export async function createBranch(branch: Omit<Branch, 'id' | 'created_at' | 'updated_at'>): Promise<Branch> {
    const { data, error } = await supabase
        .from('branches')
        .insert(branch)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Update branch
export async function updateBranch(id: number, branch: Partial<Branch>): Promise<Branch> {
    const { data, error } = await supabase
        .from('branches')
        .update({ ...branch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Delete branch
export async function deleteBranch(id: number): Promise<void> {
    const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
