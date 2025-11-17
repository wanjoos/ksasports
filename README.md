# Workout Together 🏃💪

소규모 그룹이 운동 기록을 공유하고, 서로 응원하며, 개인 기록을 분석하는 운동 SNS 플랫폼

## 🌟 주요 기능

### 현재 완료된 기능
- ✅ **사용자 인증**: 이메일 기반 회원가입/로그인 (JWT 인증)
- ✅ **운동 기록 관리**: 다양한 운동 종류 기록 (러닝, 걷기, 사이클, 배드민턴, 웨이트 등)
- ✅ **이미지 업로드**: R2 버킷을 통한 운동 사진 업로드 (최대 3장)
- ✅ **소셜 피드**: 모든 사용자의 운동 기록 피드 (이미지 포함)
- ✅ **좋아요/댓글**: 운동 기록에 대한 응원 및 소통
- ✅ **통계 분석**: 주간/월간 운동 통계, 운동 종류별 분석
- ✅ **하이라이트**: 최장 거리, 최장 시간, 연속 운동일 기록
- ✅ **체중 기록**: 체중 변화 추적, 추가/삭제 기능

### 아직 구현되지 않은 기능
- ⏳ **OCR 기능**: 운동 앱 스크린샷에서 자동 데이터 추출
- ⏳ **외부 플랫폼 연동**: 삼성헬스, 가민, 스트라바 등 연동
- ⏳ **그룹 기능**: 소규모 그룹별 피드 분리
- ⏳ **차트 시각화**: 그래프를 통한 데이터 시각화
- ⏳ **운동 기록 수정/삭제**: 자신의 운동 기록 편집 기능
- ⏳ **프로필 편집**: 사용자 프로필 정보 수정

## 🔗 URL 정보

### 개발 환경
- **로컬 서버**: http://localhost:3000
- **Sandbox URL**: https://3000-i24xientnmogpg4hwbqop-0e616f0a.sandbox.novita.ai

### API 엔드포인트

#### 인증 (Auth)
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보 (인증 필요)

#### 운동 기록 (Workouts)
- `GET /api/workouts/feed` - 피드 조회 (인증 필요)
- `POST /api/workouts` - 운동 기록 생성 (인증 필요)
- `GET /api/workouts/:id` - 특정 운동 기록 조회 (인증 필요)
- `POST /api/workouts/:id/like` - 좋아요 (인증 필요)
- `DELETE /api/workouts/:id/like` - 좋아요 취소 (인증 필요)
- `GET /api/workouts/:id/comments` - 댓글 조회 (인증 필요)
- `POST /api/workouts/:id/comments` - 댓글 작성 (인증 필요)

#### 통계 (Stats)
- `GET /api/me/stats?range=weekly` - 운동 통계 조회 (인증 필요)
- `GET /api/me/stats/highlights` - 하이라이트 조회 (인증 필요)

#### 체중 (Weight)
- `GET /api/me/weights` - 체중 기록 조회 (인증 필요)
- `POST /api/me/weights` - 체중 기록 추가 (인증 필요)
- `PUT /api/me/weights/:id` - 체중 기록 수정 (인증 필요)
- `DELETE /api/me/weights/:id` - 체중 기록 삭제 (인증 필요)

#### 이미지 업로드 (Upload)
- `POST /api/upload` - 이미지 업로드 (인증 필요, multipart/form-data)
- `GET /api/upload/:userId/:fileName` - 이미지 조회
- `DELETE /api/upload/:userId/:fileName` - 이미지 삭제 (인증 필요)
- `POST /api/me/weights` - 체중 기록 추가 (인증 필요)
- `PUT /api/me/weights/:id` - 체중 기록 수정 (인증 필요)
- `DELETE /api/me/weights/:id` - 체중 기록 삭제 (인증 필요)

## 📊 데이터 구조

### 주요 테이블

**Users (사용자)**
- id, email, password_hash, name, profile_image_url, height_cm

**Workouts (운동 기록)**
- id, user_id, workout_type, started_at, duration_min, distance_km, pace_sec_per_km, calories, memo

**Likes (좋아요)**
- id, workout_id, user_id

**Comments (댓글)**
- id, workout_id, user_id, text

**WeightLogs (체중 기록)**
- id, user_id, weight_kg, logged_at

