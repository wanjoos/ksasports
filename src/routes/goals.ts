import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import type { Bindings } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

// Middleware to verify JWT
app.use('/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const token = authHeader.substring(7);
    const payload = await verify(token, 'your-secret-key');
    c.set('userId', payload.userId as string);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Get current goals
app.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;

    // Get current weekly and monthly goals
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const goals = await DB.prepare(`
      SELECT * FROM goals
      WHERE user_id = ? AND start_date <= ? AND end_date >= ?
      ORDER BY goal_type, target_type
    `).bind(userId, today, today).all();

    return c.json(goals.results || []);
  } catch (error) {
    console.error('Failed to get goals:', error);
    return c.json({ error: 'Failed to get goals' }, 500);
  }
});

// Set or update goal
app.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const { goal_type, target_type, target_value } = await c.req.json();

    // Validate input
    if (!['WEEKLY', 'MONTHLY'].includes(goal_type)) {
      return c.json({ error: 'Invalid goal_type' }, 400);
    }
    if (!['COUNT', 'DISTANCE', 'DURATION'].includes(target_type)) {
      return c.json({ error: 'Invalid target_type' }, 400);
    }
    if (typeof target_value !== 'number' || target_value <= 0) {
      return c.json({ error: 'Invalid target_value' }, 400);
    }

    // Calculate start and end dates
    const now = new Date();
    let start_date: string;
    let end_date: string;

    if (goal_type === 'WEEKLY') {
      // Start from Monday of current week
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Adjust when day is Sunday
      const monday = new Date(now);
      monday.setDate(now.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      start_date = monday.toISOString().split('T')[0];
      end_date = sunday.toISOString().split('T')[0];
    } else {
      // Monthly: first day to last day of current month
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      start_date = firstDay.toISOString().split('T')[0];
      end_date = lastDay.toISOString().split('T')[0];
    }

    const goalId = crypto.randomUUID();

    // Insert or replace goal
    await DB.prepare(`
      INSERT INTO goals (id, user_id, goal_type, target_type, target_value, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, goal_type, target_type, start_date)
      DO UPDATE SET target_value = ?, updated_at = CURRENT_TIMESTAMP
    `).bind(
      goalId,
      userId,
      goal_type,
      target_type,
      target_value,
      start_date,
      end_date,
      target_value
    ).run();

    return c.json({
      id: goalId,
      user_id: userId,
      goal_type,
      target_type,
      target_value,
      start_date,
      end_date
    });
  } catch (error) {
    console.error('Failed to set goal:', error);
    return c.json({ error: 'Failed to set goal' }, 500);
  }
});

// Get goal progress
app.get('/progress', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get current goals
    const goals = await DB.prepare(`
      SELECT * FROM goals
      WHERE user_id = ? AND start_date <= ? AND end_date >= ?
    `).bind(userId, today, today).all();

    if (!goals.results || goals.results.length === 0) {
      return c.json([]);
    }

    // Calculate progress for each goal
    const progressData = await Promise.all(
      goals.results.map(async (goal: any) => {
        let currentValue = 0;

        if (goal.target_type === 'COUNT') {
          // Count workouts in date range
          const result = await DB.prepare(`
            SELECT COUNT(*) as count FROM workouts
            WHERE user_id = ? AND DATE(started_at) >= ? AND DATE(started_at) <= ?
          `).bind(userId, goal.start_date, goal.end_date).first();
          currentValue = result?.count || 0;
        } else if (goal.target_type === 'DISTANCE') {
          // Sum distance in date range
          const result = await DB.prepare(`
            SELECT COALESCE(SUM(distance_km), 0) as total FROM workouts
            WHERE user_id = ? AND DATE(started_at) >= ? AND DATE(started_at) <= ?
          `).bind(userId, goal.start_date, goal.end_date).first();
          currentValue = result?.total || 0;
        } else if (goal.target_type === 'DURATION') {
          // Sum duration in date range
          const result = await DB.prepare(`
            SELECT COALESCE(SUM(duration_min), 0) as total FROM workouts
            WHERE user_id = ? AND DATE(started_at) >= ? AND DATE(started_at) <= ?
          `).bind(userId, goal.start_date, goal.end_date).first();
          currentValue = result?.total || 0;
        }

        const percentage = Math.min(100, Math.round((currentValue / goal.target_value) * 100));

        return {
          ...goal,
          current_value: currentValue,
          percentage,
          is_achieved: currentValue >= goal.target_value
        };
      })
    );

    return c.json(progressData);
  } catch (error) {
    console.error('Failed to get goal progress:', error);
    return c.json({ error: 'Failed to get goal progress' }, 500);
  }
});

// Delete goal
app.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const goalId = c.req.param('id');

    await DB.prepare(`
      DELETE FROM goals WHERE id = ? AND user_id = ?
    `).bind(goalId, userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to delete goal:', error);
    return c.json({ error: 'Failed to delete goal' }, 500);
  }
});

export default app;
