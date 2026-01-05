import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface LoginCredentials {
    nip: string;
    password: string;
}

interface LoginResult {
    user: User;
    needsPasswordChange: boolean;
}

// Login with NIP/password using custom auth
export async function loginWithNip({ nip, password }: LoginCredentials): Promise<LoginResult> {
    // Call the database function to verify credentials
    const { data, error } = await supabase.rpc('login_user', {
        p_nip: nip,
        p_password: password,
    });

    if (error) throw new Error('Gagal melakukan autentikasi');

    if (!data || data.length === 0) {
        throw new Error('NIP atau password salah');
    }

    const userData = data[0];

    if (!userData.is_active) {
        throw new Error('Akun tidak aktif. Hubungi administrator.');
    }

    // Map to User type
    const user: User = {
        id: userData.user_id,
        nip: userData.nip,
        fullName: userData.full_name,
        email: userData.email,
        roleId: userData.role_id,
        role: {
            id: userData.role_id,
            code: userData.role_code as 'ADMIN' | 'MAKER' | 'APPROVER',
            name: userData.role_name,
        },
        isActive: userData.is_active,
        createdAt: '',
        updatedAt: '',
    };

    return {
        user,
        needsPasswordChange: userData.password_needs_change,
    };
}

// Legacy login with email/password (kept for backward compatibility)
export async function login({ email, password }: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

// Logout - for custom auth, just clear local state
export async function logout() {
    // If using Supabase Auth, sign out
    try {
        await supabase.auth.signOut();
    } catch {
        // Ignore errors if not using Supabase Auth
    }
}

// Get user profile with role
export async function getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select(`
      *,
      role:roles(*)
    `)
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return {
        id: data.id,
        nip: data.nip,
        fullName: data.full_name,
        email: data.email,
        roleId: data.role_id,
        role: data.role,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    } as User;
}

// Listen to auth state changes (for Supabase Auth)
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
}

// Get current session (for Supabase Auth)
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
}

// Change password for current user using custom auth
export async function changePassword(userId: string, newPassword: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('change_user_password', {
        p_user_id: userId,
        p_new_password: newPassword,
    });

    if (error) throw new Error('Gagal mengubah password: ' + error.message);
    return data as boolean;
}

// Admin: Set password for a user
export async function adminSetPassword(userId: string, newPassword: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_set_password', {
        p_user_id: userId,
        p_new_password: newPassword,
    });

    if (error) throw new Error('Gagal mengatur password: ' + error.message);
    return data as boolean;
}
