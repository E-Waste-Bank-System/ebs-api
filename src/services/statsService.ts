import supabase from '../utils/supabase';
import { Database } from '../types/supabase';
import config from '../config/env';

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
  damageLevelDistribution: {
    damageLevel: number;
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
  try {
    // Initialize default values
    const stats: DashboardStats = {
      totalUsers: 0,
      totalEwaste: 0,
      monthlyStats: [],
      categoryDistribution: []
    };

    // 1. True total users from Supabase Auth Admin API
    try {
      stats.totalUsers = await getTrueTotalUsers();
    } catch (error) {
      console.error('Error getting total users:', error);
    }

    // 2. Total e-waste from objects table
    try {
      const { count: totalEwaste } = await supabase
        .from('objects')
        .select('*', { count: 'exact', head: true });
      stats.totalEwaste = totalEwaste || 0;
    } catch (error) {
      console.error('Error getting total e-waste:', error);
    }

    // 3. Monthly stats (last 4 months) from objects table
    try {
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

      stats.monthlyStats = Array.from(monthlyCounts.entries()).map(([month, count]) => ({ month, count }));
    } catch (error) {
      console.error('Error getting monthly stats:', error);
    }

    // 4. Category distribution from objects table
    try {
      const { data: categoryObjects } = await supabase
        .from('objects')
        .select('category');

      const categoryDistribution = new Map<string, number>();
      categoryObjects?.forEach(obj => {
        const category = obj.category || 'unknown';
        categoryDistribution.set(category, (categoryDistribution.get(category) || 0) + 1);
      });

      stats.categoryDistribution = Array.from(categoryDistribution.entries()).map(([category, count]) => ({ category, count }));
    } catch (error) {
      console.error('Error getting category distribution:', error);
    }

    return stats;
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    // Return default stats on error
    return {
      totalUsers: 0,
      totalEwaste: 0,
      monthlyStats: [],
      categoryDistribution: []
    };
  }
}

export async function getEwasteStats(): Promise<EwasteStats> {
  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('objects')
      .select('*', { count: 'exact' });

    if (countError) throw countError;

    // Get high risk count (risk_lvl >= 4)
    const { count: highRiskCount, error: highRiskError } = await supabase
      .from('objects')
      .select('*', { count: 'exact' })
      .gte('risk_lvl', 4);

    if (highRiskError) throw highRiskError;

    // Get category distribution
    const { data: categoryData, error: categoryError } = await supabase
      .from('objects')
      .select('category');

    if (categoryError) throw categoryError;

    const categoryDistribution = categoryData.reduce((acc: { category: string; count: number }[], curr) => {
      const existing = acc.find(item => item.category === curr.category);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ category: curr.category, count: 1 });
      }
      return acc;
    }, []);

    // Get risk level distribution
    const { data: riskData, error: riskError } = await supabase
      .from('objects')
      .select('risk_lvl');

    if (riskError) throw riskError;

    const riskLevelDistribution = riskData.reduce((acc: { riskLevel: number; count: number }[], curr) => {
      if (curr.risk_lvl !== null) {
        const existing = acc.find(item => item.riskLevel === curr.risk_lvl);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ riskLevel: curr.risk_lvl, count: 1 });
        }
      }
      return acc;
    }, []);

    // Get damage level distribution
    const { data: damageData, error: damageError } = await supabase
      .from('objects')
      .select('damage_level');

    if (damageError) throw damageError;

    const damageLevelDistribution = damageData.reduce((acc: { damageLevel: number; count: number }[], curr) => {
      if (curr.damage_level !== null) {
        const existing = acc.find(item => item.damageLevel === curr.damage_level);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ damageLevel: curr.damage_level, count: 1 });
        }
      }
      return acc;
    }, []);

    return {
      totalCount: totalCount || 0,
      highRiskCount: highRiskCount || 0,
      categoryDistribution,
      riskLevelDistribution,
      damageLevelDistribution
    };
  } catch (error) {
    console.error('Error getting e-waste stats:', error);
    throw error;
  }
} 