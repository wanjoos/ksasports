# Cloudflare Pages 배포 가이드

## 🚀 배포 전 준비사항

### 1. Cloudflare API 키 설정
1. Cloudflare 계정이 없다면 [cloudflare.com](https://cloudflare.com)에서 가입
2. 대시보드 → My Profile → API Tokens
3. "Create Token" 클릭
4. "Edit Cloudflare Workers" 템플릿 선택
5. 생성된 API 키 복사
6. **#Deploy 탭**에서 API 키 설정

### 2. 필요한 Cloudflare 서비스

#### D1 데이터베이스 (SQLite)
```bash
# 프로덕션 D1 데이터베이스 생성
npx wrangler d1 create workout-together-db

# 출력된 database_id를 wrangler.jsonc에 입력
# "d1_databases": [
#   {
#     "binding": "DB",
#     "database_name": "workout-together-db",
#     "database_id": "여기에-실제-ID-입력"
#   }
# ]

# 마이그레이션 적용 (프로덕션)
npx wrangler d1 migrations apply workout-together-db
```

#### R2 버킷 (이미지 저장소)
```bash
# R2 버킷 생성
npx wrangler r2 bucket create workout-images

# wrangler.jsonc에 이미 설정되어 있음:
# "r2_buckets": [
#   {
#     "binding": "R2",
#     "bucket_name": "workout-images"
#   }
# ]
```

### 3. 배포 프로세스

#### Step 1: Cloudflare API 키 확인
```bash
npx wrangler whoami
```

#### Step 2: 빌드
```bash
npm run build
```

#### Step 3: Pages 프로젝트 생성
```bash
npx wrangler pages project create workout-together \
  --production-branch main \
  --compatibility-date 2024-01-01
```

#### Step 4: 배포
```bash
npx wrangler pages deploy dist --project-name workout-together
```

### 4. 배포 후 설정

#### 환경 변수 (선택사항)
```bash
# JWT 시크릿 키 설정 (프로덕션에서는 변경 권장)
npx wrangler pages secret put JWT_SECRET --project-name workout-together
```

#### 커스텀 도메인 연결 (선택사항)
```bash
npx wrangler pages domain add yourdomain.com --project-name workout-together
```

## 📊 배포 후 확인사항

### 1. 데이터베이스 연결 확인
- 회원가입 테스트
- 운동 기록 생성 테스트

### 2. 이미지 업로드 확인
- 운동 기록에 이미지 첨부 테스트
- 이미지 표시 확인

### 3. 모든 기능 테스트
- [ ] 회원가입/로그인
- [ ] 운동 기록 CRUD
- [ ] 이미지 업로드
- [ ] 좋아요/댓글
- [ ] 통계 조회
- [ ] 체중 관리
- [ ] 프로필 수정

## 🔧 트러블슈팅

### 데이터베이스 오류
```bash
# 마이그레이션 재적용
npx wrangler d1 migrations apply workout-together-db

# 데이터베이스 초기화 (주의: 데이터 삭제됨)
npx wrangler d1 migrations apply workout-together-db --force
```

### 이미지 업로드 오류
```bash
# R2 버킷 권한 확인
npx wrangler r2 bucket list

# 버킷 재생성
npx wrangler r2 bucket delete workout-images
npx wrangler r2 bucket create workout-images
```

### 배포 오류
```bash
# 빌드 재시도
rm -rf dist
npm run build

# 배포 재시도
npx wrangler pages deploy dist --project-name workout-together
```

## 💡 유용한 명령어

### 로그 확인
```bash
npx wrangler pages deployment tail --project-name workout-together
```

### 배포 목록 확인
```bash
npx wrangler pages deployment list --project-name workout-together
```

### 프로젝트 삭제
```bash
npx wrangler pages project delete workout-together
```

## 🌐 접속 URL

배포 완료 후 다음 URL로 접속 가능:
- **프로덕션**: `https://workout-together.pages.dev`
- **프리뷰**: `https://[commit-hash].workout-together.pages.dev`

## 📝 주의사항

1. **무료 플랜 제한**
   - 요청: 100,000건/일
   - D1: 5GB 저장 / 500만 읽기/일
   - R2: 10GB 저장 / 100만 읽기/일

2. **데이터 백업**
   - 정기적으로 데이터베이스 백업 권장
   - `npx wrangler d1 execute workout-together-db --command="SELECT * FROM users" > backup.sql`

3. **보안**
   - JWT_SECRET을 프로덕션 환경 변수로 설정
   - 민감한 정보는 절대 코드에 포함하지 말 것

4. **모니터링**
   - Cloudflare 대시보드에서 사용량 확인
   - 에러 로그 정기 확인

---

**참고 문서**:
- [Cloudflare Pages 공식 문서](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler/)
- [D1 데이터베이스 문서](https://developers.cloudflare.com/d1/)
- [R2 스토리지 문서](https://developers.cloudflare.com/r2/)
