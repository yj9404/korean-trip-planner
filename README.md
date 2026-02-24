# 🇰🇷 Korea Trip Planner

> 한국인 가족과 외국인 가족이 함께 사용하는 한국 여행 도우미 PWA

---

## ✨ 기능

| 기능 | 설명 |
|---|---|
| 📅 **Itinerary** | 날짜별 일정 관리, 드래그앤드롭 순서 변경, 네이버 지도 연동 |
| 💬 **Group Chat** | 실시간 채팅 + Gemini AI 자동 번역 (KO↔EN) + 문화 키워드 AI 설명 |
| 📸 **Gallery** | 가족 공유 사진·영상 앨범, Google Drive 자동 백업 |
| 🧭 **AI Guide** | Gemini 기반 맞춤형 여행 추천 및 질문 응답 |
| 🌐 **Translation** | 독립형 한국어↔영어 실시간 번역기 |
| 🍽️ **Menu Scan** | 카메라로 한국어 메뉴 촬영 → Gemini AI 영문 번역 |
| 💱 **Currency Calculator** | 실시간 환율 기반 KRW → USD 계산기 |
| 👥 **Group Management** | 초대 링크 기반 가족 그룹, 최대 30장 사진 일괄 업로드 |

---

## 🛠 기술 스택

### Backend
- **FastAPI** (Python 3.11+) — REST API 서버
- **Firebase Admin SDK** — Firestore DB, Auth 토큰 검증
- **Google Gemini API** — 번역, AI 가이드, 채팅 봇, 메뉴 스캔
- **Google Drive API** — 사진/영상 클라우드 백업 (OAuth 2.0)
- **Google Cloud Run** — 컨테이너 서버리스 배포

### Frontend
- **React + Vite** — SPA 프레임워크
- **Tailwind CSS** — 스타일링
- **Firebase SDK** — 클라이언트 Auth, Firestore 실시간 구독
- **@dnd-kit** — 드래그앤드롭 일정 정렬
- **PWA** — Service Worker, 홈 화면 설치 지원
- **Firebase Hosting** — 정적 파일 CDN 배포

### Database / Auth / Storage
- **Firestore** — 채팅, 일정, 그룹 데이터 실시간 동기화
- **Firebase Authentication** — Google 소셜 로그인
- **로컬 파일 시스템 + Google Drive** — 미디어 저장 및 백업

---

## 📂 프로젝트 구조

```
KoreanTripPlanner/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 진입점
│   │   ├── config.py            # 환경변수 설정
│   │   ├── routers/             # API 라우터
│   │   │   ├── ai_guide.py
│   │   │   ├── chat.py
│   │   │   ├── groups.py
│   │   │   ├── itinerary.py
│   │   │   ├── media.py         # 갤러리 업로드/삭제
│   │   │   ├── menu_scan.py
│   │   │   └── translate.py
│   │   └── services/
│   │       ├── firebase_service.py
│   │       ├── gemini_service.py   # AI 번역, 키워드 탐지, 가이드
│   │       └── storage_service.py  # 로컬 저장 + Google Drive 백업
│   ├── scripts/
│   │   └── get_drive_token.py   # OAuth Refresh Token 발급 스크립트
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json        # PWA Manifest
│   │   └── service-worker.js
│   └── src/
│       ├── components/          # Layout, TaxiCardModal 등
│       ├── contexts/            # GroupContext
│       ├── pages/               # 각 기능 페이지
│       └── services/            # API 호출 서비스 레이어
│
├── firebase.json                # Firebase Hosting 설정
├── DEPLOY.md                    # 배포 가이드
├── SETUP.md                     # 로컬 개발 환경 설정 가이드
└── README.md
```

---

## 🚀 로컬 실행

> 상세 설정은 **[SETUP.md](./SETUP.md)** 참고

```powershell
# Backend
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
# .env 파일 설정 후
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Frontend (새 터미널)
cd frontend
npm install
npm run dev
```

---

## 🔑 주요 환경변수

### Backend (`backend/.env`)
```env
GEMINI_API_KEY=...
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json   # 로컬
FIREBASE_CREDENTIALS_JSON={"type":"service_account",...}  # 프로덕션(Cloud Run)
GOOGLE_DRIVE_FOLDER_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
CORS_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 🌐 주요 API 엔드포인트

| 라우터 | 경로 | 설명 |
|---|---|---|
| Translate | `POST /api/v1/translate` | KO↔EN 텍스트 번역 |
| AI Guide | `POST /api/v1/ai-guide/ask` | AI 여행 추천 |
| Chat | `POST /api/v1/chat/send` | 메시지 전송 + 자동 번역 |
| Itinerary | `GET/POST /api/v1/itinerary/places` | 일정 장소 관리 |
| Media | `POST /api/v1/media/upload` | 사진/영상 업로드 |
| Menu Scan | `POST /api/v1/menu-scan` | 메뉴 이미지 번역 |
| Groups | `GET /api/v1/groups/my-groups` | 내 그룹 목록 |

API 문서 (로컬): http://localhost:8000/docs

---

## � 배포

> 상세 배포 절차는 **[DEPLOY.md](./DEPLOY.md)** 참고

| 구성요소 | 플랫폼 | 명령어 |
|---|---|---|
| Frontend | Firebase Hosting | `npm run build` → `firebase deploy` |
| Backend | Google Cloud Run | `gcloud run deploy korean-trip-api --source .` |

---

## 👨‍👩‍👧‍👦 대상 사용자

한국인 가족과 외국인 가족이 함께 한국을 여행할 때 언어 장벽 없이 일정을 공유하고 소통할 수 있도록 만든 **Private PWA** 앱입니다.

---

## 📄 라이선스

Private Project — All rights reserved.
