import { supabase } from '@/lib/supabase';

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

// Get notifications for a user
export async function getNotifications(userId: string, limit = 20): Promise<Notification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// Get unread count
export async function getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) throw error;
    return count || 0;
}

// Mark notification as read
export async function markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) throw error;
}

// Mark all as read
export async function markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) throw error;
}

// Create notification (for internal use)
export async function createNotification(data: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
}): Promise<Notification> {
    const { data: notification, error } = await supabase
        .from('notifications')
        .insert(data)
        .select()
        .single();

    if (error) throw error;
    return notification;
}

// Send notification to users with specific role
export async function notifyRole(
    roleCode: string,
    type: string,
    title: string,
    message: string,
    link?: string
): Promise<void> {
    // Get users with this role
    const { data: role } = await supabase
        .from('roles')
        .select('id')
        .eq('code', roleCode)
        .single();

    if (!role) return;

    const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('role_id', role.id)
        .eq('is_active', true);

    if (!users || users.length === 0) return;

    // Create notifications for all users
    const notifications = users.map((u) => ({
        user_id: u.id,
        type,
        title,
        message,
        link,
        is_read: false,
    }));

    await supabase.from('notifications').insert(notifications);
}
