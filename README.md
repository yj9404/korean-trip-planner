# 🇰🇷 Korea Trip Planner PWA

한국인 가족과 외국인 가족이 함께 사용하는 한국 여행 계획 PWA 웹앱

## 🎯 주요 기능

- **다국어 지원**: Gemini API를 활용한 실시간 번역
- **AI 여행 가이드**: Gemini API 기반 맞춤형 여행 추천
- **PWA**: 모바일 브라우저에서 앱처럼 설치 및 사용 가능
- **실시간 협업**: Firebase Firestore를 통한 가족 간 일정 공유
- **인증**: Firebase Authentication

## 🛠 기술 스택

### Backend
- **FastAPI** (Python 3.11+)
- **Firebase Admin SDK** (Firestore, Auth)
- **Google Gemini API** (AI 번역 및 가이드)

### Frontend
- **React** (Create React App)
- **Tailwind CSS** (스타일링)
- **Firebase SDK** (Client-side Auth, Firestore)
- **PWA** (Service Worker, Manifest)

### Hosting & Database
- **Firebase Hosting** (Static files)
- **Firebase Firestore** (Database)
- **Firebase Authentication** (사용자 인증)

## 📂 프로젝트 구조

```
KoreanTripPlanner/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py         # FastAPI 엔트리포인트
│   │   ├── config.py       # 설정 관리
│   │   ├── routers/        # API 라우트
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
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
│
├── .gitignore
└── README.md
```

## 🚀 시작하기

### Prerequisites
- Python 3.11+
- Node.js 18+
- Firebase 프로젝트 설정
- Google Cloud 프로젝트 (Gemini API)

### Backend 설정

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env 파일에 API 키 설정
uvicorn app.main:app --reload
```

### Frontend 설정

```bash
cd frontend
npm install
npm start
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
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
CORS_ORIGINS=http://localhost:3000,https://your-app.web.app
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
```

## 📱 PWA 기능

- ✅ 오프라인 지원 (Service Worker)
- ✅ 홈 화면에 추가
- ✅ 앱과 같은 경험
- ✅ 푸시 알림 (향후 지원)

## 🌐 주요 API 엔드포인트

- `POST /api/translate` - Gemini 기반 번역
- `POST /api/ai-guide` - AI 여행 가이드 추천
- `GET /api/trips` - 여행 계획 목록
- `POST /api/trips` - 새 여행 계획 생성
- `PUT /api/trips/{trip_id}` - 여행 계획 수정

## 👨‍👩‍👧‍👦 대상 사용자

- 한국인 가족
- 외국인 가족 (매형 가족)
- 함께 여행을 계획하고 공유하는 그룹

## 📄 라이선스

Private Project
