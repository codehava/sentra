import { supabase } from '@/lib/supabase';

/**
 * Check if a field value is unique across transactions
 * Used for fields marked as is_unique=true (e.g., Nomor CL to prevent double payment)
 */
export async function checkUniqueFieldValue(
    fieldCode: string,
    fieldValue: string,
    transactionTypeId: number,
    excludeTransactionId?: string
): Promise<{ isUnique: boolean; existingTicketNumber?: string }> {
    // First check if field is marked as unique
    const { data: field } = await supabase
        .from('field_master')
        .select('is_unique')
        .eq('code', fieldCode)
        .single();

    if (!field?.is_unique) {
        // Field is not unique, allow any value
        return { isUnique: true };
    }

    // Check for existing value in unique_field_values table
    let query = supabase
        .from('unique_field_values')
        .select(`
            transaction_id,
            transaction:transactions(ticket_number)
        `)
        .eq('field_code', fieldCode)
        .eq('field_value', fieldValue)
        .eq('transaction_type_id', transactionTypeId);

    if (excludeTransactionId) {
        query = query.neq('transaction_id', excludeTransactionId);
    }

    const { data: existing, error } = await query;

    if (error) {
        console.error('Error checking unique field:', error);
        return { isUnique: true }; // Allow on error to not block user
    }

    if (existing && existing.length > 0) {
        const ticketNumber = (existing[0] as any)?.transaction?.ticket_number;
        return {
            isUnique: false,
            existingTicketNumber: ticketNumber
        };
    }

    return { isUnique: true };
}

/**
 * Register a unique field value after transaction is created
 */
export async function registerUniqueFieldValue(
    transactionId: string,
    transactionTypeId: number,
    fieldCode: string,
    fieldValue: string
): Promise<boolean> {
    // First check if field is marked as unique
    const { data: field } = await supabase
        .from('field_master')
        .select('is_unique')
        .eq('code', fieldCode)
        .single();

    if (!field?.is_unique) {
        return true; // Not a unique field, no need to register
    }

    const { error } = await supabase
        .from('unique_field_values')
        .insert({
            transaction_id: transactionId,
            transaction_type_id: transactionTypeId,
            field_code: fieldCode,
            field_value: fieldValue,
        });

    if (error) {
        // Likely a duplicate value
        console.error('Error registering unique field value:', error);
        return false;
    }

    return true;
}

/**
 * Get all unique fields from field_master
 */
export async function getUniqueFields(): Promise<string[]> {
    const { data, error } = await supabase
        .from('field_master')
        .select('code')
        .eq('is_unique', true);

    if (error) {
        console.error('Error fetching unique fields:', error);
        return [];
    }

    return data?.map(f => f.code) || [];
}

/**
 * Update field's is_unique setting
 */
export async function updateFieldUniqueSetting(
    fieldId: number,
    isUnique: boolean
): Promise<boolean> {
    const { error } = await supabase
        .from('field_master')
        .update({ is_unique: isUnique })
        .eq('id', fieldId);

    if (error) {
        console.error('Error updating field unique setting:', error);
        return false;
    }

    return true;
}
