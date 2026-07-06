// freetime.js — reads a Google Calendar iCal feed and answers
// "is right now designated free time?" plus "when does the next free block start?".
//
// An EVENT on the calendar means free time is allowed. Outside of any event,
// the target user is subject to enforcement (kicked from voice / nudged off games).

const ical = require("node-ical");

const CALENDAR_URL = process.env.CALENDAR_ICAL_URL;
const REFRESH_MS = 5 * 60 * 1000; // re-fetch the calendar every 5 minutes

let cache = null; // parsed ical data
let cacheAt = 0;
let inFlight = null;

async function getCalendar() {
  if (!CALENDAR_URL) return null;
  const now = Date.now();
  if (cache && now - cacheAt < REFRESH_MS) return cache;
  if (inFlight) return inFlight;
  inFlight = ical.async
    .fromURL(CALENDAR_URL)
    .then((data) => {
      cache = data;
      cacheAt = Date.now();
      inFlight = null;
      return data;
    })
    .catch((err) => {
      inFlight = null;
      console.error("[freetime] failed to fetch calendar:", err.message);
      return cache; // fall back to last good copy (may be null)
    });
  return inFlight;
}

// Expand all event occurrences (including recurring) that overlap [from, to]
// into a flat list of { start, end } Date intervals.
function expandIntervals(data, from, to) {
  const intervals = [];
  if (!data) return intervals;

  for (const key of Object.keys(data)) {
    const ev = data[key];
    if (!ev || ev.type !== "VEVENT" || !ev.start) continue;

    const durationMs =
      ev.end && ev.start ? new Date(ev.end) - new Date(ev.start) : 0;

    if (ev.rrule) {
      // Recurring event: get every occurrence start in the window (padded so an
      // occurrence that started before `from` but is still running is caught).
      const pad = new Date(from.getTime() - durationMs - 1000);
      let starts;
      try {
        starts = ev.rrule.between(pad, to, true);
      } catch {
        starts = [];
      }

      // Cancelled occurrences (EXDATE) are exposed on ev.exdate keyed by ISO date.
      const exdates = ev.exdate || {};

      for (const s of starts) {
        const key2 = s.toISOString().substring(0, 10);
        if (exdates[key2]) continue;

        // A single occurrence may be moved/edited (stored in ev.recurrences).
        const override = ev.recurrences && ev.recurrences[key2];
        if (override) {
          intervals.push({
            start: new Date(override.start),
            end: new Date(override.end),
          });
        } else {
          intervals.push({
            start: new Date(s),
            end: new Date(s.getTime() + durationMs),
          });
        }
      }
    } else {
      const start = new Date(ev.start);
      const end = new Date(ev.end || start.getTime() + durationMs);
      if (end > from && start < to) intervals.push({ start, end });
    }
  }
  return intervals;
}

// Is `when` (default now) inside a free-time block?
async function isFreeTime(when = new Date()) {
  // If no calendar is configured, fail OPEN (never enforce) so a misconfig
  // can't lock someone out of voice indefinitely.
  if (!CALENDAR_URL) return true;

  const data = await getCalendar();
  if (!data) return true; // couldn't load — fail open

  const from = new Date(when.getTime() - 24 * 3600 * 1000);
  const to = new Date(when.getTime() + 60 * 1000);
  const intervals = expandIntervals(data, from, to);
  return intervals.some((i) => when >= i.start && when < i.end);
}

// When does the next free block begin at/after `when`? Returns a Date, or null
// if nothing is scheduled in the next 7 days. If we're currently inside a free
// block, returns the end of that block (i.e. when enforcement resumes) — callers
// use this to size a bypass to "rest of the current non-free stretch".
async function nextFreeStart(when = new Date()) {
  if (!CALENDAR_URL) return null;
  const data = await getCalendar();
  if (!data) return null;

  const to = new Date(when.getTime() + 7 * 24 * 3600 * 1000);
  const intervals = expandIntervals(data, when, to)
    .filter((i) => i.start > when)
    .sort((a, b) => a.start - b.start);
  return intervals.length ? intervals[0].start : null;
}

module.exports = { isFreeTime, nextFreeStart, hasCalendar: !!CALENDAR_URL };
