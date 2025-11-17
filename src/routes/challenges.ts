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

// Get all public challenges
app.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;

    const challenges = await DB.prepare(`
      SELECT c.*, u.name as creator_name,
        (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participants_count
      FROM challenges c
      JOIN users u ON c.creator_id = u.id
      WHERE c.is_public = 1
      ORDER BY c.created_at DESC
    `).all();

    // Add participation status
    const challengesWithStatus = await Promise.all(
      (challenges.results || []).map(async (challenge: any) => {
        const participant = await DB.prepare(
          'SELECT id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?'
        ).bind(challenge.id, userId).first();

        return {
          ...challenge,
          is_participating: !!participant
        };
      })
    );

    return c.json(challengesWithStatus);
  } catch (error) {
    console.error('Get challenges error:', error);
    return c.json({ error: 'Failed to get challenges' }, 500);
  }
});

// Get user's badges (must be before /:id route)
app.get('/badges', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;

    const userBadges = await DB.prepare(`
      SELECT b.*, ub.earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `).bind(userId).all();

    // Get all badges for comparison
    const allBadges = await DB.prepare(`
      SELECT * FROM badges ORDER BY requirement_value
    `).all();

    return c.json({
      earned: userBadges.results || [],
      all: allBadges.results || []
    });
  } catch (error) {
    console.error('Get badges error:', error);
    return c.json({ error: 'Failed to get badges' }, 500);
  }
});

// Get challenge details with leaderboard
app.get('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const challengeId = c.req.param('id');

    const challenge = await DB.prepare(`
      SELECT c.*, u.name as creator_name
      FROM challenges c
      JOIN users u ON c.creator_id = u.id
      WHERE c.id = ?
    `).bind(challengeId).first();

    if (!challenge) {
      return c.json({ error: 'Challenge not found' }, 404);
    }

    // Get participants count
    const participantsCount = await DB.prepare(
      'SELECT COUNT(*) as count FROM challenge_participants WHERE challenge_id = ?'
    ).bind(challengeId).first<{ count: number }>();

    // Check if user is participating
    const participant = await DB.prepare(
      'SELECT id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?'
    ).bind(challengeId, userId).first();

    // Get leaderboard
    const leaderboard = await DB.prepare(`
      SELECT 
        u.id, u.name,
        CASE 
          WHEN ? = 'DISTANCE' THEN COALESCE(SUM(w.distance_km), 0)
          WHEN ? = 'DURATION' THEN COALESCE(SUM(w.duration_min), 0)
          WHEN ? = 'COUNT' THEN COUNT(w.id)
        END as progress
      FROM challenge_participants cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN workouts w ON w.user_id = u.id 
        AND DATE(w.started_at) >= ? 
        AND DATE(w.started_at) <= ?
      WHERE cp.challenge_id = ?
      GROUP BY u.id, u.name
      ORDER BY progress DESC
      LIMIT 10
    `).bind(
      challenge.challenge_type,
      challenge.challenge_type,
      challenge.challenge_type,
      challenge.start_date,
      challenge.end_date,
      challengeId
    ).all();

    return c.json({
      ...challenge,
      participants_count: participantsCount?.count || 0,
      is_participating: !!participant,
      leaderboard: leaderboard.results || []
    });
  } catch (error) {
    console.error('Get challenge details error:', error);
    return c.json({ error: 'Failed to get challenge details' }, 500);
  }
});

