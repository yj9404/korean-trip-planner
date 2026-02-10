# 🇰🇷 Korea Trip Planner PWA

한국인 가족과 외국인 가족이 함께 사용하는 한국 여행 계획 PWA 웹앱

## 🎯 주요 기능

- **AI 번역 채팅**: 실시간 자동 번역 채팅 (KO↔EN) + AI 봇 설명
- **다국어 지원**: Gemini API를 활용한 실시간 번역
- **AI 여행 가이드**: Gemini API 기반 맞춤형 여행 추천
- **PWA**: 모바일 브라우저에서 앱처럼 설치 및 사용 가능
- **실시간 협업**: Firebase Firestore를 통한 가족 간 일정 공유
- **인증**: Firebase Authentication

## 🛠 기술 스택

### Backend
- **FastAPI** (Python 3.11+)
- **Firebase Admin SDK** (Firestore, Auth)
- **Google Gemini API** (AI 번역, 가이드, 채팅 봇)

### Frontend
- **React** (Vite)
- **Tailwind CSS** (스타일링)
- **Firebase SDK** (Client-side Auth, Firestore)
- **PWA** (Service Worker, Manifest)

### Hosting & Database
- **Firebase Hosting** (Static files)
- **Firebase Firestore** (Database, Real-time Chat)
- **Firebase Authentication** (사용자 인증)

## 📂 프로젝트 구조

```
KoreanTripPlanner/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py         # FastAPI 엔트리포인트
│   │   ├── config.py       # 설정 관리
│   │   ├── routers/        # API 라우트 (trips, chat, ai_guide, translate)
│   │   ├── services/       # 비즈니스 로직 (Gemini, Firebase)
│   │   └── models/         # 데이터 모델
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                # React 프론트엔드
│   ├── public/
│   │   ├── manifest.json   # PWA Manifest
│   │   ├── service-worker.js  # Service Worker
│   │   └── icons/          # PWA 아이콘
│   ├── src/
│   │   ├── components/     # 재사용 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── services/       # API 및 Firebase 서비스
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
├── README.md
├── SETUP.md               # 상세 설정 가이드
└── ENV_SETUP.md           # 환경 변수 가이드
```

## 🚀 시작하기

### Prerequisites
- Python 3.11+
- Node.js 18+
- Firebase 프로젝트 설정
- Google Cloud 프로젝트 (Gemini API)

### Backend 설정

```powershell
cd backend
python -m venv venv

# Windows에서 venv 활성화 문제 시:
.\venv\Scripts\python.exe -m pip install -r requirements.txt

# 실행
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

### Frontend 설정

```powershell
cd frontend
npm install
npm run dev
```

### PWA 빌드 및 배포

```bash
cd frontend
npm run build
firebase deploy
```

## 🔑 환경 변수

### Backend (.env)
```
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'  # 프로덕션용
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json        # 로컬용
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

**📖 상세 설정 방법**: [ENV_SETUP.md](./ENV_SETUP.md) 참조
- 로컬 환경 변수 설정 (Windows)
- GitHub Secrets 설정
- Firebase Credentials 관리

## 📱 PWA 기능

- ✅ 오프라인 지원 (Service Worker)
- ✅ 홈 화면에 추가
- ✅ 앱과 같은 경험
- ✅ 푸시 알림 (향후 지원)

## 🌐 주요 API 엔드포인트

### Translation & AI
- `POST /api/v1/translate` - Gemini 기반 번역
- `POST /api/v1/ai-guide` - AI 여행 가이드 추천

### Trips
- `GET /api/v1/trips` - 여행 계획 목록
- `POST /api/v1/trips` - 새 여행 계획 생성
- `PUT /api/v1/trips/{trip_id}` - 여행 계획 수정

### Chat (NEW 🆕)
- `POST /api/v1/chat/rooms` - 채팅방 생성
- `GET /api/v1/chat/rooms/{room_id}/messages` - 메시지 조회
- `POST /api/v1/chat/rooms/{room_id}/messages` - 메시지 전송 (AI 봇 자동 응답)
- `POST /api/v1/chat/translate` - 메시지 번역
- `GET/PUT /api/v1/chat/preferences/{user_id}` - 사용자 설정 (언어, AI 봇)

## 💬 AI 번역 채팅 기능

- **실시간 채팅**: Firestore를 통한 실시간 메시지 동기화
- **자동 번역**: 사용자 언어 설정(KO/EN)에 따라 실시간 자동 번역
- **AI 봇**: 한국 음식, 장소, 문화 키워드 감지 시 자동 설명 제공
- **사용자별 설정**: 언어 및 AI 봇 on/off 개별 관리

## 👨‍👩‍👧‍👦 대상 사용자

- 한국인 가족
- 외국인 가족 (매형 가족)
- 함께 여행을 계획하고 공유하는 그룹

## 📄 라이선스

Private Project
