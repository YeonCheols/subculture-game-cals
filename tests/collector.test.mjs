import assert from "node:assert/strict";
import test from "node:test";
import { classify, collectText, decodeHtml, deduplicate, extractLinks, extractNetmarbleForumLinks, extractPage, extractSteamAnnouncementUrl, extractSteamForumLinks, extractTime, getEventStatus, mergeEventHistory, normalize } from "../scripts/collector/lib.mjs";

const source = { gameId: "genshin", locale: "ko-KR", url: "https://example.com/news", allowedHosts: ["example.com"], detailPattern: "/detail/", keywords: ["이벤트"] };

test("discovers only allowed official detail links", () => {
  const html = '<a href="/detail/123"><span>신규 이벤트 안내</span></a><a href="https://evil.test/detail/9">이벤트</a>';
  assert.deepEqual(extractLinks(html, source), [{ url: "https://example.com/detail/123", title: "신규 이벤트 안내" }]);
});

test("extracts metadata and Korean KST ranges", () => {
  const html = '<meta property="og:title" content="신규 이벤트"><meta property="og:description" content="설명"><p>2026. 8. 7 11:00부터 2026. 8. 9 23:59</p>';
  const page = extractPage(html, { url: "https://example.com/detail/123", title: "fallback" });
  const timing = extractTime(page.text);
  assert.equal(page.title, "신규 이벤트");
  assert.equal(timing.startsAt, "2026-08-07T11:00:00+09:00");
  assert.equal(timing.endsAt, "2026-08-09T23:59:00+09:00");
});

test("normalizes stable events and deduplicates canonical URLs", () => {
  const page = { title: "1.2 버전 업데이트", canonical: "https://example.com/detail/123", description: "설명", published: null, text: "2026. 8. 7 11:00 ~ 2026. 8. 9 23:59" };
  const event = normalize(source, page, "2026-08-07T00:00:00Z", Date.parse("2026-08-08T00:00:00Z"));
  assert.equal(event.type, "update");
  assert.equal(event.status, "active");
  assert.equal(deduplicate([event, { ...event, title: "중복" }]).length, 1);
  assert.equal(classify("특별 방송 안내"), "broadcast");
});

test("extracts Netmarble rendered forum posts", () => {
  const html = '<a data-router="view/6/4009"><span>여름 이벤트 안내</span></a>';
  assert.deepEqual(extractNetmarbleForumLinks(html, { url: "https://forum.netmarble.com/stardive_ko/list/6/1" }), [{ url: "https://forum.netmarble.com/stardive_ko/view/6/4009", title: "여름 이벤트 안내" }]);
});

test("extracts Steam official topics and announcement targets", () => {
  const html = '<div class="forum_topic unread"><a class="forum_topic_overlay" href="https://steamcommunity.com/app/3513350/eventcomments/123/"></a><div class="forum_topic_name op_hidden">Version 3.5 Update</div></div>';
  assert.deepEqual(extractSteamForumLinks(html, { url: "https://steamcommunity.com/app/3513350/eventcomments/" }), [{ url: "https://steamcommunity.com/app/3513350/eventcomments/123/", title: "Version 3.5 Update" }]);
  assert.equal(extractSteamAnnouncementUrl('View <a href="https://steamcommunity.com/ogg/3513350/announcements/detail/456">full</a>', "https://steamcommunity.com"), "https://steamcommunity.com/ogg/3513350/announcements/detail/456");
});

test("extracts verified Naver Lounge text and a single broadcast time", () => {
  const document = { components: [{ value: [{ nodes: [{ value: "3.6 버전 프리뷰 특별 방송이 2026년 8월 7일(금) 20:00에 공개됩니다." }] }] }] };
  const text = collectText(document);
  assert.match(text, /2026년 8월 7일/);
  assert.deepEqual(extractTime(text), { startsAt: "2026-08-07T20:00:00+09:00", endsAt: null, sourceTimeText: "2026년 8월 7일(금) 20:00" });
  assert.equal(decodeHtml("&#x1f4e3; 공식 방송"), "📣 공식 방송");
});

test("retains ended, active, and upcoming history while replacing recollected URLs", () => {
  const now = Date.parse("2026-08-07T03:00:00Z");
  const existing = [
    { id: "ended", sourceUrl: "https://example.com/ended", title: "기존", startsAt: "2026-08-06T20:00:00+09:00", endsAt: null },
    { id: "active", sourceUrl: "https://example.com/active", startsAt: "2026-08-01T10:00:00+09:00", endsAt: "2026-08-08T23:59:00+09:00" },
  ];
  const collected = [
    { ...existing[0], title: "갱신됨" },
    { id: "future", sourceUrl: "https://example.com/future", startsAt: "2026-08-08T10:00:00+09:00", endsAt: null },
  ];
  const merged = mergeEventHistory(existing, collected, now);
  assert.deepEqual(merged.map(({ id, status }) => [id, status]), [["active", "active"], ["ended", "ended"], ["future", "upcoming"]]);
  assert.equal(merged.find((event) => event.id === "ended").title, "갱신됨");
  assert.equal(getEventStatus({ startsAt: "2026-08-06T20:00:00+09:00", endsAt: null }, now), "ended");
});
