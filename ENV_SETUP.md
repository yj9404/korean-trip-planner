# 🔐 환경 변수 설정 가이드

이 가이드는 로컬 개발 환경과 GitHub (CI/CD, Production)에서 환경 변수를 설정하는 방법을 설명합니다.

---

## 📋 목차

1. [로컬 환경 변수 설정 (Windows)](#로컬-환경-변수-설정-windows)
2. [GitHub Secrets 설정](#github-secrets-설정)
3. [필요한 환경 변수 목록](#필요한-환경-변수-목록)
4. [Firebase Credentials 설정](#firebase-credentials-설정)

---

## 🖥 로컬 환경 변수 설정 (Windows)

### 방법 1: .env 파일 사용 (권장 - 개발 환경)

가장 간단한 방법입니다. 프로젝트 루트에 `.env` 파일을 생성합니다.

#### Backend 환경 변수

```powershell
# backend 폴더에서
cd backend
cp .env.example .env
```

`.env` 파일 편집:
```bash
# Google Gemini API
GEMINI_API_KEY=your_actual_gemini_api_key

# Firebase (로컬 개발용 - 파일 경로 방식)
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# CORS Settings
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Server Settings
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

Firebase 서비스 계정 키 파일을 `backend/firebase-credentials.json`에 저장하세요.

#### Frontend 환경 변수

```powershell
# frontend 폴더에서
cd frontend
cp .env.example .env
```

`.env` 파일 편집:
```bash
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 방법 2: Windows 시스템 환경 변수

영구적으로 설정하려면:

1. **시스템 속성 열기**
   ```powershell
   # PowerShell에서 실행
   rundll32 sysdm.cpl,EditEnvironmentVariables
   ```

2. **사용자 변수 또는 시스템 변수에 추가**
   - "새로 만들기" 클릭
   - 변수 이름: `GEMINI_API_KEY`
   - 변수 값: `your_api_key`
   - 모든 필요한 변수에 대해 반복

3. **변경 사항 적용**
   - PowerShell을 다시 시작하여 변경 사항 적용

### 방법 3: PowerShell 세션 환경 변수

현재 세션에만 적용 (테스트용):

```powershell
# PowerShell
$env:GEMINI_API_KEY="your_api_key"
$env:FIREBASE_CREDENTIALS_PATH="./firebase-credentials.json"
```

---

## 🔒 GitHub Secrets 설정

GitHub Actions, Cloud Run 등 프로덕션 환경에서 사용합니다.

### 1. Repository Secrets 추가

1. GitHub 저장소 페이지 접속
2. **Settings** > **Secrets and variables** > **Actions** 클릭
3. **New repository secret** 클릭

### 2. 필요한 Secrets 추가

#### Backend Secrets

| Secret Name | 설명 | 예시 |
|------------|------|------|
| `GEMINI_API_KEY` | Google Gemini API 키 | `AIzaSyC...` |
| `FIREBASE_CREDENTIALS_JSON` | Firebase 서비스 계정 JSON (전체 내용) | `{"type":"service_account",...}` |
| `CORS_ORIGINS` | 허용할 CORS 오리진 | `https://your-app.web.app` |

**중요**: `FIREBASE_CREDENTIALS_JSON`는 Firebase 서비스 계정 JSON 파일의 **전체 내용**을 복사하여 붙여넣습니다.

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

#### Frontend Secrets (Firebase Config)

| Secret Name | 설명 |
|------------|------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |

### 3. GitHub Actions에서 사용 예시

`.github/workflows/deploy.yml` 파일 예시:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Cloud Run
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          FIREBASE_CREDENTIALS_JSON: ${{ secrets.FIREBASE_CREDENTIALS_JSON }}
          CORS_ORIGINS: ${{ secrets.CORS_ORIGINS }}
        run: |
          # Deploy commands here
          gcloud run deploy korea-trip-api \
            --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY \
            --set-env-vars FIREBASE_CREDENTIALS_JSON=$FIREBASE_CREDENTIALS_JSON
```

---

## 📝 필요한 환경 변수 목록

### Backend 환경 변수

| 변수명 | 필수 | 설명 | 기본값 |
|--------|------|------|--------|
| `GEMINI_API_KEY` | ✅ 필수 | Google Gemini API 키 | - |
| `FIREBASE_CREDENTIALS_JSON` | ⚠️ 선택* | Firebase 서비스 계정 JSON (프로덕션용) | - |
| `FIREBASE_CREDENTIALS_PATH` | ⚠️ 선택* | Firebase 서비스 계정 파일 경로 (로컬용) | `./firebase-credentials.json` |
| `CORS_ORIGINS` | ✅ 필수 | CORS 허용 오리진 (쉼표 구분) | `http://localhost:3000` |
| `API_VERSION` | 선택 | API 버전 | `v1` |
| `DEBUG` | 선택 | 디버그 모드 | `True` |
| `HOST` | 선택 | 서버 호스트 | `0.0.0.0` |
| `PORT` | 선택 | 서버 포트 | `8000` |

*Firebase credentials는 `FIREBASE_CREDENTIALS_JSON` 또는 `FIREBASE_CREDENTIALS_PATH` 중 하나는 필수입니다.

### Frontend 환경 변수

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `VITE_API_URL` | ✅ 필수 | Backend API URL |
| `VITE_FIREBASE_API_KEY` | ✅ 필수 | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ 필수 | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | ✅ 필수 | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ 필수 | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ 필수 | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ 필수 | Firebase App ID |

---

## 🔥 Firebase Credentials 설정

### 로컬 개발 환경

1. **Firebase Console에서 서비스 계정 키 다운로드**
   - Firebase Console → Project Settings → Service Accounts
   - "Generate New Private Key" 클릭
   - JSON 파일 다운로드

2. **파일을 프로젝트에 저장**
   ```powershell
   # 다운로드한 파일을 backend 폴더로 복사
   cp ~/Downloads/your-project-firebase-adminsdk.json backend/firebase-credentials.json
   ```

3. **.env 파일 설정**
   ```bash
   FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
   ```

### GitHub / 프로덕션 환경

1. **서비스 계정 JSON 파일 내용 복사**
   ```powershell
   # 파일 내용을 클립보드에 복사
   Get-Content backend/firebase-credentials.json | Set-Clipboard
   ```

2. **GitHub Secret에 추가**
   - Secret name: `FIREBASE_CREDENTIALS_JSON`
   - Secret value: JSON 파일 전체 내용 붙여넣기

3. **환경 변수로 사용**
   - Backend 코드가 자동으로 `FIREBASE_CREDENTIALS_JSON` 환경 변수를 감지하여 사용합니다.

---

## ✅ 환경 변수 확인

### Backend 확인

```powershell
cd backend
.\venv\Scripts\activate
python -c "from app.config import settings; print(f'Gemini API: {settings.gemini_api_key[:10]}...')"
```

### 서버 Health Check

```powershell
# Backend 실행 후
Invoke-WebRequest http://localhost:8000/health | Select-Object -Expand Content
```

응답 예시:
```json
{
  "status": "healthy",
  "firebase": true,
  "gemini": true
}
```

---

## 🚨 보안 주의사항

1. **절대 커밋하지 마세요**
   - `.env` 파일
   - `firebase-credentials.json` 파일
   - API 키가 포함된 파일
   
   (이미 `.gitignore`에 포함되어 있습니다)

2. **API 키 노출 시 즉시 재생성**
   - Gemini API: Google AI Studio에서 재생성
   - Firebase: Firebase Console에서 재생성

3. **최소 권한 원칙**
   - Firebase 서비스 계정은 필요한 권한만 부여
   - API 키는 필요한 서비스만 활성화

---

## 📚 추가 리소스

- [Firebase Admin SDK 설정](https://firebase.google.com/docs/admin/setup)
- [Google Gemini API](https://ai.google.dev/docs)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vite 환경 변수](https://vitejs.dev/guide/env-and-mode.html)

---

문제가 발생하면 `SETUP.md`의 문제 해결 섹션을 참조하세요.
