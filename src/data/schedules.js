export const games = [
  { id: "monster", name: "몬길: STAR DIVE", shortName: "몬길: STAR DIVE", color: "#2bc7f1", soft: "#082f3e" },
  { id: "wuthering", name: "명조: 워더링 웨이브", shortName: "명조", color: "#9c6cff", soft: "#25183e" },
  { id: "genshin", name: "원신", shortName: "원신", color: "#eeb62e", soft: "#392b0c" },
];

export const scheduleGroups = [
  { date: "2026-08-07", label: "오늘", dateLabel: "2026-08-07 (금)", tag: "오늘", items: [
    { id: "ms-1", gameId: "monster", time: "11:00", type: "업데이트", typeKey: "update", title: "1.6 버전 업데이트", status: "진행중", statusKey: "live", source: "공식 홈페이지", sourceUrl: "https://mongil.netmarble.com/", reminder: "10분 전" },
    { id: "ww-1", gameId: "wuthering", time: "12:00", type: "이벤트", typeKey: "event", title: "여름의 파도 출석 이벤트", status: "진행중", statusKey: "live", source: "공식 홈페이지", sourceUrl: "https://wutheringwaves.kurogames.com/", reminder: "25분 후" },
    { id: "gi-1", gameId: "genshin", time: "20:00", type: "공식방송", typeKey: "broadcast", title: "버전 업데이트 특별 방송", status: "예정", statusKey: "upcoming", source: "공식 YouTube", sourceUrl: "https://www.youtube.com/@GenshinImpact", reminder: "1시간 전" },
  ]},
  { date: "2026-08-08", label: "내일", dateLabel: "2026-08-08 (토)", items: [
    { id: "ms-2", gameId: "monster", time: "10:00", type: "이벤트", typeKey: "event", title: "한여름의 항로 탐험 이벤트", status: "예정", statusKey: "upcoming", source: "공식 홈페이지", sourceUrl: "https://mongil.netmarble.com/", reminder: "1일 전" },
    { id: "ww-2", gameId: "wuthering", time: "19:00", type: "공식방송", typeKey: "broadcast", title: "개발자 노트 공개 방송", status: "예정", statusKey: "upcoming", source: "공식 YouTube", sourceUrl: "https://www.youtube.com/@WutheringWaves", reminder: "30분 전" },
  ]},
  { date: "2026-08-09", label: "일요일", dateLabel: "2026-08-09 (일)", items: [{ id: "gi-2", gameId: "genshin", time: "12:00", type: "이벤트", typeKey: "event", title: "지맥의 격류 2배 보상", status: "예정", statusKey: "upcoming", source: "게임 내 공지", sourceUrl: "https://genshin.hoyoverse.com/ko/news", reminder: "1시간 전" }]},
  { date: "2026-08-10", label: "월요일", dateLabel: "2026-08-10 (월)", items: [{ id: "ms-3", gameId: "monster", time: "11:00", type: "픽업", typeKey: "pickup", title: "신규 캐릭터 픽업 시작", status: "예정", statusKey: "upcoming", source: "공식 홈페이지", sourceUrl: "https://mongil.netmarble.com/", reminder: "1일 전" }]},
  { date: "2026-08-12", label: "수요일", dateLabel: "2026-08-12 (수)", items: [{ id: "ww-3", gameId: "wuthering", time: "20:00", type: "공식방송", typeKey: "broadcast", title: "버전 프리뷰 특별 방송", status: "예정", statusKey: "upcoming", source: "공식 YouTube", sourceUrl: "https://www.youtube.com/@WutheringWaves", reminder: "1시간 전" }]},
  { date: "2026-08-13", label: "목요일", dateLabel: "2026-08-13 (목)", items: [{ id: "gi-3", gameId: "genshin", time: "11:00", type: "업데이트", typeKey: "update", title: "신규 버전 업데이트", status: "예정", statusKey: "upcoming", source: "공식 홈페이지", sourceUrl: "https://genshin.hoyoverse.com/ko/news", reminder: "1일 전" }]},
];
