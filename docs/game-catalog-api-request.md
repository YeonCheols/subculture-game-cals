# 게임 카탈로그 공개 API 요청 명세

## 1. 목적

클라이언트가 지원 게임 ID를 코드에 고정하지 않고 서버에서 발견한 뒤, 각 게임의 v2 일정 API를 독립적으로 순회할 수 있도록 공개 게임 카탈로그 API를 제공한다.

이 API는 게임의 정체성과 지원 상태를 제공한다. 레이아웃, 컴포넌트 크기 등 순수한 화면 표현은 클라이언트가 관리한다.

## 2. 요청 API

```http
GET /api/v1/games
Accept: application/json
```

- 인증: 없음
- Query parameter: 없음
- 성공 상태: `200 OK`
- 권장 캐시: `Cache-Control: public, max-age=300, stale-while-revalidate=3600`

## 3. 응답 계약

```ts
interface GamesResponse {
  items: GameCatalogItem[];
  updatedAt: string;
}

interface GameCatalogItem {
  id: string;
  name: string;
  shortName: string;
  enabled: boolean;
  sortOrder: number;
  icon: GameIcon | null;
}

interface GameIcon {
  url: string;
  version: string;
}
```

### 필드 정의

| 필드 | 필수 | 설명 |
|---|---:|---|
| `items` | O | 클라이언트가 인식할 수 있는 전체 게임 목록 |
| `updatedAt` | O | 카탈로그가 마지막으로 변경된 시각. 시간대가 포함된 ISO 8601 문자열 |
| `id` | O | 일정 API의 `gameId`와 동일한 안정적인 식별자 |
| `name` | O | 공식 전체 게임명 |
| `shortName` | O | 좁은 UI에서 사용할 공식 또는 승인된 축약명 |
| `enabled` | O | 신규 일정 조회와 사용자 구독을 허용하는지 여부 |
| `sortOrder` | O | 게임 목록 표시 순서. 오름차순 사용 |
| `icon` | O | 공식 앱 아이콘 정보. 제공할 수 없다면 `null` |
| `icon.url` | O | 공개 HTTPS 이미지 URL |
| `icon.version` | O | 아이콘 캐시 무효화에 사용하는 불투명 버전 문자열 |

## 4. 응답 예시

```json
{
  "items": [
    {
      "id": "monster",
      "name": "몬길: STAR DIVE",
      "shortName": "몬길: STAR DIVE",
      "enabled": true,
      "sortOrder": 10,
      "icon": {
        "url": "https://subculture-schdule-api.vercel.app/assets/game-icons/monster.webp",
        "version": "2026-08-21"
      }
    },
    {
      "id": "wuthering",
      "name": "명조: 워더링 웨이브",
      "shortName": "명조",
      "enabled": true,
      "sortOrder": 20,
      "icon": {
        "url": "https://subculture-schdule-api.vercel.app/assets/game-icons/wuthering.webp",
        "version": "2026-08-21"
      }
    },
    {
      "id": "genshin",
      "name": "원신",
      "shortName": "원신",
      "enabled": true,
      "sortOrder": 30,
      "icon": {
        "url": "https://subculture-schdule-api.vercel.app/assets/game-icons/genshin.webp",
        "version": "2026-08-21"
      }
    },
    {
      "id": "nte",
      "name": "이환",
      "shortName": "이환",
      "enabled": true,
      "sortOrder": 40,
      "icon": {
        "url": "https://subculture-schdule-api.vercel.app/assets/game-icons/nte.webp",
        "version": "2026-08-21"
      }
    }
  ],
  "updatedAt": "2026-08-21T09:00:00+09:00"
}
```

## 5. 서버 동작 요구사항

