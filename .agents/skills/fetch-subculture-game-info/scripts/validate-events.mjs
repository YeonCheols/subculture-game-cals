#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const allowed = {
  gameId: new Set(["monster", "wuthering", "genshin"]),
  type: new Set(["event", "update", "maintenance", "banner", "broadcast", "notice"]),
  status: new Set(["upcoming", "active", "ended", "unknown"]),
  confidence: new Set(["confirmed", "probable", "unverified"]),
};
const requiredStrings = ["id", "gameId", "type", "title", "sourceTitle", "sourceUrl", "sourceLocale", "sourceTimeText", "status", "confidence", "retrievedAt"];
const instantFields = ["publishedAt", "startsAt", "endsAt", "retrievedAt"];
const isoWithZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

const path = process.argv[2];
if (!path) {
  console.error("Usage: node validate-events.mjs <events.json>");
  process.exit(2);
}

let events;
try {
  events = JSON.parse(await readFile(path, "utf8"));
} catch (error) {
  console.error(`Cannot read valid JSON from ${path}: ${error.message}`);
  process.exit(1);
}

const errors = [];
if (!Array.isArray(events)) errors.push("root must be an array");
const ids = new Set();

for (const [index, event] of (Array.isArray(events) ? events : []).entries()) {
  const at = `events[${index}]`;
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    errors.push(`${at} must be an object`);
    continue;
  }
  for (const field of requiredStrings) {
    if (typeof event[field] !== "string" || (field !== "sourceTimeText" && !event[field].trim())) errors.push(`${at}.${field} must be a non-empty string`);
  }
  for (const [field, values] of Object.entries(allowed)) {
    if (!values.has(event[field])) errors.push(`${at}.${field} has unsupported value: ${event[field]}`);
  }
  if (typeof event.sourceUrl === "string" && !/^https:\/\//.test(event.sourceUrl)) errors.push(`${at}.sourceUrl must use https`);
  for (const field of instantFields) {
    const value = event[field];
    if (value !== null && value !== undefined && (typeof value !== "string" || !isoWithZone.test(value) || Number.isNaN(Date.parse(value)))) errors.push(`${at}.${field} must be null or an ISO 8601 instant with timezone`);
  }
  if (event.startsAt && event.endsAt && Date.parse(event.startsAt) > Date.parse(event.endsAt)) errors.push(`${at}.endsAt precedes startsAt`);
  if (ids.has(event.id)) errors.push(`${at}.id duplicates ${event.id}`);
  ids.add(event.id);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validated ${events.length} event record(s).`);
