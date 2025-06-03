import supabase from '../utils/supabase';
import { Database } from '../types/supabase';

export interface DashboardStats {
  totalUsers: number;
  totalEwaste: number;
  monthlyStats: {
    month: string;
    count: number;
  }[];
  categoryDistribution: {
    category: string;
    count: number;
  }[];
}

export interface EwasteStats {
  totalCount: number;
  highRiskCount: number;
  categoryDistribution: {
    category: string;
    count: number;
  }[];
  riskLevelDistribution: {
    riskLevel: number;
    count: number;
  }[];
}

async function getTrueTotalUsers(): Promise<number> {
  let total = 0;
  let page = 1;
  const perPage = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('Error fetching users from auth:', error);
      break;
    }
    total += data?.users?.length ?? 0;
    hasMore = (data?.users?.length ?? 0) === perPage;
    page++;
  }

  return total;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // 1. True total users from Supabase Auth Admin API
  const totalUsers = await getTrueTotalUsers();

  // 2. Total e-waste from objects table
  const { count: totalEwaste } = await supabase
    .from('objects')
    .select('*', { count: 'exact', head: true });

  // 3. Monthly stats (last 4 months) from objects table
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

  const { data: monthlyObjects } = await supabase
    .from('objects')
    .select('created_at')
    .gte('created_at', fourMonthsAgo.toISOString())
    .order('created_at', { ascending: true });

  // Group by month
  const monthlyCounts = new Map<string, number>();
  monthlyObjects?.forEach(obj => {
    const month = new Date(obj.created_at).toISOString().slice(0, 7);
    monthlyCounts.set(month, (monthlyCounts.get(month) || 0) + 1);
  });

  // 4. Category distribution from objects table
  const { data: categoryObjects } = await supabase
    .from('objects')
    .select('category');

  const categoryDistribution = new Map<string, number>();
  categoryObjects?.forEach(obj => {
    categoryDistribution.set(obj.category, (categoryDistribution.get(obj.category) || 0) + 1);
  });

  return {
    totalUsers: totalUsers || 0,
    totalEwaste: totalEwaste || 0,
    monthlyStats: Array.from(monthlyCounts.entries()).map(([month, count]) => ({ month, count })),
    categoryDistribution: Array.from(categoryDistribution.entries()).map(([category, count]) => ({ category, count }))
  };
}

export async function getEwasteStats(): Promise<EwasteStats> {
  // Get total count from objects table
  const { count: totalCount } = await supabase
    .from('objects')
    .select('*', { count: 'exact', head: true });

  // Get high risk count (risk_lvl > 7) from objects table
  const { count: highRiskCount } = await supabase
    .from('objects')
    .select('*', { count: 'exact', head: true })
    .gt('risk_lvl', 7);

  // Get category distribution from objects table
  const { data: categoryObjects } = await supabase
    .from('objects')
    .select('category');

  const categoryDistribution = new Map<string, number>();
  categoryObjects?.forEach(obj => {
    categoryDistribution.set(obj.category, (categoryDistribution.get(obj.category) || 0) + 1);
  });

  // Get risk level distribution from objects table
  const { data: riskStats } = await supabase
    .from('objects')
    .select('risk_lvl');

  const riskLevelDistribution = new Map<number, number>();
  riskStats?.forEach(obj => {
    if (obj.risk_lvl) {
      riskLevelDistribution.set(obj.risk_lvl, (riskLevelDistribution.get(obj.risk_lvl) || 0) + 1);
    }
  });

  return {
    totalCount: totalCount || 0,
    highRiskCount: highRiskCount || 0,
    categoryDistribution: Array.from(categoryDistribution.entries()).map(([category, count]) => ({ category, count })),
    riskLevelDistribution: Array.from(riskLevelDistribution.entries()).map(([riskLevel, count]) => ({ riskLevel, count }))
  };
} 