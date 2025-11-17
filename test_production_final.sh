#!/bin/bash

BASE_URL="https://58c6bdd8.workout-together.pages.dev"

echo "=========================================="
echo "🌍 프로덕션 환경 API 최종 테스트"
echo "=========================================="
echo ""

# 회원가입
echo "1️⃣ 회원가입..."
SIGNUP=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"prod_$(date +%s)@example.com\",
    \"password\": \"Test123!@#\",
    \"name\": \"Prod User\",
    \"height_cm\": 175
  }")

TOKEN=$(echo $SIGNUP | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $SIGNUP | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 회원가입 실패"
  echo "Response: $SIGNUP"
  exit 1
fi

echo "✅ 회원가입 성공"
echo "   User ID: $USER_ID"
echo ""

# 프로필 조회
echo "2️⃣ 프로필 조회..."
PROFILE=$(curl -s "$BASE_URL/api/users/$USER_ID" -H "Authorization: Bearer $TOKEN")
if echo "$PROFILE" | grep -q "\"id\""; then
  echo "✅ 프로필 조회 성공"
else
  echo "❌ 프로필 조회 실패: $(echo $PROFILE | head -c 100)"
fi
echo ""

# 운동 생성
echo "3️⃣ 운동 생성..."
WORKOUT=$(curl -s -X POST "$BASE_URL/api/workouts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workout_type":"RUN","started_at":"2025-11-17T15:00:00","duration_min":30,"distance_km":5}')
if echo "$WORKOUT" | grep -q "\"id\""; then
  echo "✅ 운동 생성 성공"
else
  echo "❌ 운동 생성 실패: $(echo $WORKOUT | head -c 100)"
fi
echo ""

# 챌린지 목록
echo "4️⃣ 챌린지 목록 조회..."
CHALLENGES=$(curl -s "$BASE_URL/api/challenges" -H "Authorization: Bearer $TOKEN")
if echo "$CHALLENGES" | grep -q "\["; then
  echo "✅ 챌린지 목록 조회 성공"
else
  echo "❌ 챌린지 목록 조회 실패"
fi
echo ""

# 배지 목록
echo "5️⃣ 배지 목록 조회..."
BADGES=$(curl -s "$BASE_URL/api/challenges/badges" -H "Authorization: Bearer $TOKEN")
if echo "$BADGES" | grep -q "\"earned\""; then
  echo "✅ 배지 목록 조회 성공"
else
  echo "❌ 배지 목록 조회 실패: $(echo $BADGES | head -c 100)"
fi
echo ""

# 피드 조회
echo "6️⃣ 피드 조회..."
FEED=$(curl -s "$BASE_URL/api/social/feed" -H "Authorization: Bearer $TOKEN")
if echo "$FEED" | grep -q "\["; then
  echo "✅ 피드 조회 성공"
else
  echo "❌ 피드 조회 실패"
fi
echo ""

# 알림 조회
echo "7️⃣ 알림 조회..."
NOTIFICATIONS=$(curl -s "$BASE_URL/api/notifications" -H "Authorization: Bearer $TOKEN")
if echo "$NOTIFICATIONS" | grep -q "\"notifications\""; then
  echo "✅ 알림 조회 성공"
else
  echo "❌ 알림 조회 실패"
fi
echo ""

# 통계 조회
echo "8️⃣ 통계 조회..."
STATS=$(curl -s "$BASE_URL/api/me/stats" -H "Authorization: Bearer $TOKEN")
if echo "$STATS" | grep -q "\"workout_count\""; then
  echo "✅ 통계 조회 성공"
else
  echo "❌ 통계 조회 실패"
fi
echo ""

echo "=========================================="
echo "🎉 프로덕션 API 테스트 완료!"
echo "=========================================="
echo ""
echo "📍 프로덕션 URL: $BASE_URL"
echo "=========================================="
