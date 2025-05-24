import supabase from '../utils/supabase';
import { Detection } from '../models/detectionModel';
import { v4 as uuidv4 } from 'uuid';

// Utility function to properly parse suggestion fragments into complete sentences
function parseSuggestionFragments(suggestionString: string): string[] {
  if (!suggestionString) return [];
  
  // Split by pipe separator
  const fragments = suggestionString.split('|').map(s => s.trim()).filter(s => s);
  
  if (fragments.length === 0) return [];
  
  const suggestions: string[] = [];
  let currentSuggestion = '';
  
  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i];
    
    // If current suggestion is empty, start a new one
    if (!currentSuggestion) {
      currentSuggestion = fragment;
    } else {
      // Check if this fragment should be combined with the previous one
      const shouldCombine = (
        // Previous fragment doesn't end with sentence-ending punctuation
        !/[.!?]$/.test(currentSuggestion.trim()) ||
        // Current fragment doesn't start with capital letter (likely a continuation)
        !/^[A-Z]/.test(fragment.trim()) ||
        // Previous fragment ends with comma, suggesting continuation
        /,$/.test(currentSuggestion.trim()) ||
        // Previous fragment is very short (likely incomplete)
        currentSuggestion.trim().length < 10
      );
      
      if (shouldCombine) {
        // Combine with previous fragment
        const needsSpace = !currentSuggestion.endsWith(' ') && !fragment.startsWith(' ');
        const needsComma = /^[a-z]/.test(fragment.trim()) && !/[.!?,:;]$/.test(currentSuggestion.trim());
        
        if (needsComma && needsSpace) {
          currentSuggestion += ', ' + fragment;
        } else if (needsSpace) {
          currentSuggestion += ' ' + fragment;
        } else {
          currentSuggestion += fragment;
        }
      } else {
        // Finish current suggestion and start a new one
        suggestions.push(currentSuggestion.trim());
        currentSuggestion = fragment;
      }
    }
  }
  
  // Don't forget to add the last suggestion
  if (currentSuggestion.trim()) {
    suggestions.push(currentSuggestion.trim());
  }
  
  return suggestions;
}

export interface DetectionWithPredictions {
  id: string;
  user_id: string | null;
  scan_id: string | null;
  prediction: Array<{
    image_url: string;
    category: string;
    confidence: number;
    regression_result: number | null;
    description: string | null;
    suggestion: string[];
    risk_lvl: number | null;
    detection_source: string | null;
  }>;
  created_at: string;
}

export async function createScan(userId: string) {
  try {
    const scanId = uuidv4();
    console.log('Attempting to create scan with ID:', scanId, 'for user:', userId);
    
    // First verify the user exists in auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('Error verifying user:', {
        error: userError,
        message: userError.message,
        code: userError.code,
        userId
      });
      throw new Error(`User verification failed: ${userError.message}`);
    }
    
    if (!userData) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Then create the scan
    const { data, error } = await supabase
      .from('scans')
      .insert({
        id: scanId,
        user_id: userId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error during scan creation:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        scanId,
        userId
      });
      throw error;
    }
    
    console.log('Scan created successfully:', data);
    return data;
  } catch (err) {
    console.error('Unexpected error during scan creation:', {
      error: err,
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      userId
    });
    throw err;
  }
}

export async function createDetection(detection: Omit<Detection, 'created_at'>) {
  try {
    const { data, error } = await supabase
      .from('objects')
      .insert(detection)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error during detection creation:', {
        error,
        detection: { ...detection, image_url: '[REDACTED]' }
      });
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Unexpected error during detection creation:', {
      error: err,
      detection: { ...detection, image_url: '[REDACTED]' }
    });
    throw err;
  }
}

export async function getAllDetections() {
  const { data, error } = await supabase
    .from('objects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllDetectionsWithFilters(
  limit: number,
  offset: number,
  search?: string,
  category?: string,
  detection_source?: string
) {
  let query = supabase
    .from('objects')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Apply filters if provided
  if (search) {
    query = query.or(`category.ilike.%${search}%,description.ilike.%${search}%`);
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  if (detection_source) {
    query = query.eq('detection_source', detection_source);
  }
  
  // Apply pagination
  query = query.range(offset, offset + limit - 1);
  
  const { data, count, error } = await query;
  
  if (error) throw error;
  
  const total = count || 0;
  const last_page = Math.ceil(total / limit);
  
  return {
    data: data || [],
    total,
    last_page
  };
}

export async function getDetectionsByUser(userId: string) {
  // First get all scans for the user
  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (scansError) throw scansError;
  
  // If no scans found, return empty array
  if (!scans || scans.length === 0) {
    return [];
  }

  // Get all objects (detections) for these scans
  const { data: objects, error: objectsError } = await supabase
    .from('objects')
    .select('*')
    .in('scan_id', scans.map(scan => scan.id))
    .order('created_at', { ascending: false });
  
  if (objectsError) throw objectsError;

  // Group objects by scan_id
  const groupedDetections = scans.map(scan => {
    const scanObjects = objects?.filter(obj => obj.scan_id === scan.id) || [];
    
    return {
      id: scan.id, // This is the scan_id
      user_id: scan.user_id,
      scan_id: scan.id,
      status: scan.status,
      prediction: scanObjects.map(obj => ({
        id: obj.id, // This is the object_id
        image_url: obj.image_url || '',
        category: obj.category || '',
        confidence: obj.confidence || 0,
        regression_result: obj.regression_result ?? null,
        description: obj.description ?? null,
        suggestion: obj.suggestion ? parseSuggestionFragments(obj.suggestion) : [],
        risk_lvl: obj.risk_lvl ?? null,
        detection_source: obj.detection_source ?? null
      })),
      created_at: scan.created_at
    };
  });

  return groupedDetections;
}

export async function getDetectionById(id: string) {
  const { data, error } = await supabase
    .from('objects')
    .select(`
      *,
      scans(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  
  // Transform suggestion from pipe-separated string to array
  if (data) {
    return {
      ...data,
      suggestion: data.suggestion ? parseSuggestionFragments(data.suggestion) : []
    };
  }
  
  return data;
}

export async function deleteDetection(id: string) {
  const { error } = await supabase
    .from('objects')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function updateDetection(id: string, fields: Partial<Detection>) {
  // First get the detection to verify user_id
  const { data: detection, error: getError } = await supabase
    .from('objects')
    .select('*')
    .eq('id', id)
    .single();
  
  if (getError) throw getError;
  
  // Verify if the user_id in the request matches the detection's user_id
  if (fields.user_id && fields.user_id !== detection.user_id) {
    throw new Error('Unauthorized: User ID does not match detection owner');
  }
  
  // Update object fields
  const { data, error } = await supabase
    .from('objects')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  
  // Transform suggestion from pipe-separated string to array
  if (data) {
    return {
      ...data,
      suggestion: data.suggestion ? parseSuggestionFragments(data.suggestion) : []
    };
  }
  
  return data;
}