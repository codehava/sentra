import { supabase } from '@/lib/supabase';

export interface StageDefinition {
    id: number;
    code: string;
    name: string;
    description?: string;
    sequence: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Get all stage definitions
export async function getStageDefinitions(): Promise<StageDefinition[]> {
    const { data, error } = await supabase
        .from('stage_definitions')
        .select('*')
        .order('sequence', { ascending: true });

    if (error) throw error;
    return data || [];
}

// Get active stages
export async function getActiveStages(): Promise<StageDefinition[]> {
    const { data, error } = await supabase
        .from('stage_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sequence', { ascending: true });

    if (error) throw error;
    return data || [];
}

// Create stage definition
export async function createStageDefinition(stage: Omit<StageDefinition, 'id' | 'created_at' | 'updated_at'>): Promise<StageDefinition> {
    const { data, error } = await supabase
        .from('stage_definitions')
        .insert(stage)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Update stage definition
export async function updateStageDefinition(id: number, stage: Partial<StageDefinition>): Promise<StageDefinition> {
    const { data, error } = await supabase
        .from('stage_definitions')
        .update({ ...stage, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Delete stage definition
export async function deleteStageDefinition(id: number): Promise<void> {
    const { error } = await supabase
        .from('stage_definitions')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
