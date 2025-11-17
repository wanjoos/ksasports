import { Hono } from 'hono';
import { generateId } from '../utils/crypto';
import { authMiddleware } from '../utils/middleware';
import type { Bindings, Workout, WorkoutWithUser, Comment, CommentWithUser, User } from '../types';

const workouts = new Hono<{ Bindings: Bindings }>();

// Get feed (all workouts)
workouts.get('/feed', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const page = Number(c.req.query('page') || '1');
    const limit = Number(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Get workouts with user info
    const workoutsData = await db.prepare(
      `SELECT 
        w.*,
        u.id as user_id, u.name as user_name, u.email as user_email, 
        u.profile_image_url as user_profile_image_url
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();
    
    const workoutsList: WorkoutWithUser[] = [];
    
    for (const row of workoutsData.results) {
      const workout = row as any;
      
      // Get images
      const images = await db.prepare(
        'SELECT url FROM workout_images WHERE workout_id = ?'
      ).bind(workout.id).all();
      
      // Get likes count
      const likesCount = await db.prepare(
        'SELECT COUNT(*) as count FROM likes WHERE workout_id = ?'
      ).bind(workout.id).first<{ count: number }>();
      
      // Check if current user liked
      const userLike = await db.prepare(
        'SELECT id FROM likes WHERE workout_id = ? AND user_id = ?'
      ).bind(workout.id, userId).first();
      
      // Get comments count
      const commentsCount = await db.prepare(
        'SELECT COUNT(*) as count FROM comments WHERE workout_id = ?'
      ).bind(workout.id).first<{ count: number }>();
      
      workoutsList.push({
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
        updated_at: workout.updated_at,
        user: {
          id: workout.user_id,
          email: workout.user_email,
          name: workout.user_name,
          profile_image_url: workout.user_profile_image_url,
          created_at: '',
          updated_at: ''
        },
        images: images.results.map((img: any) => img.url),
        likes_count: likesCount?.count || 0,
        comments_count: commentsCount?.count || 0,
        liked_by_me: !!userLike
      });
    }
    
    return c.json(workoutsList);
  } catch (error) {
    console.error('Get feed error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create workout
workouts.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    
    const { workout_type, started_at, duration_min, distance_km, pace_sec_per_km, calories, memo, image_urls } = await c.req.json();
    
    if (!workout_type || !started_at || !duration_min) {
      return c.json({ error: 'workout_type, started_at, and duration_min are required' }, 400);
    }
    
    const workoutId = generateId();
    
    await db.prepare(
      `INSERT INTO workouts (id, user_id, workout_type, started_at, duration_min, distance_km, pace_sec_per_km, calories, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      workoutId,
      userId,
      workout_type,
      started_at,
      duration_min,
      distance_km || null,
      pace_sec_per_km || null,
      calories || null,
      memo || null
    ).run();
    
    // Add images
    if (image_urls && Array.isArray(image_urls)) {
      for (const url of image_urls) {
        const imageId = generateId();
        await db.prepare(
          'INSERT INTO workout_images (id, workout_id, url) VALUES (?, ?, ?)'
        ).bind(imageId, workoutId, url).run();
      }
    }
    
    const workout = await db.prepare(
      'SELECT * FROM workouts WHERE id = ?'
    ).bind(workoutId).first<Workout>();
    
    return c.json(workout, 201);
  } catch (error) {
    console.error('Create workout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get workout by ID
workouts.get('/:id', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const workoutId = c.req.param('id');
    
    const workout = await db.prepare(
      `SELECT w.*, u.id as user_id, u.name as user_name, u.email as user_email, 
       u.profile_image_url as user_profile_image_url
       FROM workouts w
       JOIN users u ON w.user_id = u.id
       WHERE w.id = ?`
    ).bind(workoutId).first();
    
    if (!workout) {
      return c.json({ error: 'Workout not found' }, 404);
    }
    
    const row = workout as any;
    
    // Get images
    const images = await db.prepare(
      'SELECT url FROM workout_images WHERE workout_id = ?'
    ).bind(workoutId).all();
    
    // Get likes count
    const likesCount = await db.prepare(
      'SELECT COUNT(*) as count FROM likes WHERE workout_id = ?'
    ).bind(workoutId).first<{ count: number }>();
    
    // Check if current user liked
    const userLike = await db.prepare(
      'SELECT id FROM likes WHERE workout_id = ? AND user_id = ?'
    ).bind(workoutId, userId).first();
    
    // Get comments count
    const commentsCount = await db.prepare(
      'SELECT COUNT(*) as count FROM comments WHERE workout_id = ?'
    ).bind(workoutId).first<{ count: number }>();
    
    const workoutWithUser: WorkoutWithUser = {
      id: row.id,
      user_id: row.user_id,
      workout_type: row.workout_type,
      started_at: row.started_at,
      duration_min: row.duration_min,
      distance_km: row.distance_km,
      pace_sec_per_km: row.pace_sec_per_km,
      calories: row.calories,
      memo: row.memo,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        profile_image_url: row.user_profile_image_url,
        created_at: '',
        updated_at: ''
      },
      images: images.results.map((img: any) => img.url),
      likes_count: likesCount?.count || 0,
      comments_count: commentsCount?.count || 0,
      liked_by_me: !!userLike
    };
    
    return c.json(workoutWithUser);
  } catch (error) {
    console.error('Get workout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Like a workout
workouts.post('/:id/like', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const workoutId = c.req.param('id');
    
    // Check if already liked
    const existingLike = await db.prepare(
      'SELECT id FROM likes WHERE workout_id = ? AND user_id = ?'
    ).bind(workoutId, userId).first();
    
    if (existingLike) {
      return c.json({ error: 'Already liked' }, 400);
    }
    
    const likeId = generateId();
    await db.prepare(
      'INSERT INTO likes (id, workout_id, user_id) VALUES (?, ?, ?)'
    ).bind(likeId, workoutId, userId).run();
    
    const likesCount = await db.prepare(
      'SELECT COUNT(*) as count FROM likes WHERE workout_id = ?'
    ).bind(workoutId).first<{ count: number }>();
    
    return c.json({ success: true, liked: true, likes_count: likesCount?.count || 0 });
  } catch (error) {
    console.error('Like workout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Unlike a workout
workouts.delete('/:id/like', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const workoutId = c.req.param('id');
    
    await db.prepare(
      'DELETE FROM likes WHERE workout_id = ? AND user_id = ?'
    ).bind(workoutId, userId).run();
    
    const likesCount = await db.prepare(
      'SELECT COUNT(*) as count FROM likes WHERE workout_id = ?'
    ).bind(workoutId).first<{ count: number }>();
    
    return c.json({ success: true, liked: false, likes_count: likesCount?.count || 0 });
  } catch (error) {
    console.error('Unlike workout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get comments for a workout
workouts.get('/:id/comments', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const workoutId = c.req.param('id');
    
    const comments = await db.prepare(
      `SELECT c.*, u.id as user_id, u.name as user_name, u.email as user_email,
       u.profile_image_url as user_profile_image_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.workout_id = ?
       ORDER BY c.created_at ASC`
    ).bind(workoutId).all();
    
    const commentsList: CommentWithUser[] = comments.results.map((row: any) => ({
      id: row.id,
      workout_id: row.workout_id,
      user_id: row.user_id,
      text: row.text,
      created_at: row.created_at,
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        profile_image_url: row.user_profile_image_url,
        created_at: '',
        updated_at: ''
      }
    }));
    
    return c.json(commentsList);
  } catch (error) {
    console.error('Get comments error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add comment to a workout
workouts.post('/:id/comments', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const workoutId = c.req.param('id');
    const { text } = await c.req.json();
    
    if (!text) {
      return c.json({ error: 'Text is required' }, 400);
    }
    
    const commentId = generateId();
    await db.prepare(
      'INSERT INTO comments (id, workout_id, user_id, text) VALUES (?, ?, ?, ?)'
    ).bind(commentId, workoutId, userId, text).run();
    
    const comment = await db.prepare(
      `SELECT c.*, u.id as user_id, u.name as user_name, u.email as user_email,
       u.profile_image_url as user_profile_image_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`
    ).bind(commentId).first();
    
    const row = comment as any;
    
    const commentWithUser: CommentWithUser = {
      id: row.id,
      workout_id: row.workout_id,
      user_id: row.user_id,
      text: row.text,
      created_at: row.created_at,
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        profile_image_url: row.user_profile_image_url,
        created_at: '',
        updated_at: ''
      }
    };
    
    return c.json(commentWithUser, 201);
  } catch (error) {
    console.error('Add comment error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update workout
workouts.put('/:id', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const workoutId = c.req.param('id');
    
    // Check ownership
    const existingWorkout = await db.prepare(
      'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
    ).bind(workoutId, userId).first();
    
    if (!existingWorkout) {
      return c.json({ error: 'Workout not found or unauthorized' }, 404);
    }
    
    const { workout_type, started_at, duration_min, distance_km, pace_sec_per_km, calories, memo } = await c.req.json();
    
    await db.prepare(
      `UPDATE workouts 
       SET workout_type = ?, started_at = ?, duration_min = ?, 
           distance_km = ?, pace_sec_per_km = ?, calories = ?, memo = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(
      workout_type,
      started_at,
      duration_min,
      distance_km || null,
      pace_sec_per_km || null,
      calories || null,
      memo || null,
      workoutId
    ).run();
    
    const updatedWorkout = await db.prepare(
      'SELECT * FROM workouts WHERE id = ?'
    ).bind(workoutId).first<Workout>();
    
    return c.json(updatedWorkout);
  } catch (error) {
    console.error('Update workout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete workout
workouts.delete('/:id', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const workoutId = c.req.param('id');
    
    // Check ownership
    const existingWorkout = await db.prepare(
      'SELECT * FROM workouts WHERE id = ? AND user_id = ?'
    ).bind(workoutId, userId).first();
    
    if (!existingWorkout) {
      return c.json({ error: 'Workout not found or unauthorized' }, 404);
    }
    
    // Delete workout (cascade will delete related images, comments, likes)
    await db.prepare('DELETE FROM workouts WHERE id = ?').bind(workoutId).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete workout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete comment
workouts.delete('/:workoutId/comments/:commentId', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('userId');
    const commentId = c.req.param('commentId');
    
    // Check ownership
    const existingComment = await db.prepare(
      'SELECT * FROM comments WHERE id = ? AND user_id = ?'
    ).bind(commentId, userId).first();
    
    if (!existingComment) {
      return c.json({ error: 'Comment not found or unauthorized' }, 404);
    }
    
    await db.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default workouts;
