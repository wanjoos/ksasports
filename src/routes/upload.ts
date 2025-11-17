import { Hono } from 'hono';
import { generateId } from '../utils/crypto';
import { authMiddleware } from '../utils/middleware';
import type { Bindings } from '../types';

const upload = new Hono<{ Bindings: Bindings }>();

// Upload image to R2
upload.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const formData = await c.req.formData();
    const file = formData.get('image');
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No image file provided' }, 400);
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File size must be less than 5MB' }, 400);
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Only JPEG, PNG and WebP images are allowed' }, 400);
    }
    
    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}/${generateId()}.${fileExtension}`;
    
    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });
    
    // Return public URL (in production, you'd use a custom domain)
    const publicUrl = `/images/${fileName}`;
    
    return c.json({ url: publicUrl }, 201);
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload image' }, 500);
  }
});

// Get image from R2
upload.get('/:userId/:fileName', async (c) => {
  try {
    const userId = c.req.param('userId');
    const fileName = c.req.param('fileName');
    const key = `${userId}/${fileName}`;
    
    const object = await c.env.R2.get(key);
    
    if (!object) {
      return c.notFound();
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000');
    
    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error('Get image error:', error);
    return c.json({ error: 'Failed to get image' }, 500);
  }
});

// Delete image from R2
upload.delete('/:userId/:fileName', authMiddleware, async (c) => {
  try {
    const currentUserId = c.get('userId');
    const userId = c.req.param('userId');
    const fileName = c.req.param('fileName');
    
    // Check ownership
    if (currentUserId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const key = `${userId}/${fileName}`;
    await c.env.R2.delete(key);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete image error:', error);
    return c.json({ error: 'Failed to delete image' }, 500);
  }
});

export default upload;
