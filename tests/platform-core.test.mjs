import test from "node:test";
import assert from "node:assert/strict";
import { overlapsDate, reminderAt, toScheduleGroups } from "../src/core/schedules.js";

const games = [{ id: "genshin" }];

test("an event range overlaps the selected KST date", () => {
  const event = { startsAt: "2026-08-08T23:00:00+09:00", endsAt: "2026-08-10T01:00:00+09:00" };
  assert.equal(overlapsDate(event, "2026-08-09"), true);
  assert.equal(overlapsDate(event, "2026-08-11"), false);
});

test("native reminder time is one hour before the event", () => {
  assert.equal(reminderAt({ startsAt: "2026-08-09T12:00:00+09:00" }).toISOString(), "2026-08-09T02:00:00.000Z");
});

test("display groups remain sorted by KST start date", () => {
  const events = [
    { id: "later", gameId: "genshin", type: "event", status: "upcoming", startsAt: "2026-08-10T10:00:00+09:00" },
    { id: "earlier", gameId: "genshin", type: "event", status: "upcoming", startsAt: "2026-08-09T10:00:00+09:00" },
  ];
  assert.deepEqual(toScheduleGroups(events, games).map(({ date }) => date), ["2026-08-09", "2026-08-10"]);
});
