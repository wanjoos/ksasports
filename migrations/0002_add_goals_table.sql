-- Goals table for workout targets
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK(goal_type IN ('WEEKLY', 'MONTHLY')),
  target_type TEXT NOT NULL CHECK(target_type IN ('COUNT', 'DISTANCE', 'DURATION')),
  target_value REAL NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_dates ON goals(start_date, end_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_user_period ON goals(user_id, goal_type, target_type, start_date);
