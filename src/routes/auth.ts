import { Hono } from 'hono';
import { generateId, hashPassword, verifyPassword } from '../utils/crypto';
import { signToken } from '../utils/jwt';
import { authMiddleware } from '../utils/middleware';
import type { Bindings, User, UserWithPassword } from '../types';

const auth = new Hono<{ Bindings: Bindings }>();

// Sign up
auth.post('/signup', async (c) => {
  try {
    const { email, password, name, height_cm } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }
    
    const db = c.env.DB;
    
    // Check if user already exists
    const existingUser = await db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409);
    }
    
    // Create new user
    const userId = generateId();
    const passwordHash = await hashPassword(password);
    
    await db.prepare(
      `INSERT INTO users (id, email, password_hash, name, height_cm) 
       VALUES (?, ?, ?, ?, ?)`
    ).bind(userId, email, passwordHash, name, height_cm || null).run();
    
    // Get created user
    const user = await db.prepare(
      'SELECT id, email, name, profile_image_url, height_cm, created_at FROM users WHERE id = ?'
    ).bind(userId).first<User>();
    
    // Generate token
    const token = await signToken({ sub: userId, email });
    
    return c.json({ user, token }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Login
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    const db = c.env.DB;
    
    // Find user
    const user = await db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first<UserWithPassword>();
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Generate token
    const token = await signToken({ sub: user.id, email: user.email });
    
    // Return user without password
    const { password_hash, ...userWithoutPassword } = user;
    
    return c.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get current user
auth.get('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    
    const user = await db.prepare(
      'SELECT id, email, name, profile_image_url, height_cm, created_at FROM users WHERE id = ?'
    ).bind(userId).first<User>();
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default auth;
