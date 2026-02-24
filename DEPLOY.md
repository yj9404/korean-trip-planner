# 🚀 Korea Trip Planner — 배포 가이드 (v1.0.0)

## 아키텍처

```
[사용자 브라우저]
      │
      ├── Frontend (PWA)  → Firebase Hosting
      │                       https://your-project.web.app
      │
      └── Backend API     → Google Cloud Run
                              https://your-service-***.run.app
```

---

## 1단계: 사전 준비

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Google Cloud SDK 설치 (gcloud)
# https://cloud.google.com/sdk/docs/install

# 로그인
firebase login
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
```

---

## 2단계: Backend → Google Cloud Run

### 2-1. 환경변수 준비 (Secret Manager 권장)

Cloud Run 배포 전, 환경변수를 정리합니다.

**필수 환경변수:**
```
GEMINI_API_KEY=...
FIREBASE_CREDENTIALS_JSON={"type":"service_account",...}   ← JSON 전체를 문자열로
GOOGLE_DRIVE_FOLDER_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
CORS_ORIGINS=https://your-project.web.app
DEBUG=False
```

> ⚠️ **주의**: Cloud Run에서는 파일 시스템이 임시적입니다.
> `FIREBASE_CREDENTIALS_JSON` (JSON 문자열)을 사용하고
> `FIREBASE_CREDENTIALS_PATH`는 사용하지 마세요.

### 2-2. Cloud Run 배포

```bash
cd backend

# Docker 이미지 빌드 + Cloud Run에 직접 배포 (소스 배포)
gcloud run deploy korean-trip-api \
  --source . \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="your_key" \
  --set-env-vars FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}' \
  --set-env-vars GOOGLE_DRIVE_FOLDER_ID="your_folder_id" \
  --set-env-vars GOOGLE_CLIENT_ID="your_client_id" \
  --set-env-vars GOOGLE_CLIENT_SECRET="your_client_secret" \
  --set-env-vars GOOGLE_REFRESH_TOKEN="your_refresh_token" \
  --set-env-vars CORS_ORIGINS="https://YOUR_PROJECT.web.app" \
  --set-env-vars DEBUG="False" \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 3
```

배포 완료 후 출력되는 URL을 복사합니다.
예: `https://korean-trip-api-xxxxxxxx-an.a.run.app`

### 2-3. 환경변수 업데이트 방법 (재배포 없이)

```bash
gcloud run services update korean-trip-api \
  --region asia-northeast3 \
  --set-env-vars KEY=VALUE
```

---

## 3단계: Frontend → Firebase Hosting

### 3-1. frontend/.env 프로덕션 설정

`frontend/.env.production` 파일 생성 (또는 `.env` 수정):

```env
VITE_API_URL=https://korean-trip-api-xxxxxxxx-an.a.run.app
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3-2. Firebase 프로젝트 연결

```bash
# 프로젝트 루트에서
firebase use YOUR_FIREBASE_PROJECT_ID
```

### 3-3. 빌드 & 배포

```bash
# Frontend 빌드
cd frontend
npm run build

# 프로젝트 루트로 돌아와서
cd ..
firebase deploy --only hosting
```

배포 후 URL: `https://your-project.web.app`

---

## 4단계: Firebase 인증 도메인 추가

Firebase Console → Authentication → Settings → Authorized domains에
배포된 도메인(`your-project.web.app`)이 포함되어 있는지 확인합니다.
(기본으로 포함되어 있어야 합니다)

---

## 5단계: 배포 후 확인

```bash
# Backend 헬스체크
curl https://korean-trip-api-xxxxxxxx-an.a.run.app/health

# 로그 확인
gcloud run logs tail korean-trip-api --region asia-northeast3
```

---

## 이후 버전 배포 워크플로

```bash
# 1. 코드 수정 및 커밋
git add .
git commit -m "feat: ..."

# 2. 버전 태그
git tag -a v1.1.0 -m "v1.1.0 - 기능 추가 설명"
git push origin main --tags

# 3. Backend 재배포 (변경 시)
cd backend
gcloud run deploy korean-trip-api --source . --region asia-northeast3

# 4. Frontend 재배포 (변경 시)
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

---

## 요금 안내 (참고)

| 서비스 | 무료 범위 |
|---|---|
| Firebase Hosting | 10GB/월 전송, 1GB 저장 |
| Cloud Run | 200만 요청/월, 360,000 vCPU-초 |
| Firestore | 50,000 읽기, 20,000 쓰기/일 |
| Gemini API | 분당 15 요청 (Flash 무료) |

소규모 가족 여행 앱이라면 **모두 무료 범위 내**에서 운영 가능합니다.

---

## 문제 해결

### Cloud Run이 시작되지 않음
```bash
gcloud run logs read korean-trip-api --region asia-northeast3
```
- `FIREBASE_CREDENTIALS_JSON` 환경변수가 올바른 JSON 문자열인지 확인
- `CORS_ORIGINS`에 Firebase Hosting URL이 포함되어 있는지 확인

### Frontend에서 API 호출 실패
- `VITE_API_URL`이 Cloud Run URL과 일치하는지 확인
- CORS 에러: Cloud Run의 `CORS_ORIGINS`에 프론트 URL 추가 후 재배포

### 업로드 파일이 사라짐
- Cloud Run은 파일 시스템이 임시적 → Google Drive 업로드가 정상 작동하는지 확인
- OAuth Refresh Token 유효성 확인
