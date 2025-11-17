-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK(challenge_type IN ('DISTANCE', 'DURATION', 'COUNT')),
  target_value REAL NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_public INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_public ON challenges(is_public);

-- Challenge participants table
CREATE TABLE IF NOT EXISTS challenge_participants (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON challenge_participants(user_id);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL CHECK(requirement_type IN ('DISTANCE', 'DURATION', 'COUNT', 'STREAK', 'CHALLENGE')),
  requirement_value INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- Insert default badges
INSERT OR IGNORE INTO badges (id, name, description, icon, requirement_type, requirement_value) VALUES
  ('badge-1', '첫 걸음', '첫 운동 기록 달성', '👶', 'COUNT', 1),
  ('badge-2', '꾸준함', '7일 연속 운동', '🔥', 'STREAK', 7),
  ('badge-3', '마라토너', '총 100km 달성', '🏃', 'DISTANCE', 100),
  ('badge-4', '철인', '총 1000분 운동', '💪', 'DURATION', 1000),
  ('badge-5', '백전노장', '총 100회 운동', '🏆', 'COUNT', 100),
  ('badge-6', '챌린저', '첫 챌린지 완료', '⚡', 'CHALLENGE', 1),
  ('badge-7', '울트라 마라토너', '총 500km 달성', '🚀', 'DISTANCE', 500),
  ('badge-8', '운동 중독자', '총 5000분 운동', '🔥', 'DURATION', 5000),
  ('badge-9', '레전드', '총 500회 운동', '👑', 'COUNT', 500),
  ('badge-10', '챌린지 마스터', '10개 챌린지 완료', '🎯', 'CHALLENGE', 10);