// Create challenge
app.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const { title, description, challenge_type, target_value, start_date, end_date, is_public } = await c.req.json();

    // Validate
    if (!title || !challenge_type || !target_value || !start_date || !end_date) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (!['DISTANCE', 'DURATION', 'COUNT'].includes(challenge_type)) {
      return c.json({ error: 'Invalid challenge type' }, 400);
    }

    const challengeId = crypto.randomUUID();

    await DB.prepare(`
      INSERT INTO challenges (id, creator_id, title, description, challenge_type, target_value, start_date, end_date, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      challengeId,
      userId,
      title,
      description || null,
      challenge_type,
      target_value,
      start_date,
      end_date,
      is_public ? 1 : 0
    ).run();

    // Auto-join creator
    const participantId = crypto.randomUUID();
    await DB.prepare(`
      INSERT INTO challenge_participants (id, challenge_id, user_id)
      VALUES (?, ?, ?)
    `).bind(participantId, challengeId, userId).run();

    return c.json({ id: challengeId, success: true });
  } catch (error) {
    console.error('Create challenge error:', error);
    return c.json({ error: 'Failed to create challenge' }, 500);
  }
});

// Join challenge
app.post('/:id/join', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const challengeId = c.req.param('id');

    // Check if challenge exists and get creator
    const challenge = await DB.prepare(
      'SELECT id, creator_id FROM challenges WHERE id = ?'
    ).bind(challengeId).first<{ id: string; creator_id: string }>();

    if (!challenge) {
      return c.json({ error: 'Challenge not found' }, 404);
    }

    // Check if already participating
    const existing = await DB.prepare(
      'SELECT id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?'
    ).bind(challengeId, userId).first();

    if (existing) {
      return c.json({ error: 'Already participating' }, 400);
    }

    const participantId = crypto.randomUUID();

    await DB.prepare(`
      INSERT INTO challenge_participants (id, challenge_id, user_id)
      VALUES (?, ?, ?)
    `).bind(participantId, challengeId, userId).run();

    // Notify challenge creator
    if (challenge.creator_id !== userId) {
      await createNotification(DB, {
        user_id: challenge.creator_id,
        type: 'CHALLENGE_JOIN',
        actor_id: userId,
        challenge_id: challengeId
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Join challenge error:', error);
    return c.json({ error: 'Failed to join challenge' }, 500);
  }
});

// Leave challenge
app.delete('/:id/join', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;
    const challengeId = c.req.param('id');

    await DB.prepare(
      'DELETE FROM challenge_participants WHERE challenge_id = ? AND user_id = ?'
    ).bind(challengeId, userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Leave challenge error:', error);
    return c.json({ error: 'Failed to leave challenge' }, 500);
  }
});

app.get('/badges/me', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;

    const userBadges = await DB.prepare(`
      SELECT b.*, ub.earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `).bind(userId).all();

    // Get all badges for comparison
    const allBadges = await DB.prepare(`
      SELECT * FROM badges ORDER BY requirement_value
    `).all();

    return c.json({
      earned: userBadges.results || [],
      all: allBadges.results || []
    });
  } catch (error) {
    console.error('Get badges error:', error);
    return c.json({ error: 'Failed to get badges' }, 500);
  }
});

// Check and award badges (called internally)
app.post('/badges/check', async (c) => {
  try {
    const userId = c.get('userId');
    const { DB } = c.env;

    // Get user stats
    const workoutCount = await DB.prepare(
      'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?'
    ).bind(userId).first<{ count: number }>();

    const totalDistance = await DB.prepare(
      'SELECT COALESCE(SUM(distance_km), 0) as total FROM workouts WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>();

    const totalDuration = await DB.prepare(
      'SELECT COALESCE(SUM(duration_min), 0) as total FROM workouts WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>();

    const challengesCompleted = await DB.prepare(`
      SELECT COUNT(*) as count FROM challenge_participants cp
      JOIN challenges c ON cp.challenge_id = c.id
      WHERE cp.user_id = ? AND c.end_date < DATE('now')
    `).bind(userId).first<{ count: number }>();

    // Get all badges
    const badges = await DB.prepare('SELECT * FROM badges').all();

    const newBadges = [];

    for (const badge of (badges.results || [])) {
      const badgeData = badge as any;
      
      // Check if already earned
      const existing = await DB.prepare(
        'SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?'
      ).bind(userId, badgeData.id).first();

      if (existing) continue;

      // Check if earned
      let earned = false;
      if (badgeData.requirement_type === 'COUNT') {
        earned = (workoutCount?.count || 0) >= badgeData.requirement_value;
      } else if (badgeData.requirement_type === 'DISTANCE') {
        earned = (totalDistance?.total || 0) >= badgeData.requirement_value;
      } else if (badgeData.requirement_type === 'DURATION') {
        earned = (totalDuration?.total || 0) >= badgeData.requirement_value;
      } else if (badgeData.requirement_type === 'CHALLENGE') {
        earned = (challengesCompleted?.count || 0) >= badgeData.requirement_value;
      }

      if (earned) {
        const userBadgeId = crypto.randomUUID();
        await DB.prepare(`
          INSERT INTO user_badges (id, user_id, badge_id)
          VALUES (?, ?, ?)
        `).bind(userBadgeId, userId, badgeData.id).run();

        // Create badge earned notification
        await createNotification(DB, {
          user_id: userId,
          type: 'BADGE_EARNED',
          badge_id: badgeData.id
        });

        newBadges.push(badgeData);
      }
    }

    return c.json({ newBadges });
  } catch (error) {
    console.error('Check badges error:', error);
    return c.json({ error: 'Failed to check badges' }, 500);
  }
});

export default app;
