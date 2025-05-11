import supabase from '../utils/supabase';
import { Validation } from '../models/validationModel';

export async function createValidation(validation: Omit<Validation, 'created_at'>) {
  const { data, error } = await supabase
    .from('validations')
    .insert(validation)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllValidations() {
  const { data, error } = await supabase
    .from('validations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
} 