#!/bin/bash

BASE_URL="https://5364ea28.workout-together.pages.dev"

echo "=========================================="
echo "🔍 Workout Together 프로덕션 API 테스트"
echo "=========================================="
echo ""

# 1. 회원가입 (테스트 사용자)
echo "1️⃣ 회원가입 테스트..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_diagnosis@example.com",
    "password": "Test123!@#",
    "name": "Test User",
    "profile_image": "https://api.dicebear.com/7.x/avataaars/svg?seed=test"
  }')
echo "Response: $SIGNUP_RESPONSE"
TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"
echo ""

# 2. 로그인
echo "2️⃣ 로그인 테스트..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_diagnosis@example.com",
    "password": "Test123!@#"
  }')
echo "Response: $LOGIN_RESPONSE"
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Token: $TOKEN"
echo "User ID: $USER_ID"
echo ""

# 3. 프로필 조회
echo "3️⃣ 프로필 조회 테스트..."
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $PROFILE_RESPONSE"
echo ""

# 4. 프로필 업데이트
echo "4️⃣ 프로필 업데이트 테스트..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test User",
    "bio": "Test bio"
  }')
echo "Response: $UPDATE_RESPONSE"
echo ""

# 5. 챌린지 목록 조회
echo "5️⃣ 챌린지 목록 조회 테스트..."
CHALLENGES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/challenges" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $CHALLENGES_RESPONSE"
echo ""

# 6. 배지 목록 조회
echo "6️⃣ 배지 목록 조회 테스트..."
BADGES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/challenges/badges" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $BADGES_RESPONSE"
echo ""

# 7. 운동 생성
echo "7️⃣ 운동 생성 테스트..."
WORKOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/workouts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "running",
    "duration": 30,
    "distance": 5.0,
    "calories": 300,
    "notes": "Test workout"
  }')
echo "Response: $WORKOUT_RESPONSE"
WORKOUT_ID=$(echo $WORKOUT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Workout ID: $WORKOUT_ID"
echo ""

# 8. 피드 조회
echo "8️⃣ 피드 조회 테스트..."
FEED_RESPONSE=$(curl -s -X GET "$BASE_URL/api/social/feed" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $FEED_RESPONSE"
echo ""

# 9. 알림 조회
echo "9️⃣ 알림 조회 테스트..."
NOTIFICATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/notifications" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $NOTIFICATIONS_RESPONSE"
echo ""

echo "=========================================="
echo "✅ 테스트 완료"
echo "=========================================="
