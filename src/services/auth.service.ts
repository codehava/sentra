import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface LoginCredentials {
    email: string;
    password: string;
}

interface SignUpData extends LoginCredentials {
    fullName: string;
    nip: string;
}

// Login with email/password
export async function login({ email, password }: LoginCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

// Logout
export async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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

    return data as User;
}

// Listen to auth state changes
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
}

// Get current session
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
}

// Change password for current user
export async function changePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) throw error;
    return data;
}

// Reset password (send email)
export async function resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return data;
}
