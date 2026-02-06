---
trigger: always_on
---

1. 커밋 메시지 규칙 (Commit Message Convention)
기본적으로 Conventional Commits 스타일을 따르되, 단순함을 유지합니다.

메시지 구조
<type>: <description>

[optional body]

2. Type 종류
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정 (README, 주석 등)
style: 코드 의미에 영향을 주지 않는 변경 (포맷팅, 세미콜론 누락 등)
refactor: 코드 리팩토링 (기능 변화 없음)
chore: 빌드 업무, 패키지 매니저 설정, 단순 파일 이동 등
test: 테스트 코드 추가 및 수정

3. 작성 지침
제목은 50자 이내로 핵심만 작성합니다.
문장 끝에 마침표(.)를 붙이지 않습니다.
과거형 대신 명령형을 사용합니다. (예: Fixed -> Fix, 추가했음 -> 추가)
영어, 한글 자유롭게 사용 가능합니다.