-- User follows table for social connections
-- follower_id follows following_id (one-way follow)
CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON user_follows(following_id);
