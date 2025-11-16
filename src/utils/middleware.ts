import { Context, Next } from 'hono';
import { verifyToken } from './jwt';
import type { Bindings } from '../types';

export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.substring(7);
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  
  // Store user info in context
  c.set('userId', payload.sub);
  c.set('userEmail', payload.email);
  
  await next();
}
