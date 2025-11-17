#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "🧪 Workout Together API 전체 테스트"
echo "=========================================="
echo ""

# 1. 회원가입
echo "1️⃣ 회원가입 테스트..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser_'$(date +%s)'@example.com",
    "password": "Test123!@#",
    "name": "Test User",
    "height_cm": 175
  }')
echo "✅ 회원가입: $(echo $SIGNUP_RESPONSE | head -c 100)..."
TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "   Token: ${TOKEN:0:50}..."
echo "   User ID: $USER_ID"
echo ""

# 2. 프로필 조회
echo "2️⃣ 프로필 조회 테스트..."
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "✅ 프로필 조회: $(echo $PROFILE_RESPONSE | head -c 100)..."
echo ""

# 3. 프로필 업데이트
echo "3️⃣ 프로필 업데이트 테스트..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test User",
    "height_cm": 180
  }')
echo "✅ 프로필 업데이트: $(echo $UPDATE_RESPONSE | head -c 100)..."
echo ""

# 4. 운동 생성
echo "4️⃣ 운동 생성 테스트..."
WORKOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/workouts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "RUN",
    "duration": 30,
    "distance": 5.0,
    "calories": 300,
    "memo": "Test workout",
    "started_at": "'$(date -u +"%Y-%m-%dT%H:%M:%S")'"
  }')
echo "✅ 운동 생성: $(echo $WORKOUT_RESPONSE | head -c 100)..."
WORKOUT_ID=$(echo $WORKOUT_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "   Workout ID: $WORKOUT_ID"
echo ""

# 5. 챌린지 목록 조회
echo "5️⃣ 챌린지 목록 조회 테스트..."
CHALLENGES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/challenges" \
  -H "Authorization: Bearer $TOKEN")
echo "✅ 챌린지 목록: $(echo $CHALLENGES_RESPONSE | head -c 100)..."
echo ""

# 6. 배지 목록 조회
echo "6️⃣ 배지 목록 조회 테스트..."
BADGES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/challenges/badges" \
  -H "Authorization: Bearer $TOKEN")
echo "✅ 배지 목록: $(echo $BADGES_RESPONSE | head -c 100)..."
echo ""

# 7. 피드 조회
echo "7️⃣ 피드 조회 테스트..."
FEED_RESPONSE=$(curl -s -X GET "$BASE_URL/api/social/feed" \
  -H "Authorization: Bearer $TOKEN")
echo "✅ 피드 조회: $(echo $FEED_RESPONSE | head -c 100)..."
echo ""

# 8. 알림 조회
echo "8️⃣ 알림 조회 테스트..."
NOTIFICATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/notifications" \
  -H "Authorization: Bearer $TOKEN")
echo "✅ 알림 조회: $(echo $NOTIFICATIONS_RESPONSE | head -c 100)..."
echo ""

# 9. 통계 조회
echo "9️⃣ 통계 조회 테스트..."
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/me/stats" \
  -H "Authorization: Bearer $TOKEN")
echo "✅ 통계 조회: $(echo $STATS_RESPONSE | head -c 100)..."
echo ""

echo "=========================================="
echo "✨ 모든 API 테스트 완료!"
echo "=========================================="