1. `id`는 `/api/v2/events?gameId={id}`에서 허용하는 `gameId`와 반드시 일치해야 한다.
2. 하나의 응답에 동일한 `id`가 중복되면 안 된다.
3. `sortOrder`가 같은 경우 서버 응답 순서를 보장하지 않아도 된다. 가능하면 고유한 값을 사용한다.
4. 신규 게임은 일정 API가 준비된 후 `enabled: true`로 공개한다.
5. 일시적으로 수집을 중단한 게임은 항목을 삭제하지 않고 `enabled: false`로 전환한다.
6. 기존 `id`는 게임명 변경이나 서비스 상태 변경 시에도 재사용하거나 변경하지 않는다.
7. 아이콘은 게시자가 제공한 공식 앱 아이콘을 사용하며, 정사각형 WebP 또는 PNG를 권장한다.
8. `icon.url`의 파일이 바뀌면 `icon.version`도 반드시 변경한다.
9. 알 수 없는 경로는 `404`, 서버 오류는 `5xx`와 JSON 오류 응답을 반환한다.

권장 오류 형식:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to load the game catalog"
  }
}
```

## 6. 클라이언트 연동 방식

클라이언트는 다음 순서로 동작한다.

1. 앱 시작 시 `/api/v1/games`를 조회한다.
2. 응답을 검증한 후 성공한 카탈로그만 로컬 캐시에 원자적으로 저장한다.
3. `enabled: true`인 게임을 `sortOrder` 오름차순으로 정렬한다.
4. 각 `id`에 대해 `/api/v2/events?gameId={id}`의 cursor를 독립적으로 끝까지 순회한다.
5. 한 게임의 일정 조회 실패가 다른 게임의 조회나 마지막 성공 캐시를 제거하지 않게 한다.
6. 카탈로그 조회 실패 시 마지막 성공 카탈로그를 사용하고, 캐시도 없으면 번들된 기본 게임 목록을 사용한다.
7. 서버 아이콘은 `id`와 `icon.version`을 기준으로 캐시하며, 다운로드 실패 시 번들된 로컬 아이콘 또는 클라이언트의 중립 placeholder를 사용한다.
8. 서버에 새 게임이 추가되어 클라이언트 전용 테마가 없으면 기본 테마 색상을 적용한다.

## 7. UI 메타데이터 범위

서버가 소유하는 값:

- 안정적인 게임 ID
- 공식 전체 이름과 축약 이름
- 지원 및 활성화 상태
- 기본 표시 순서
- 공식 아이콘과 아이콘 버전

클라이언트가 소유하는 값:

- 테마 및 강조 색상
- 아이콘 크기, 마스크, 테두리
- 레이아웃과 컴포넌트 구성
- 플랫폼별 상호작용과 접근성 표현

초기 계약에는 테마 색상을 포함하지 않는다. 서버가 브랜드 색상을 공식 데이터로 관리할 필요가 생기면 별도의 선택 필드로 확장한다.

## 8. 하위 호환성과 확장

- 기존 필드의 의미나 타입은 변경하지 않는다.
- 새 필드는 선택 필드로만 추가한다.
- 지원 중단된 게임도 기존 구독과 캐시 식별을 위해 항목을 유지한다.
- `id`를 다른 게임에 재할당하지 않는다.
- 클라이언트는 알 수 없는 추가 필드를 무시한다.
- 페이지네이션은 당분간 필요하지 않다. 게임 수가 크게 늘면 별도 버전에서 추가한다.

## 9. 수용 기준

- 응답에 `monster`, `wuthering`, `genshin`, `nte`가 포함된다.
- 모든 활성 게임 ID로 `/api/v2/events?gameId={id}`를 호출했을 때 `400`이 발생하지 않는다.
- `items[].id`는 고유하며 비어 있지 않다.
- 모든 날짜 필드는 시간대가 포함된 유효한 ISO 8601 문자열이다.
- 모든 비어 있지 않은 아이콘 URL은 HTTPS이며 공개 인증 없이 접근 가능하다.
- `Cache-Control`이 공개 캐시 정책을 포함한다.
- 게임 추가 및 비활성화가 클라이언트 배포 없이 응답에 반영된다.

## 10. 선택적 후속 개선

카탈로그가 안정화된 이후 다음 필드를 선택적으로 검토할 수 있다.

```ts
interface OptionalGameCatalogFields {
  officialSiteUrl?: string;
  sourceLocale?: string;
  serviceStatus?: 'active' | 'maintenance' | 'ended';
}
```

이 필드들은 현재 v2 일정 discovery 구현에 필수는 아니다.
