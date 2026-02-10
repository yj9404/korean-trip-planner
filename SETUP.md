# 🚀 Korea Trip Planner - Setup Guide

## 📋 사전 요구사항

### 필수 소프트웨어
- **Python 3.11+** - Backend 개발
- **Node.js 18+** - Frontend 개발
- **Git** - 버전 관리

### 필요한 계정
1. **Firebase Project** (https://console.firebase.google.com/)
   - Authentication 활성화 (Email/Password, Google)
   - Firestore Database 생성
   - Firebase Admin SDK 키 다운로드

2. **Google Cloud Project** (https://console.cloud.google.com/)
   - Gemini API 활성화
   - API 키 생성

---

## 🔧 Backend 설정

### 1. Python 가상환경 생성

```powershell
cd backend
python -m venv venv
```

**Windows PowerShell 활성화 문제 해결:**
```powershell
# 활성화 스크립트가 차단되는 경우, venv의 Python을 직접 사용하세요:
.\venv\Scripts\python.exe -m pip install --upgrade pip
```

### 2. 패키지 설치

```powershell
# Windows에서 권장하는 방법:
.\venv\Scripts\python.exe -m pip install -r requirements.txt

# 또는 venv가 활성화된 경우:
pip install -r requirements.txt
```

### 3. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 수정:

```powershell
cp .env.example .env
```

`.env` 파일 내용:
```env
# Google Gemini API
GEMINI_API_KEY=your_actual_gemini_api_key

# Firebase Admin SDK
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# CORS Settings
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Server Settings
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

### 4. Firebase Admin SDK 키 설정

Firebase Console에서 다운로드한 서비스 계정 키를 `backend/firebase-credentials.json`에 저장

### 5. Backend 실행

```powershell
# Windows 권장 방법 (venv 활성화 없이):
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 또는 venv가 활성화된 경우:
uvicorn app.main:app --reload

# 또는:
python -m app.main
```

Backend API: http://localhost:8000
API 문서: http://localhost:8000/docs

---

## 💻 Frontend 설정

### 1. 새 터미널에서 frontend 폴더로 이동

```powershell
cd frontend
```

### 2. 패키지 설치

```powershell
npm install
```

### 3. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 수정:

```powershell
cp .env.example .env
```

`.env` 파일 내용:
```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

Firebase 설정 정보는 Firebase Console > Project Settings > General > Your apps에서 확인 가능

### 4. PWA 아이콘 생성

`frontend/public/icons/` 폴더에 다음 크기의 아이콘 이미지를 준비:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

**아이콘 생성 도구**: 
- https://www.pwabuilder.com/imageGenerator
- https://realfavicongenerator.net/

### 5. Frontend 실행

```powershell
npm run dev
```

Frontend App: http://localhost:3000

---

## 🧪 테스트

### Backend API 테스트

1. http://localhost:8000/docs 접속
2. `/health` 엔드포인트 테스트
3. `/api/v1/translate` 테스트 (인증 불필요)

### Frontend 테스트

1. http://localhost:3000 접속
2. 회원가입/로그인 테스트
3. 각 기능 페이지 테스트:
   - Dashboard
   - Trips (여행 계획 생성/조회)
   - AI Guide
   - Translate

---

## 📱 PWA 설치 테스트 (로컬)

PWA는 HTTPS 또는 localhost에서만 동작합니다.

### 1. 프로덕션 빌드

```powershell
cd frontend
npm run build
```

### 2. 프리뷰 서버 실행

```powershell
npm run preview
```

### 3. 브라우저에서 테스트

- Chrome/Edge: 주소창 오른쪽의 "설치" 아이콘 클릭
- Safari (iOS): 공유 버튼 > "홈 화면에 추가"
- Android: 메뉴 > "홈 화면에 추가"

---

## 🚀 Firebase Hosting 배포

### 1. Firebase CLI 설치

```powershell
npm install -g firebase-tools
```

### 2. Firebase 로그인

```powershell
firebase login
```

### 3. Firebase 초기화

```powershell
# 프로젝트 루트에서
firebase init

# 선택사항:
# - Hosting
# - Firestore (선택사항)
# - Authentication (선택사항)

# Public directory: frontend/build
# Single-page app: Yes
# Set up automatic builds: No
```

### 4. Frontend 빌드

```powershell
cd frontend
npm run build
```

### 5. 배포

```powershell
# 프로젝트 루트에서
firebase deploy
```

배포 완료 후 제공되는 URL로 접속 가능

---

## 🔐 보안 설정

### Firebase Security Rules

Firestore Security Rules (Firebase Console):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trips/{tripId} {
      allow read: if request.auth != null && 
        (resource.data.created_by == request.auth.uid || 
         request.auth.uid in resource.data.participants);
      allow create: if request.auth != null && 
        request.resource.data.created_by == request.auth.uid;
      allow update, delete: if request.auth != null && 
        resource.data.created_by == request.auth.uid;
    }
  }
}
```

---

## 🐛 문제 해결

### Backend가 시작되지 않음

1. Python 버전 확인: `python --version` (3.11+ 필요)
2. 가상환경 활성화 확인
3. `.env` 파일 존재 및 내용 확인
4. `firebase-credentials.json` 파일 존재 확인

### Frontend가 시작되지 않음

1. Node.js 버전 확인: `node --version` (18+ 필요)
2. `node_modules` 삭제 후 재설치: `rm -rf node_modules && npm install`
3. `.env` 파일 존재 및 내용 확인

### CORS 에러

1. Backend `.env`의 `CORS_ORIGINS`에 Frontend URL 포함 확인
2. Backend 재시작

### Firebase 인증 에러

1. Firebase Console에서 Authentication 방법 활성화 확인
2. Frontend `.env`의 Firebase 설정 확인
3. 브라우저 콘솔에서 에러 메시지 확인

---

## 📖 추가 리소스

- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [React 문서](https://react.dev/)
- [Firebase 문서](https://firebase.google.com/docs)
- [Gemini API 문서](https://ai.google.dev/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [PWA 가이드](https://web.dev/progressive-web-apps/)

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 터미널의 에러 메시지
2. 브라우저 개발자 도구 콘솔
3. Backend API 문서 (http://localhost:8000/docs)

Happy Coding! 🎉
