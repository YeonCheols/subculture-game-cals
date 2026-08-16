# Normalized event schema

The collector output is a JSON array. Each object uses these fields:

| Field | Required | Meaning |
|---|---:|---|
| `id` | yes | Stable lowercase ID, preferably `<gameId>-<source-native-id>` |
| `gameId` | yes | `monster`, `wuthering`, `genshin`, or `nte` |
| `type` | yes | `event`, `update`, `maintenance`, `banner`, `broadcast`, or `notice` |
| `title` | yes | Concise Korean display title |
| `sourceTitle` | yes | Title as published by the official source |
| `sourceUrl` | yes | Canonical `https` URL to the opened official item |
| `sourceLocale` | yes | BCP 47 locale such as `ko-KR` or `en-US` |
| `publishedAt` | no | Publication instant with explicit offset, or `null` |
| `startsAt` | no | Start instant with explicit offset, or `null` |
| `endsAt` | no | End instant with explicit offset, or `null` |
| `sourceTimeText` | yes | Original date/time wording; use an empty string only when absent |
| `status` | yes | `upcoming`, `active`, `ended`, or `unknown` |
| `confidence` | yes | `confirmed`, `probable`, or `unverified` |
| `retrievedAt` | yes | UTC retrieval instant |
| `version` | no | Related game version, or `null` |
| `summary` | no | Short factual summary without promotional filler |

Example:

```json
[
  {
    "id": "genshin-official-12345",
    "gameId": "genshin",
    "type": "event",
    "title": "이벤트 이름",
    "sourceTitle": "공식 공지 원문 제목",
    "sourceUrl": "https://genshin.hoyoverse.com/ko/news/detail/12345",
    "sourceLocale": "ko-KR",
    "publishedAt": "2026-08-07T12:00:00+09:00",
    "startsAt": null,
    "endsAt": null,
    "sourceTimeText": "추후 공지",
    "status": "unknown",
    "confidence": "probable",
    "retrievedAt": "2026-08-07T03:10:00Z",
    "version": null,
    "summary": "공식 공지에 확인된 내용만 요약"
  }
]
```
