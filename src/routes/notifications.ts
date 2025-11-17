import { Hono } from 'hono';
import { authMiddleware } from '../utils/middleware';
import type { Bindings } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

// All routes require authentication
app.use('/*', authMiddleware);

// Get user notifications
app.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const { limit = '50', offset = '0' } = c.req.query();
    const { DB } = c.env;

    const notifications = await DB.prepare(`
      SELECT 
        n.*,
        u.name as actor_name,
        u.profile_image_url as actor_image,
        w.workout_type,
        ch.title as challenge_title,
        b.name as badge_name,
        b.icon as badge_icon
      FROM notifications n
      LEFT JOIN users u ON n.actor_id = u.id
      LEFT JOIN workouts w ON n.workout_id = w.id
      LEFT JOIN challenges ch ON n.challenge_id = ch.id
      LEFT JOIN badges b ON n.badge_id = b.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, parseInt(limit), parseInt(offset)).all();

    return c.json({
      notifications: notifications.results || [],
      total: notifications.results?.length || 0
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json({ error: 'Failed to get notifications' }, 500);
  }
});

// Get unread count
app.get('/unread-count', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;

    const result = await DB.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).bind(userId).first<{ count: number }>();

    return c.json({ count: result?.count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    return c.json({ error: 'Failed to get unread count' }, 500);
  }
});

// Mark notification as read
app.put('/:id/read', async (c) => {
  try {
    const userId = c.get('userId');
    const notificationId = c.req.param('id');
    const { DB } = c.env;

    // Verify ownership
    const notification = await DB.prepare(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?'
    ).bind(notificationId, userId).first();

    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    await DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ?'
    ).bind(notificationId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    return c.json({ error: 'Failed to mark as read' }, 500);
  }
});

// Mark all notifications as read
app.put('/read-all', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;

    await DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).bind(userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return c.json({ error: 'Failed to mark all as read' }, 500);
  }
});

// Delete notification
app.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const notificationId = c.req.param('id');
    const { DB } = c.env;

    // Verify ownership
    const notification = await DB.prepare(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?'
    ).bind(notificationId, userId).first();

    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    await DB.prepare(
      'DELETE FROM notifications WHERE id = ?'
    ).bind(notificationId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    return c.json({ error: 'Failed to delete notification' }, 500);
  }
});

// Delete all read notifications
app.delete('/read', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;

    await DB.prepare(
      'DELETE FROM notifications WHERE user_id = ? AND is_read = 1'
    ).bind(userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete read notifications error:', error);
    return c.json({ error: 'Failed to delete read notifications' }, 500);
  }
});

// Helper function to create notification (used by other routes)
export async function createNotification(
  DB: D1Database,
  data: {
    user_id: string;
    type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'CHALLENGE_INVITE' | 'CHALLENGE_JOIN' | 'BADGE_EARNED';
    actor_id?: string;
    workout_id?: string;
    challenge_id?: string;
    badge_id?: string;
    comment_text?: string;
  }
) {
  const id = crypto.randomUUID();
  
  await DB.prepare(`
    INSERT INTO notifications (
      id, user_id, type, actor_id, workout_id, challenge_id, badge_id, comment_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.user_id,
    data.type,
    data.actor_id || null,
    data.workout_id || null,
    data.challenge_id || null,
    data.badge_id || null,
    data.comment_text || null
  ).run();

  return id;
}

export default app;
