// commands/curfew.js — `lamar curfew`: read-only status of the gaming curfew.
// Shows whether it's free time right now, when the next free block starts,
// and whether a /bypass pass is armed/active. Never changes enforcement or
// bypass state (reads storage directly instead of isBypassActive(), which
// clears expired passes as a side effect).
const { isFreeTime, nextFreeStart, hasCalendar } = require("../freetime");
const enforce = require("../enforce");

const ts = (d, style) => `<t:${Math.floor(d.getTime() / 1000)}:${style}>`;

function bypassLine(b, now = new Date()) {
  if (!b) return null;
  if (b.phase === "active") return "🎟️ Bypass pass is **active** (in a call right now).";
  if (b.phase === "grace" && b.graceUntil && new Date(b.graceUntil) > now)
    return `🎟️ Bypass pass in **grace** until ${ts(new Date(b.graceUntil), "t")}.`;
  if (b.phase === "armed" && (!b.armedUntil || new Date(b.armedUntil) > now))
    return "🎟️ Bypass pass is **armed**, waitin' on him to hop in a call.";
  return null; // stale pass, enforcer will clean it up
}

async function status(now = new Date()) {
  if (process.env.ENABLE_CURFEW !== "true") return "😴 Curfew's switched off right now. Nobody's gettin' kicked.";
  if (!hasCalendar) return "📅 No free-time calendar hooked up, so curfew ain't enforcing nothin'.";

  const target = `<@${enforce.TARGET_USER_ID}>`;
  const lines = [];
  if (await isFreeTime(now)) {
    lines.push(`😎 It's free time for ${target} right now. Go crazy.`);
  } else {
    lines.push(`🚫 Curfew's in effect for ${target}. Get off the game, homie.`);
    const next = await nextFreeStart(now);
    lines.push(
      next
        ? `⏰ Next free time starts ${ts(next, "t")} (${ts(next, "R")}).`
        : "⏰ No free time on the calendar for the next 7 days. 💀"
    );
  }
  const bp = bypassLine(await enforce.getBypass(), now);
  if (bp) lines.push(bp);
  return lines.join("\n");
}

module.exports = {
  name: "curfew",
  description: "Check the gaming curfew: free time now, next free block, bypass status",
  status,
  bypassLine,
  async execute(client, message) {
    // Don't ping the target every time someone checks.
    return message.channel.send({ content: await status(), allowedMentions: { parse: [] } });
  },
};
