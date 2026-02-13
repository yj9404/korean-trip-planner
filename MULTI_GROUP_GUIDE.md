# Multi-Group System - Implementation Guide

## 개요
이제 앱에서 여러 그룹을 생성하고 참여할 수 있습니다. 각 그룹은 독립적인 채팅, 일정, 사진 등을 가집니다.

## 주요 기능

### 1. 그룹 생성 (Create Group)
- 로그인 후 그룹이 없으면 자동으로 온보딩 화면 표시
- 그룹 이름 입력하여 생성
- 생성자는 자동으로 OWNER 권한 획득
- 6자리 초대 코드 자동 생성 (예: `AB12CD`)

### 2. 그룹 가입 (Join Group)
- 초대 코드 입력하여 가입 요청
- 상태: `PENDING` (승인 대기)
- OWNER가 승인하면 `ACTIVE`로 변경되어 그룹 접근 가능

### 3. 그룹 전환 (Switch Group)
- 헤더의 GroupSwitcher 드롭다운 사용
- 여러 그룹에 속해 있으면 클릭 한 번으로 전환 가능
- 전환 후 페이지 새로고침되어 새 그룹 데이터 로드

### 4. 멤버 승인 (Approve Members) - OWNER만
- `/groups/pending-members` API로 대기 중인 멤버 확인
- `/groups/approve-member` API로 승인 또는 거절

## API 엔드포인트

### 그룹 관리
- `POST /api/v1/groups/create` - 그룹 생성
- `POST /api/v1/groups/join` - 초대 코드로 가입 요청
- `GET /api/v1/groups/my-groups` - 내가 속한 그룹 목록 (ACTIVE만)
- `POST /api/v1/groups/switch/{group_id}` - 그룹 전환
- `GET /api/v1/groups/current` - 현재 그룹 정보
- `GET /api/v1/groups/pending-members` - 승인 대기 멤버 (OWNER만)
- `POST /api/v1/groups/approve-member` - 멤버 승인/거절 (OWNER만)

## 데이터베이스 스키마

### Firestore Collections

#### `groups`
```
{
  id: string (auto-generated)
  name: string
  owner_id: string (Firebase UID)
  invite_code: string (6자리 영숫자)
  created_at: timestamp
}
```

#### `group_members`
```
{
  id: string (auto-generated)
  group_id: string
  user_id: string (Firebase UID)
  role: "OWNER" | "MEMBER"
  status: "PENDING" | "ACTIVE"
  joined_at: timestamp
}
```

#### `user_preferences` (업데이트)
```
{
  user_id: string
  current_group_id: string  // NEW: 현재 보고 있는 그룹
  preferred_lang: "ko" | "en"
  ai_bot_enabled: boolean
  korean_name: string
  english_name: string
  display_name: string
}
```

#### `chat_rooms`, `messages`, `places` (업데이트 필요)
- `group_id` 필드 추가 예정
- 현재는 user_id 기반으로 동작

## 보안 규칙 (Firestore Rules)

- **Groups**: ACTIVE 멤버만 읽기, OWNER만 수정/삭제
- **Group Members**: 누구나 가입 요청, OWNER만 승인
- **Chat/Places**: ACTIVE 멤버만 접근 (구현 예정)

## 남은 작업 (TODO)

### 백엔드
1. ✅ 그룹 모델 및 라우터 생성
2. ✅ Firebase Service에 그룹 관리 메서드 추가
3. ✅ `get_current_group` 의존성 추가
4. ✅ 기존 라우터(chat, places, itinerary)에 group_id 필터링 추가
5. ✅ Firebase Service의 메시지/장소 메서드에 group_id 파라미터 추가

### 프론트엔드
1. ✅ OnboardingPage 생성
2. ✅ GroupContext & GroupSwitcher 생성
3. ✅ App.jsx에 그룹 체크 로직 추가
4. ⏳ 각 페이지(Chat, Itinerary 등)에서 group_id 사용 (API 연동으로 자동 해결됨)
5. ⏳ 멤버 승인 UI (OWNER용 관리 페이지)

### Firestore Rules
1. ✅ 기본 그룹 보안 규칙 추가
2. ⏳ Chat/Places에 group_id 체크 활성화 (데이터 마이그레이션 후)

## 사용 플로우 예시

### 시나리오 1: 새 사용자 (그룹 생성)
1. 로그인
2. OnboardingPage 표시 (그룹이 없음)
3. "Create New Group" 클릭
4. 그룹 이름 입력 (예: "Seoul Trip 2026")
5. 그룹 생성 → OWNER/ACTIVE 상태로 자동 추가
6. Dashboard로 이동

### 시나리오 2: 초대받은 사용자 (그룹 가입)
1. 로그인
2. OnboardingPage 표시
3. "Join with Code" 클릭
4. 초대 코드 입력 (예: "AB12CD")
5. 가입 요청 제출 → PENDING 상태
6. "Waiting for Approval" 화면 표시
7. OWNER가 승인하면 → ACTIVE 상태로 변경
8. 재로그인 후 Dashboard 접근 가능

### 시나리오 3: 여러 그룹 사용
1. 이미 "Seoul Trip" 그룹의 멤버
2. 새로운 "Busan Trip" 초대받음
3. 코드 입력 → 승인 → 두 그룹 모두 ACTIVE
4. 헤더의 GroupSwitcher 클릭
5. "Busan Trip" 선택 → 페이지 새로고침
6. Busan Trip 관련 데이터만 보임

## 개발 팁

### 의존성 주입 패턴
```python
# 기존 엔드포인트
@router.get("/messages")
async def get_messages(current_user: dict = Depends(get_current_user)):
    ...

# 그룹 필터링 추가
@router.get("/messages")
async def get_messages(
    current_user: dict = Depends(get_current_user),
    group_id: str = Depends(get_current_group)  # 자동으로 검증됨
):
    # group_id는 자동으로 검증되어 전달됨
    messages = await firebase_service.get_messages(group_id=group_id)
    ...
```

### 프론트엔드에서 그룹 사용
```jsx
import { useGroup } from '../contexts/GroupContext';

function MyComponent() {
    const { currentGroup, groups, switchGroup } = useGroup();
    
    return (
        <div>
            <p>Current: {currentGroup?.name}</p>
            <p>Invite Code: {currentGroup?.invite_code}</p>
        </div>
    );
}
```

## 배포 전 체크리스트

- [ ] 백엔드 테스트 (로컬)
- [ ] 프론트엔드 테스트 (로컬)
- [ ] Firestore Rules 배포 (`firebase deploy --only firestore:rules`)
- [ ] 기존 데이터에 group_id 마이그레이션
- [ ] 백엔드 배포 (`gcloud run deploy`)
- [ ] 프론트엔드 배포 (`firebase deploy`)
