-- Test users (password is "password123" for all)
-- Password hash generated with bcrypt
INSERT OR IGNORE INTO users (id, email, password_hash, name, height_cm) VALUES 
  ('user1', 'hong@example.com', '$2b$10$YourHashHere', '홍길동', 175),
  ('user2', 'kim@example.com', '$2b$10$YourHashHere', '김철수', 180),
  ('user3', 'lee@example.com', '$2b$10$YourHashHere', '이영희', 165);

-- Test workouts
INSERT OR IGNORE INTO workouts (id, user_id, workout_type, started_at, duration_min, distance_km, pace_sec_per_km, calories, memo) VALUES 
  ('w1', 'user1', 'RUN', '2025-11-15 06:00:00', 30, 5.0, 360, 350, '아침 러닝 🏃'),
  ('w2', 'user1', 'RUN', '2025-11-16 06:00:00', 35, 6.0, 350, 420, '날씨 좋음'),
  ('w3', 'user2', 'BIKE', '2025-11-16 18:00:00', 60, 20.0, null, 500, '저녁 라이딩');

-- Test weight logs
INSERT OR IGNORE INTO weight_logs (id, user_id, weight_kg, logged_at) VALUES 
  ('wl1', 'user1', 75.5, '2025-11-10'),
  ('wl2', 'user1', 75.2, '2025-11-13'),
  ('wl3', 'user1', 74.8, '2025-11-16');

-- Test likes
INSERT OR IGNORE INTO likes (id, workout_id, user_id) VALUES 
  ('l1', 'w1', 'user2'),
  ('l2', 'w1', 'user3'),
  ('l3', 'w3', 'user1');

-- Test comments
INSERT OR IGNORE INTO comments (id, workout_id, user_id, text) VALUES 
  ('c1', 'w1', 'user2', '대단하네요! 👍'),
  ('c2', 'w1', 'user3', '저도 내일 뛰어야겠어요'),
  ('c3', 'w3', 'user1', '멋진 라이딩이네요!');