### 스토리지 서비스
- **Cloudflare D1**: SQLite 기반 관계형 데이터베이스 (모든 데이터 저장)
- **Cloudflare R2**: 이미지 저장용 (향후 구현 예정)

## 💻 기술 스택

### Backend
- **Hono**: 경량 웹 프레임워크
- **Cloudflare Workers**: 엣지 런타임
- **Cloudflare D1**: SQLite 데이터베이스
- **jose**: JWT 토큰 처리
- **TypeScript**: 타입 안전성

### Frontend
- **Vanilla JavaScript**: 가벼운 프론트엔드
- **TailwindCSS**: 유틸리티 CSS 프레임워크
- **Font Awesome**: 아이콘
- **Axios**: HTTP 클라이언트

## 🚀 사용 방법

### 1. 회원가입
1. 메인 페이지 접속
2. "회원가입" 탭 선택
3. 이름, 이메일, 비밀번호 입력
4. 키(선택사항) 입력
5. 회원가입 완료

### 2. 운동 기록 추가
1. 로그인 후 "운동 기록 추가" 버튼 클릭
2. 운동 종류 선택 (러닝, 걷기, 사이클 등)
3. 운동 시간, 거리, 칼로리 입력
4. 메모 작성 (선택)
5. 저장

### 3. 피드 확인 및 응원
1. 피드에서 다른 사용자의 운동 기록 확인
2. 좋아요 버튼으로 응원
3. 댓글로 격려 메시지 작성

### 4. 통계 확인
1. "통계" 탭 클릭
2. 총 거리, 시간, 운동 횟수 확인
3. 운동 종류별 통계 확인
4. 개인 하이라이트 확인 (최장 거리, 최장 시간, 연속 일수)

### 5. 체중 관리
1. "체중" 탭 클릭
2. "체중 추가" 버튼으로 체중 기록
3. 체중 변화 그래프 확인

## 📈 배포 상태

- **플랫폼**: Cloudflare Pages (배포 준비 완료)
- **현재 상태**: ✅ 개발 환경 구동 중
- **로컬 테스트**: ✅ 완료
- **프로덕션 배포**: 준비 완료 (Cloudflare API 키 설정 필요)

## 🔮 향후 개발 계획

### Phase 1 (현재 완료)
- ✅ 기본 인증 시스템
- ✅ 운동 기록 CRUD
- ✅ 피드 및 소셜 기능
- ✅ 통계 및 하이라이트
- ✅ 체중 관리

### Phase 2 (다음 단계)
1. **이미지 업로드 구현**
   - R2 버킷 연동
   - 이미지 최적화 및 썸네일 생성

2. **OCR 기능 추가**
   - Google Vision API 또는 OCR.space 연동
   - 운동 앱 스크린샷에서 자동 데이터 추출

3. **그룹 기능**
   - 소규모 그룹 생성 및 관리
   - 그룹별 피드 분리

4. **차트 시각화**
   - Chart.js를 활용한 그래프
   - 운동 추세 분석

5. **외부 플랫폼 연동**
   - 삼성헬스 OAuth 연동
   - 가민, 스트라바 API 연동

## 📝 개발 노트

### 로컬 개발 명령어
```bash
# 빌드
npm run build

# 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# **중요**: 첫 실행 시 DB 초기화 (서버 시작 후 실행)
# 1. 서버 시작 대기 (3-5초)
# 2. API 요청으로 DB 파일 생성 트리거
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","name":"Test"}'
# 3. DB 마이그레이션 스크립트 실행
node init-db.cjs

# 개발 서버 재시작
pm2 restart workout-together

# 로그 확인
pm2 logs workout-together --nostream

# 포트 정리
fuser -k 3000/tcp 2>/dev/null || true
```

### 프로덕션 배포
```bash
# Cloudflare API 키 설정 필요
npm run deploy:prod
```

## 🙏 참고한 플랫폼
- **Strava**: 운동 기록 및 소셜 피드
- **Garmin Connect**: 통계 및 데이터 분석
- **Suunto**: 운동 하이라이트
- **삼성헬스**: 체중 관리 및 통합 기록

---

**Last Updated**: 2025-11-16
**Version**: 1.0.0 (MVP)
**Tech Stack**: Hono + Cloudflare Workers + D1 + TailwindCSS
