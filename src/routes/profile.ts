import { Hono } from 'hono';
import { hashPassword } from '../utils/crypto';
import { authMiddleware } from '../utils/middleware';
import type { Bindings, User } from '../types';

const profile = new Hono<{ Bindings: Bindings }>();

// Update profile
profile.put('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const { name, height_cm, profile_image_url } = await c.req.json();
    
    await db.prepare(
      `UPDATE users 
       SET name = ?, height_cm = ?, profile_image_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(name, height_cm || null, profile_image_url || null, userId).run();
    
    const updatedUser = await db.prepare(
      'SELECT id, email, name, profile_image_url, height_cm, created_at, updated_at FROM users WHERE id = ?'
    ).bind(userId).first<User>();
    
    return c.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Change password
profile.put('/password', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const { old_password, new_password } = await c.req.json();
    
    if (!old_password || !new_password) {
      return c.json({ error: 'Old password and new password are required' }, 400);
    }
    
    // Verify old password
    const user = await db.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(userId).first<{ password_hash: string }>();
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const oldPasswordHash = await hashPassword(old_password);
    if (oldPasswordHash !== user.password_hash) {
      return c.json({ error: 'Invalid old password' }, 401);
    }
    
    // Update password
    const newPasswordHash = await hashPassword(new_password);
    await db.prepare(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newPasswordHash, userId).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default profile;
