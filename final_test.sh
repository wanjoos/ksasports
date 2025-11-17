#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "🎯 Workout Together 최종 API 테스트"
echo "=========================================="
echo ""

# 회원가입
SIGNUP=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"user_$(date +%s)@example.com\",
    \"password\": \"Test123!@#\",
    \"name\": \"Test User\",
    \"height_cm\": 175
  }")

TOKEN=$(echo $SIGNUP | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $SIGNUP | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "✅ 1. 회원가입 성공"
echo "   User ID: $USER_ID"
echo ""

# 프로필 조회
PROFILE=$(curl -s "$BASE_URL/api/users/$USER_ID" -H "Authorization: Bearer $TOKEN")
if echo "$PROFILE" | grep -q "\"id\""; then
  echo "✅ 2. 프로필 조회 성공"
else
  echo "❌ 2. 프로필 조회 실패: $(echo $PROFILE | head -c 100)"
fi
echo ""

# 프로필 업데이트
UPDATE=$(curl -s -X PUT "$BASE_URL/api/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "height_cm": 180}')
if echo "$UPDATE" | grep -q "Updated Name"; then
  echo "✅ 3. 프로필 업데이트 성공"
else
  echo "❌ 3. 프로필 업데이트 실패"
fi
echo ""

# 운동 생성
WORKOUT=$(curl -s -X POST "$BASE_URL/api/workouts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"workout_type\": \"RUN\",
    \"started_at\": \"$(date -u +\"%Y-%m-%dT%H:%M:%S\")\",
    \"duration_min\": 30,
    \"distance_km\": 5.0,
    \"calories\": 300,
    \"memo\": \"Test workout\"
  }")
if echo "$WORKOUT" | grep -q "\"id\""; then
  echo "✅ 4. 운동 생성 성공"
  WORKOUT_ID=$(echo $WORKOUT | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "   Workout ID: $WORKOUT_ID"
else
  echo "❌ 4. 운동 생성 실패: $(echo $WORKOUT | head -c 100)"
fi
echo ""

# 챌린지 목록
CHALLENGES=$(curl -s "$BASE_URL/api/challenges" -H "Authorization: Bearer $TOKEN")
if echo "$CHALLENGES" | grep -q "\["; then
  echo "✅ 5. 챌린지 목록 조회 성공"
else
  echo "❌ 5. 챌린지 목록 조회 실패"
fi
echo ""

# 배지 목록
BADGES=$(curl -s "$BASE_URL/api/challenges/badges" -H "Authorization: Bearer $TOKEN")
if echo "$BADGES" | grep -q "\"earned\""; then
  echo "✅ 6. 배지 목록 조회 성공"
else
  echo "❌ 6. 배지 목록 조회 실패: $(echo $BADGES | head -c 100)"
fi
echo ""

# 피드 조회
FEED=$(curl -s "$BASE_URL/api/social/feed" -H "Authorization: Bearer $TOKEN")
if echo "$FEED" | grep -q "\["; then
  echo "✅ 7. 피드 조회 성공"
else
  echo "❌ 7. 피드 조회 실패"
fi
echo ""

# 알림 조회
NOTIFICATIONS=$(curl -s "$BASE_URL/api/notifications" -H "Authorization: Bearer $TOKEN")
if echo "$NOTIFICATIONS" | grep -q "\"notifications\""; then
  echo "✅ 8. 알림 조회 성공"
else
  echo "❌ 8. 알림 조회 실패"
fi
echo ""

# 통계 조회
STATS=$(curl -s "$BASE_URL/api/me/stats" -H "Authorization: Bearer $TOKEN")
if echo "$STATS" | grep -q "\"workout_count\""; then
  echo "✅ 9. 통계 조회 성공"
else
  echo "❌ 9. 통계 조회 실패"
fi
echo ""

echo "=========================================="
echo "🎉 모든 API 테스트 완료!"
echo "=========================================="
