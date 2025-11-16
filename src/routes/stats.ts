import { Hono } from 'hono';
import { authMiddleware } from '../utils/middleware';
import type { Bindings, WorkoutStats, Highlights, WorkoutType } from '../types';

const stats = new Hono<{ Bindings: Bindings }>();

// Get workout statistics
stats.get('/', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const range = c.req.query('range') || 'weekly'; // weekly or monthly
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    if (range === 'weekly') {
      startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000); // 4 weeks
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Get total stats
    const totalStats = await db.prepare(
      `SELECT 
        COUNT(*) as workout_count,
        COALESCE(SUM(distance_km), 0) as total_distance_km,
        COALESCE(SUM(duration_min), 0) as total_duration_min
       FROM workouts
       WHERE user_id = ? AND DATE(started_at) >= ?`
    ).bind(userId, startDateStr).first<{
      workout_count: number;
      total_distance_km: number;
      total_duration_min: number;
    }>();
    
    // Get stats by date
    const byDate = await db.prepare(
      `SELECT 
        DATE(started_at) as date,
        COALESCE(SUM(distance_km), 0) as distance_km,
        SUM(duration_min) as duration_min
       FROM workouts
       WHERE user_id = ? AND DATE(started_at) >= ?
       GROUP BY DATE(started_at)
       ORDER BY date ASC`
    ).bind(userId, startDateStr).all();
    
    // Get stats by workout type
    const byType = await db.prepare(
      `SELECT 
        workout_type,
        COALESCE(SUM(distance_km), 0) as distance_km,
        SUM(duration_min) as duration_min,
        COUNT(*) as count
       FROM workouts
       WHERE user_id = ? AND DATE(started_at) >= ?
       GROUP BY workout_type`
    ).bind(userId, startDateStr).all();
    
    const response: WorkoutStats = {
      range: range as 'weekly' | 'monthly',
      total_distance_km: totalStats?.total_distance_km || 0,
      total_duration_min: totalStats?.total_duration_min || 0,
      workout_count: totalStats?.workout_count || 0,
      by_date: byDate.results.map((row: any) => ({
        date: row.date,
        distance_km: row.distance_km || 0,
        duration_min: row.duration_min || 0
      })),
      by_type: byType.results.map((row: any) => ({
        workout_type: row.workout_type as WorkoutType,
        distance_km: row.distance_km || 0,
        duration_min: row.duration_min || 0,
        count: row.count || 0
      }))
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get highlights (best records)
stats.get('/highlights', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    
    // Longest distance
    const longestDistance = await db.prepare(
      `SELECT COALESCE(MAX(distance_km), 0) as longest_distance_km
       FROM workouts
       WHERE user_id = ?`
    ).bind(userId).first<{ longest_distance_km: number }>();
    
    // Longest duration
    const longestDuration = await db.prepare(
      `SELECT COALESCE(MAX(duration_min), 0) as longest_duration_min
       FROM workouts
       WHERE user_id = ?`
    ).bind(userId).first<{ longest_duration_min: number }>();
    
    // Calculate streak (consecutive days with workouts)
    const allWorkouts = await db.prepare(
      `SELECT DISTINCT DATE(started_at) as date
       FROM workouts
       WHERE user_id = ?
       ORDER BY date DESC`
    ).bind(userId).all();
    
    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < allWorkouts.results.length; i++) {
      const workoutDate = new Date(allWorkouts.results[i].date);
      workoutDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - workoutDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff === streakDays) {
        streakDays++;
      } else {
        break;
      }
    }
    
    const highlights: Highlights = {
      longest_distance_km: longestDistance?.longest_distance_km || 0,
      longest_duration_min: longestDuration?.longest_duration_min || 0,
      streak_days: streakDays
    };
    
    return c.json(highlights);
  } catch (error) {
    console.error('Get highlights error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default stats;
