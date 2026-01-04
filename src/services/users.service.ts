import { supabase } from '@/lib/supabase';
import type { Role } from '@/types';

export interface UserWithRole {
    id: string;
    nip: string;
    full_name: string;
    email: string;
    role_id: number;
    is_active: boolean;
    auth_user_id: string | null;
    created_at: string;
    updated_at: string;
    role?: Role;
}

export async function getUsers(): Promise<UserWithRole[]> {
    const { data, error } = await supabase
        .from('users')
        .select(`
      *,
      role:roles(*)
    `)
        .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function getUser(id: string): Promise<UserWithRole | null> {
    const { data, error } = await supabase
        .from('users')
        .select(`
      *,
      role:roles(*)
    `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createUser(user: {
    nip: string;
    full_name: string;
    email: string;
    role_id: number;
    is_active?: boolean;
}): Promise<UserWithRole> {
    const { data, error } = await supabase
        .from('users')
        .insert(user)
        .select(`
      *,
      role:roles(*)
    `)
        .single();

    if (error) throw error;
    return data;
}

export async function updateUser(
    id: string,
    user: Partial<{
        nip: string;
        full_name: string;
        email: string;
        role_id: number;
        is_active: boolean;
    }>
): Promise<UserWithRole> {
    const { data, error } = await supabase
        .from('users')
        .update(user)
        .eq('id', id)
        .select(`
      *,
      role:roles(*)
    `)
        .single();

    if (error) throw error;
    return data;
}

export async function deleteUser(id: string): Promise<void> {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function getRoles(): Promise<Role[]> {
    const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
}
