import supabase from '../utils/supabase';

export async function getStatistics() {
  // Total detections
  const { count: totalDetections } = await supabase.from('detections').select('*', { count: 'exact', head: true });
  // Total estimated value
  const { data: detections } = await supabase.from('detections').select('regression_result');
  const totalValue = (detections || []).reduce((sum: number, d: { regression_result?: number }) => sum + (d.regression_result || 0), 0);
  // Top 5 e-waste categories
  const { data: topCategories } = await supabase.rpc('get_top_ewaste_categories', { limit: 5 });
  return {
    totalDetections,
    totalValue,
    topCategories: topCategories || [],
  };
} 