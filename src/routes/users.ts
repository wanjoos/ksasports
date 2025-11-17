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
    const JWT_SECRET = c.env.JWT_SECRET || 'workout-together-secret-key-change-in-production';
    const payload = await verify(token, JWT_SECRET);
    c.set('userId', payload.sub as string);
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});

// Get user profile by ID
app.get('/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const currentUserId = c.get('userId');
    const { DB } = c.env;

    // Get user profile
    const user = await DB.prepare(`
      SELECT 
        id, 
        email, 
        name, 
        height_cm, 
        profile_image_url, 
        created_at, 
        updated_at
      FROM users 
      WHERE id = ?
    `).bind(userId).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get user statistics
    const stats = await DB.prepare(`
      SELECT 
        COUNT(*) as workout_count,
        COALESCE(SUM(duration_min), 0) as total_duration,
        COALESCE(SUM(distance_km), 0) as total_distance
      FROM workouts 
      WHERE user_id = ?
    `).bind(userId).first();

    // Check if current user is following this user
    const followCheck = await DB.prepare(`
      SELECT 1 FROM user_follows 
      WHERE follower_id = ? AND following_id = ?
    `).bind(currentUserId, userId).first();

    // Get follower/following counts
    const followerCount = await DB.prepare(`
      SELECT COUNT(*) as count 
      FROM user_follows 
      WHERE following_id = ?
    `).bind(userId).first();

    const followingCount = await DB.prepare(`
      SELECT COUNT(*) as count 
      FROM user_follows 
      WHERE follower_id = ?
    `).bind(userId).first();

    return c.json({
      user,
      stats: stats || { workout_count: 0, total_duration: 0, total_distance: 0 },
      isFollowing: !!followCheck,
      followerCount: followerCount?.count || 0,
      followingCount: followingCount?.count || 0
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return c.json({ error: 'Failed to fetch user profile' }, 500);
  }
});

// Update user profile
app.put('/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const currentUserId = c.get('userId');
    const { DB } = c.env;

    // Check if user is updating their own profile
    if (userId !== currentUserId) {
      return c.json({ error: 'Unauthorized to update this profile' }, 403);
    }

    const { name, height_cm, profile_image_url, bio } = await c.req.json();

    // Update user profile
    await DB.prepare(`
      UPDATE users 
      SET 
        name = ?, 
        height_cm = ?, 
        profile_image_url = ?, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, height_cm || null, profile_image_url || null, userId).run();

    // Get updated user
    const updatedUser = await DB.prepare(`
      SELECT 
        id, 
        email, 
        name, 
        height_cm, 
        profile_image_url, 
        created_at, 
        updated_at
      FROM users 
      WHERE id = ?
    `).bind(userId).first();

    return c.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return c.json({ error: 'Failed to update user profile' }, 500);
  }
});

export default app;
