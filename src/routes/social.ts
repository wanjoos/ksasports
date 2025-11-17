import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { createNotification } from './notifications';
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
    console.error('JWT verification error:', error);
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Search users
app.get('/users/search', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const query = c.req.query('q') || '';

    if (query.length < 2) {
      return c.json([]);
    }

    const users = await DB.prepare(`
      SELECT id, name, email, profile_image_url, height_cm
      FROM users
      WHERE id != ? AND (name LIKE ? OR email LIKE ?)
      LIMIT 20
    `).bind(userId, `%${query}%`, `%${query}%`).all();

    // Get follow status for each user
    const usersWithStatus = await Promise.all(
      (users.results || []).map(async (user: any) => {
        const following = await DB.prepare(
          'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?'
        ).bind(userId, user.id).first();

        const followsYou = await DB.prepare(
          'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?'
        ).bind(user.id, userId).first();

        return {
          ...user,
          is_following: !!following,
          follows_you: !!followsYou
        };
      })
    );

    return c.json(usersWithStatus);
  } catch (error) {
    console.error('Search users error:', error);
    return c.json({ error: 'Failed to search users' }, 500);
  }
});

// Get user profile
app.get('/users/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const targetUserId = c.req.param('id');

    const user = await DB.prepare(`
      SELECT id, name, email, profile_image_url, height_cm, created_at
      FROM users
      WHERE id = ?
    `).bind(targetUserId).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get follow status
    const following = await DB.prepare(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(userId, targetUserId).first();

    const followsYou = await DB.prepare(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(targetUserId, userId).first();

    // Get followers count
    const followersCount = await DB.prepare(
      'SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?'
    ).bind(targetUserId).first<{ count: number }>();

    // Get following count
    const followingCount = await DB.prepare(
      'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?'
    ).bind(targetUserId).first<{ count: number }>();

    // Get workout stats
    const workoutCount = await DB.prepare(
      'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?'
    ).bind(targetUserId).first<{ count: number }>();

    const totalDistance = await DB.prepare(
      'SELECT COALESCE(SUM(distance_km), 0) as total FROM workouts WHERE user_id = ?'
    ).bind(targetUserId).first<{ total: number }>();

    const totalDuration = await DB.prepare(
      'SELECT COALESCE(SUM(duration_min), 0) as total FROM workouts WHERE user_id = ?'
    ).bind(targetUserId).first<{ total: number }>();

    return c.json({
      ...user,
      is_following: !!following,
      follows_you: !!followsYou,
      followers_count: followersCount?.count || 0,
      following_count: followingCount?.count || 0,
      workout_count: workoutCount?.count || 0,
      total_distance_km: totalDistance?.total || 0,
      total_duration_min: totalDuration?.total || 0
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return c.json({ error: 'Failed to get user profile' }, 500);
  }
});

// Follow user
app.post('/users/:id/follow', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const targetUserId = c.req.param('id');

    if (userId === targetUserId) {
      return c.json({ error: 'Cannot follow yourself' }, 400);
    }

    // Check if target user exists
    const targetUser = await DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(targetUserId).first();

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if already following
    const existing = await DB.prepare(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(userId, targetUserId).first();

    if (existing) {
      return c.json({ error: 'Already following' }, 400);
    }

    const followId = crypto.randomUUID();

    await DB.prepare(`
      INSERT INTO user_follows (id, follower_id, following_id)
      VALUES (?, ?, ?)
    `).bind(followId, userId, targetUserId).run();

    // Create follow notification
    await createNotification(DB, {
      user_id: targetUserId,
      type: 'FOLLOW',
      actor_id: userId
    });

    return c.json({ success: true, following: true });
  } catch (error) {
    console.error('Follow user error:', error);
    return c.json({ error: 'Failed to follow user' }, 500);
  }
});

// Unfollow user
app.delete('/users/:id/follow', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const targetUserId = c.req.param('id');

    await DB.prepare(
      'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(userId, targetUserId).run();

    return c.json({ success: true, following: false });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return c.json({ error: 'Failed to unfollow user' }, 500);
  }
});

// Get followers list
app.get('/users/:id/followers', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const targetUserId = c.req.param('id');

    const followers = await DB.prepare(`
      SELECT u.id, u.name, u.email, u.profile_image_url
      FROM user_follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `).bind(targetUserId).all();

    // Add follow status
    const followersWithStatus = await Promise.all(
      (followers.results || []).map(async (follower: any) => {
        const following = await DB.prepare(
          'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?'
        ).bind(userId, follower.id).first();

        return {
          ...follower,
          is_following: !!following
        };
      })
    );

    return c.json(followersWithStatus);
  } catch (error) {
    console.error('Get followers error:', error);
    return c.json({ error: 'Failed to get followers' }, 500);
  }
});

