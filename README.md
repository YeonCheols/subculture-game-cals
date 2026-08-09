# 게임타임

몬길: STAR DIVE, 명조: 워더링 웨이브, 원신의 업데이트·공식방송·이벤트·픽업 일정을 한곳에서 확인하고 알림을 설정하는 웹/Electron 앱입니다.

프로젝트 아키텍처, 일정 데이터 계약, 공식 수집 정책, 런타임과 배포 기준은 AI 에이전트와 프로젝트 스킬이 함께 사용하는 [`docs/PROJECT_REFERENCE.md`](docs/PROJECT_REFERENCE.md)를 기준으로 합니다. 에이전트 행동 규칙과 확정된 제품 결정은 [`AGENTS.md`](AGENTS.md)에 있습니다.

## 실행

```bash
npm install
npm run dev
```

Electron 개발 모드:

```bash
npm run dev:electron
```

macOS/Windows 데스크톱 패키징:

```bash
npm run build:desktop
```

Windows 11용 설치 파일은 빌드 호스트의 CPU와 무관하게 x64로 고정합니다. 특히 Apple Silicon Mac에서 Windows 패키지를 만들 때는 다음 전용 명령을 사용합니다.

```bash
npm run build:win
```

산출물은 `dist/GameTime-<version>-win-x64.exe`에 생성됩니다.

배포용 Windows 설치 파일은 GitHub Actions의 `Build Windows installer` 워크플로에서 생성합니다. 이 워크플로는 Windows x64 네이티브 환경에서 설치 파일을 자동 실행한 뒤 설치 폴더의 `GameTime.exe`까지 확인하고, 통과한 x64 설치 파일만 artifact로 업로드합니다. Apple Silicon macOS에서는 electron-builder가 사용하는 Windows 리소스 편집용 Wine 실행 파일이 동작하지 않으므로 배포 파일을 로컬 교차 빌드하지 않습니다.

## 구현된 기능

- 날짜별 일정 타임라인 및 월간 캘린더
- 게임, 일정 유형, 상태 필터와 키워드 검색
- 게임 구독 및 개별 일정 알림 상태의 로컬 저장
- 공식 출처 링크 연결
- 5분 간격 자동 새로고침과 수동 새로고침 상태
- Electron 네이티브 알림과 외부 링크 보안 브리지
- 데스크톱/모바일 반응형 레이아웃

## 데이터 안내

실제 일정은 `https://subculture-schdule-api.vercel.app/api/v1`에서 읽고, 원격 API와 캐시를 사용할 수 없을 때 `public/api/`의 번들 JSON으로 대체합니다. `src/data/schedules.js`는 런타임 일정이 아니라 게임 메타데이터와 공식 로컬 아이콘을 제공합니다. 공식 데이터 수집 및 게시 기준은 프로젝트 참조 문서의 데이터 계약과 수집 파이프라인을 따릅니다.

## 검증

```bash
npm run build
npm run test:sites
```

선택된 디자인 기준은 `design-reference/selected-option-1.png`, QA 결과는 `design-qa.md`에 기록됩니다.
