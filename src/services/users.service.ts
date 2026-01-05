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
    password?: string;
}): Promise<UserWithRole & { defaultPassword?: string }> {
    // Generate default password if not provided
    const defaultPassword = user.password || `Sentra@${user.nip}`;

    // Note: Creating Supabase Auth user from client-side requires either:
    // 1. Using signUp (but this will auto-login the new user)
    // 2. Using Supabase Edge Function with service_role key
    // 3. Manual user registration flow
    // For now, we just create the database user and admin needs to tell user to use the default password

    const { data, error } = await supabase
        .from('users')
        .insert({
            nip: user.nip,
            full_name: user.full_name,
            email: user.email,
            role_id: user.role_id,
            is_active: user.is_active ?? true,
        })
        .select(`
      *,
      role:roles(*)
    `)
        .single();

    if (error) throw error;

    return { ...data, defaultPassword };
}

// Create auth user (should be called from server-side or edge function ideally)
export async function createAuthUser(email: string, password: string, userId: string): Promise<void> {
    // This creates a new Supabase Auth user
    // Note: This will NOT work properly from client-side as it logs in the new user
    // For production, use Supabase Edge Function with service_role key
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                user_id: userId,
            },
        },
    });

    if (authError) throw authError;

    // Update user with auth_user_id
    if (authData.user) {
        await supabase
            .from('users')
            .update({ auth_user_id: authData.user.id })
            .eq('email', email);
    }
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

// Reset user password to default (Sentra@{NIP})
export async function resetUserPassword(userId: string, nip: string): Promise<{ success: boolean; newPassword: string }> {
    const defaultPassword = `Sentra@${nip}`;

    const { data, error } = await supabase.rpc('admin_set_password', {
        p_user_id: userId,
        p_new_password: defaultPassword,
    });

    if (error) throw new Error('Gagal reset password: ' + error.message);

    return {
        success: data as boolean,
        newPassword: defaultPassword,
    };
}
