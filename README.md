# 게임타임

몬길: STAR DIVE, 명조: 워더링 웨이브, 원신의 업데이트·공식방송·이벤트·픽업 일정을 한곳에서 확인하고 알림을 설정하는 웹/Electron 앱입니다.

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

## 구현된 기능

- 날짜별 일정 타임라인 및 월간 캘린더
- 게임, 일정 유형, 상태 필터와 키워드 검색
- 게임 구독 및 개별 일정 알림 상태의 로컬 저장
- 공식 출처 링크 연결
- 15분 간격 새로고침 상태
- Electron 네이티브 알림과 외부 링크 보안 브리지
- 데스크톱/모바일 반응형 레이아웃

## 데이터 안내

`src/data/schedules.js`는 UI와 알림 흐름을 검증하기 위한 샘플 일정입니다. 실제 서비스에서는 공식 홈페이지·공식 SNS·공식 YouTube만을 원천으로 사용하는 별도 수집 API가 필요합니다. 수집 데이터는 출처 URL, 원문 게시 시각, 마지막 확인 시각, 변경 이력을 함께 저장한 뒤 검수하여 공개하는 것을 권장합니다.

## 검증

```bash
npm run build
npm run test:sites
```

선택된 디자인 기준은 `design-reference/selected-option-1.png`, QA 결과는 `design-qa.md`에 기록됩니다.
