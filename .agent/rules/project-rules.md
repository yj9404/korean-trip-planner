---
trigger: always_on
---

# Project Context & Rules: Korea Family Trip App

## 1. Project Overview
- **Goal:** A simple PWA web application for a family trip to Korea.
- **Users:** My family (Korean) and brother-in-law's family (Foreigners).
- **Core Value:** Utility, Stability, and Ease of Access (No installation required).

## 2. Tech Stack (Strict)
- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** Python FastAPI
- **Database:** Firebase Firestore (or SQLite for local dev)
- **Auth/Hosting:** Firebase
- **AI/API:** Google Gemini API (Translation, Chatbot), Google Drive API

## 3. Coding Principles (CRITICAL)
- **Simplicity First:** 코드는 최대한 단순하게, 파일 개수는 최소화해. 불필요하게 폴더를 나누거나 파일을 쪼개지 마. (Monolithic structure preferred over micro-optimization).
- **Standard Libraries:** 라이브러리는 가급적 Python/JS 표준 라이브러리나 가장 유명하고 안정적인 것(e.g., Requests, Axios)만 써. 실험적인 패키지는 절대 금지.
- **No Over-Engineering:** Design Pattern(DDD, Clean Architecture 등) 적용 금지. 그냥 `app.py` 하나에 다 넣어도 좋으니 직관적으로 짜.
- **Robustness:** 에러가 나면 앱이 죽지 말고 부드럽게 넘어가도록(Graceful degradation) 예외 처리를 꼼꼼히 해.

## 4. Key Features
1. **Chat:** Real-time translation (KO <-> EN) using Gemini.
2. **Maps:** Naver Map Deep-link integration (No Google Maps API for rendering).
3. **Taxi Card:** Large text address display for taxi drivers.
4. **Photos:** Google Drive API upload/view integration.

## 5. Deployment
- Frontend: `firebase deploy`
- Backend: `gcloud run deploy`