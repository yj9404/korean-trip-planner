# PWA 아이콘 생성 가이드

## 📝 개요

이 폴더에는 PWA(Progressive Web App) 아이콘 이미지들이 저장됩니다.

## 🎨 필요한 아이콘 크기

다음 크기의 PNG 이미지를 생성해야 합니다:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## 🛠 아이콘 생성 방법

### 옵션 1: 온라인 도구 사용 (추천)

1. **PWA Builder Image Generator**
   - URL: https://www.pwabuilder.com/imageGenerator
   - 512x512 이미지 업로드
   - 모든 크기 자동 생성

2. **Real Favicon Generator**
   - URL: https://realfavicongenerator.net/
   - 이미지 업로드
   - PWA 아이콘 선택

### 옵션 2: 수동 생성

512x512 원본 이미지를 만들고 각 크기로 리사이즈:

**온라인 리사이즈 도구:**
- https://www.iloveimg.com/resize-image
- https://imageresizer.com/

**로컬 도구:**
- Photoshop, GIMP, Affinity Designer 등

## 🎨 디자인 가이드라인

### 색상
- Primary: #4F46E5 (Indigo)
- Secondary: #9333EA (Purple)
- 그라데이션 사용 권장

### 스타일
- 모던하고 미니멀한 디자인
- 한국적 요소 포함 (한글 곡선, 전통 문양 등)
- 지도/위치 마커 모티브
- 작은 크기에서도 식별 가능해야 함

### 포맷
- PNG 형식
- 투명 배경 또는 단색 배경
- 정사각형 (1:1 비율)

## 📱 테스트

아이콘 생성 후:
1. `npm run dev`로 개발 서버 실행
2. 브라우저 DevTools > Application > Manifest 확인
3. 모바일에서 "홈 화면에 추가" 테스트

## 💡 임시 방법

개발 중에는 단순한 단색 아이콘이나 텍스트 기반 아이콘도 사용 가능합니다.
배포 전에 전문적인 아이콘으로 교체하세요.
