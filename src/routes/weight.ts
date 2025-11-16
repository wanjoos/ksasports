import { Hono } from 'hono';
import { generateId } from '../utils/crypto';
import { authMiddleware } from '../utils/middleware';
import type { Bindings, WeightLog } from '../types';

const weight = new Hono<{ Bindings: Bindings }>();

// Get weight logs
weight.get('/', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const from = c.req.query('from');
    const to = c.req.query('to');
    
    let query = 'SELECT * FROM weight_logs WHERE user_id = ?';
    const params: any[] = [userId];
    
    if (from) {
      query += ' AND DATE(logged_at) >= ?';
      params.push(from);
    }
    
    if (to) {
      query += ' AND DATE(logged_at) <= ?';
      params.push(to);
    }
    
    query += ' ORDER BY logged_at DESC';
    
    const stmt = db.prepare(query);
    const weightLogs = await stmt.bind(...params).all();
    
    return c.json(weightLogs.results);
  } catch (error) {
    console.error('Get weight logs error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add weight log
weight.post('/', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const { weight_kg, logged_at } = await c.req.json();
    
    if (!weight_kg || !logged_at) {
      return c.json({ error: 'weight_kg and logged_at are required' }, 400);
    }
    
    const weightLogId = generateId();
    
    await db.prepare(
      'INSERT INTO weight_logs (id, user_id, weight_kg, logged_at) VALUES (?, ?, ?, ?)'
    ).bind(weightLogId, userId, weight_kg, logged_at).run();
    
    const weightLog = await db.prepare(
      'SELECT * FROM weight_logs WHERE id = ?'
    ).bind(weightLogId).first<WeightLog>();
    
    return c.json(weightLog, 201);
  } catch (error) {
    console.error('Add weight log error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update weight log
weight.put('/:id', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const weightLogId = c.req.param('id');
    const { weight_kg, logged_at } = await c.req.json();
    
    // Check ownership
    const existingLog = await db.prepare(
      'SELECT * FROM weight_logs WHERE id = ? AND user_id = ?'
    ).bind(weightLogId, userId).first();
    
    if (!existingLog) {
      return c.json({ error: 'Weight log not found' }, 404);
    }
    
    await db.prepare(
      'UPDATE weight_logs SET weight_kg = ?, logged_at = ? WHERE id = ?'
    ).bind(weight_kg, logged_at, weightLogId).run();
    
    const updatedLog = await db.prepare(
      'SELECT * FROM weight_logs WHERE id = ?'
    ).bind(weightLogId).first<WeightLog>();
    
    return c.json(updatedLog);
  } catch (error) {
    console.error('Update weight log error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete weight log
weight.delete('/:id', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const weightLogId = c.req.param('id');
    
    // Check ownership
    const existingLog = await db.prepare(
      'SELECT * FROM weight_logs WHERE id = ? AND user_id = ?'
    ).bind(weightLogId, userId).first();
    
    if (!existingLog) {
      return c.json({ error: 'Weight log not found' }, 404);
    }
    
    await db.prepare(
      'DELETE FROM weight_logs WHERE id = ?'
    ).bind(weightLogId).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete weight log error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default weight;