// Get following list
app.get('/users/:id/following', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const targetUserId = c.req.param('id');

    const following = await DB.prepare(`
      SELECT u.id, u.name, u.email, u.profile_image_url
      FROM user_follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `).bind(targetUserId).all();

    // Add follow status
    const followingWithStatus = await Promise.all(
      (following.results || []).map(async (user: any) => {
        const isFollowing = await DB.prepare(
          'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?'
        ).bind(userId, user.id).first();

        return {
          ...user,
          is_following: !!isFollowing
        };
      })
    );

    return c.json(followingWithStatus);
  } catch (error) {
    console.error('Get following error:', error);
    return c.json({ error: 'Failed to get following' }, 500);
  }
});

// Get all workouts feed
app.get('/feed', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const page = Number(c.req.query('page') || '1');
    const limit = Number(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    // Get all workouts with user info
    const workouts = await DB.prepare(`
      SELECT 
        w.*,
        u.id as user_id, u.name as user_name, u.email as user_email,
        u.profile_image_url as user_profile_image_url
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    // Add images, likes, comments for each workout
    const workoutsWithDetails = await Promise.all(
      (workouts.results || []).map(async (workout: any) => {
        const images = await DB.prepare(
          'SELECT url FROM workout_images WHERE workout_id = ?'
        ).bind(workout.id).all();

        const likesCount = await DB.prepare(
          'SELECT COUNT(*) as count FROM likes WHERE workout_id = ?'
        ).bind(workout.id).first<{ count: number }>();

        const userLike = await DB.prepare(
          'SELECT id FROM likes WHERE workout_id = ? AND user_id = ?'
        ).bind(workout.id, userId).first();

        const commentsCount = await DB.prepare(
          'SELECT COUNT(*) as count FROM comments WHERE workout_id = ?'
        ).bind(workout.id).first<{ count: number }>();

        return {
          id: workout.id,
          user_id: workout.user_id,
          workout_type: workout.workout_type,
          started_at: workout.started_at,
          duration_min: workout.duration_min,
          distance_km: workout.distance_km,
          pace_sec_per_km: workout.pace_sec_per_km,
          calories: workout.calories,
          memo: workout.memo,
          created_at: workout.created_at,
          user: {
            id: workout.user_id,
            name: workout.user_name,
            email: workout.user_email,
            profile_image_url: workout.user_profile_image_url
          },
          images: (images.results || []).map((img: any) => img.url),
          likes_count: likesCount?.count || 0,
          liked_by_me: !!userLike,
          comments_count: commentsCount?.count || 0
        };
      })
    );

    return c.json(workoutsWithDetails);
  } catch (error) {
    console.error('Get feed error:', error);
    return c.json({ error: 'Failed to get feed' }, 500);
  }
});

// Get friends feed (workouts from following users)
app.get('/feed/following', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;

    // Get list of users I'm following
    const following = await DB.prepare(`
      SELECT following_id FROM user_follows WHERE follower_id = ?
    `).bind(userId).all();

    if (!following.results || following.results.length === 0) {
      return c.json([]);
    }

    const followingIds = following.results.map((f: any) => f.following_id);
    const placeholders = followingIds.map(() => '?').join(',');

    // Get workouts from following users
    const workouts = await DB.prepare(`
      SELECT 
        w.*,
        u.id as user_id, u.name as user_name, u.email as user_email,
        u.profile_image_url as user_profile_image_url
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id IN (${placeholders})
      ORDER BY w.created_at DESC
      LIMIT 50
    `).bind(...followingIds).all();

    // Add images, likes, comments for each workout
    const workoutsWithDetails = await Promise.all(
      (workouts.results || []).map(async (workout: any) => {
        const images = await DB.prepare(
          'SELECT url FROM workout_images WHERE workout_id = ?'
        ).bind(workout.id).all();

        const likesCount = await DB.prepare(
          'SELECT COUNT(*) as count FROM likes WHERE workout_id = ?'
        ).bind(workout.id).first<{ count: number }>();

        const userLike = await DB.prepare(
          'SELECT id FROM likes WHERE workout_id = ? AND user_id = ?'
        ).bind(workout.id, userId).first();

        const commentsCount = await DB.prepare(
          'SELECT COUNT(*) as count FROM comments WHERE workout_id = ?'
        ).bind(workout.id).first<{ count: number }>();

        return {
          id: workout.id,
          user_id: workout.user_id,
          workout_type: workout.workout_type,
          started_at: workout.started_at,
          duration_min: workout.duration_min,
          distance_km: workout.distance_km,
          pace_sec_per_km: workout.pace_sec_per_km,
          calories: workout.calories,
          memo: workout.memo,
          created_at: workout.created_at,
          user: {
            id: workout.user_id,
            name: workout.user_name,
            email: workout.user_email,
            profile_image_url: workout.user_profile_image_url
          },
          images: (images.results || []).map((img: any) => img.url),
          likes_count: likesCount?.count || 0,
          liked_by_me: !!userLike,
          comments_count: commentsCount?.count || 0
        };
      })
    );

    return c.json(workoutsWithDetails);
  } catch (error) {
    console.error('Get friends feed error:', error);
    return c.json({ error: 'Failed to get friends feed' }, 500);
  }
});

export default app;
