#!/usr/bin/env node

import { mkdir, mkdtemp, readFile, rename, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import electronPath from "electron";
import path from "node:path";
import { USER_AGENT, collectText, decodeHtml, deduplicate, extractLinks, extractNetmarbleForumLinks, extractPage, extractSteamAnnouncementUrl, extractSteamForumLinks, mergeEventHistory, normalize } from "./lib.mjs";

const execFileAsync = promisify(execFile);

const root = path.resolve(import.meta.dirname, "../..");
const dryRun = process.argv.includes("--dry-run");
const sources = JSON.parse(await readFile(path.join(root, "config/sources.json"), "utf8"));
const retrievedAt = new Date().toISOString();
const timeoutMs = Number(process.env.COLLECT_TIMEOUT_MS || 15000);
const maxDetails = Number(process.env.COLLECT_MAX_DETAILS || 30);

async function request(url) {
  const response = await fetch(url, { headers: { accept: "application/json,text/html,application/xhtml+xml", "user-agent": USER_AGENT }, signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { body: await response.text(), finalUrl: response.url, contentType: response.headers.get("content-type") || "" };
}

async function renderUrls(urls) {
  const directory = await mkdtemp(path.join(tmpdir(), "gametime-forum-"));
  const input = path.join(directory, "input.json"); const output = path.join(directory, "output.json");
  await writeFile(input, JSON.stringify(urls));
  await execFileAsync(electronPath, [path.join(import.meta.dirname, "render-browser.cjs"), input, output], { timeout: timeoutMs * Math.max(2, urls.length) });
  return JSON.parse(await readFile(output, "utf8"));
}

async function collectSource(source) {
  if (source.kind === "netmarble-forum") {
    const indexes = await renderUrls(source.urls || [source.url]);
    const indexBodies = indexes.filter((item) => item.body).map((item) => item.body);
    const candidates = indexBodies.flatMap((body) => extractNetmarbleForumLinks(body, source)).filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index).slice(0, maxDetails);
    if (!candidates.length) throw new Error("No forum posts found after browser rendering");
    const details = await renderUrls(candidates.map((candidate) => candidate.url));
    const events = []; const rawCandidates = [];
    for (const [index, detail] of details.entries()) {
      if (!detail.body) { rawCandidates.push({ ...candidates[index], error: detail.error }); continue; }
      const page = extractPage(detail.body, { ...candidates[index], url: detail.finalUrl });
      rawCandidates.push({ ...candidates[index], finalUrl: detail.finalUrl, body: detail.body });
      events.push(normalize(source, page, retrievedAt));
    }
    return { source, events, raw: { sourceId: source.id, sourceUrls: source.urls, retrievedAt, indexes, candidates: rawCandidates }, candidateCount: candidates.length };
  }
  const index = await request(source.url);
  if (source.kind === "naver-lounge-pins") {
    const payload = JSON.parse(index.body);
    if (payload.code !== 200 || !Array.isArray(payload.content)) throw new Error("Invalid Naver Lounge official feed response");
    const officialFeeds = payload.content.filter((item) => item.user?.nickname === source.officialNickname).slice(0, maxDetails);
    const events = officialFeeds.map((item) => {
      let document = {};
      try { document = JSON.parse(item.feed.contents || "{}"); } catch {}
      const created = item.feed.createdDate;
      const published = /^\d{14}$/.test(created) ? `${created.slice(0,4)}-${created.slice(4,6)}-${created.slice(6,8)}T${created.slice(8,10)}:${created.slice(10,12)}:${created.slice(12,14)}+09:00` : null;
      return normalize(source, {
        title: decodeHtml(item.feed.title),
        canonical: `${source.canonicalBase}${item.feed.feedId}`,
        description: "",
        published,
        text: collectText(document),
      }, retrievedAt);
    }).filter((event) => event.startsAt);
    return { source, events, raw: { sourceId: source.id, sourceUrl: index.finalUrl, retrievedAt, payload }, candidateCount: officialFeeds.length };
  }
  if (source.kind === "hoyoverse-content") {
    const payload = JSON.parse(index.body);
    if (payload.retcode !== 0 || !Array.isArray(payload.data?.list)) throw new Error(`Invalid official API response: ${payload.message || "missing list"}`);
    const items = payload.data.list.slice(0, maxDetails);
    const events = items.map((item) => normalize(source, {
      title: item.sTitle,
      canonical: `${source.canonicalBase}${item.iInfoId}`,
      description: item.sIntro || "",
      published: item.dtCreateTime ? `${item.dtCreateTime.replace(" ", "T")}+09:00` : null,
      text: `${item.sTitle}\n${item.sIntro || ""}\n${item.sContent || ""}`,
    }, retrievedAt));
    return { source, events, raw: { sourceId: source.id, sourceUrl: index.finalUrl, retrievedAt, payload }, candidateCount: items.length };
  }
  const candidates = (source.kind === "steam-forum" ? extractSteamForumLinks(index.body, source) : extractLinks(index.body, { ...source, url: index.finalUrl })).slice(0, maxDetails);
  if (!candidates.length) throw new Error("No announcement candidates found; the source may require a dedicated dynamic adapter");
  const raw = { sourceId: source.id, sourceUrl: index.finalUrl, retrievedAt, candidates: [], indexBody: index.body };
  const events = [];
  for (const candidate of candidates) {
    try {
      let detail = await request(candidate.url);
      if (source.kind === "steam-forum") {
        const announcementUrl = extractSteamAnnouncementUrl(detail.body, detail.finalUrl);
        if (announcementUrl) detail = await request(announcementUrl);
      }
      const page = extractPage(detail.body, { ...candidate, url: detail.finalUrl });
      raw.candidates.push({ ...candidate, finalUrl: detail.finalUrl, body: detail.body });
      events.push(normalize(source, page, retrievedAt));
    } catch (error) {
      raw.candidates.push({ ...candidate, error: error.message });
    }
  }
  return { source, events, raw, candidateCount: candidates.length };
}

const results = await Promise.allSettled(sources.map(collectSource));
const collectedEvents = deduplicate(results.flatMap((result) => result.status === "fulfilled" ? result.value.events : []).filter((event) => event.startsAt));
let existingEvents = [];
try {
  existingEvents = JSON.parse(await readFile(path.join(root, "public/api/events.json"), "utf8"));
} catch {}
const events = mergeEventHistory(existingEvents, collectedEvents);
const status = {
  retrievedAt,
  eventCount: events.length,
  collectedEventCount: collectedEvents.length,
  sources: results.map((result, index) => result.status === "fulfilled"
    ? { id: result.value.source.id, ok: true, candidateCount: result.value.candidateCount, collectedEventCount: result.value.events.filter((event) => event.startsAt).length, storedEventCount: events.filter((event) => event.gameId === result.value.source.gameId).length }
    : { id: sources[index].id, ok: false, error: result.reason?.message || String(result.reason) }),
};

if (dryRun) {
  console.log(JSON.stringify({ status, events }, null, 2));
  process.exit(status.sources.some((source) => !source.ok) ? 1 : 0);
}

const apiDir = path.join(root, "public/api");
const rawDir = path.join(root, "data/raw", retrievedAt.replace(/[:.]/g, "-"));
await mkdir(apiDir, { recursive: true });
await mkdir(rawDir, { recursive: true });
for (const result of results) {
  if (result.status === "fulfilled") await writeFile(path.join(rawDir, `${result.value.source.id}.json`), JSON.stringify(result.value.raw, null, 2));
}

async function atomicJson(name, value) {
  const target = path.join(apiDir, name); const temp = `${target}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`); await rename(temp, target);
}
await atomicJson("events.json", events);
await atomicJson("collection-status.json", status);
console.log(`Collected ${collectedEvents.length} events and retained ${events.length} total from ${status.sources.filter((source) => source.ok).length}/${sources.length} sources.`);
if (status.sources.some((source) => !source.ok)) process.exitCode = 1;
