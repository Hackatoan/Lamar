// enforce.js — the gaming-curfew enforcer.
//
// On a timer (and on voice/presence events) it checks whether the target user is
// in a voice channel or playing a game during non-free-time. If so, and there is
// no active /bypass pass, it disconnects them from voice and DMs a nudge.

const storage = require("node-persist");
const { ActivityType } = require("discord.js");
const { isFreeTime, nextFreeStart } = require("./freetime");

const TARGET_USER_ID = process.env.TARGET_USER_ID || "651282581442002945";
// Optional: only nudge for a specific game (case-insensitive substring). Empty = any game.
const GAME_FILTER = (process.env.GAME_FILTER || "").toLowerCase();
const CHECK_INTERVAL_MS = 60 * 1000;
const NUDGE_COOLDOWN_MS = 10 * 60 * 1000; // don't spam the "get off the game" DM

const BYPASS_KEY = "curfew_bypass_until"; // ISO string timestamp
let lastNudgeAt = 0;

// ---- bypass state -----------------------------------------------------------

async function getBypassUntil() {
  const v = await storage.getItem(BYPASS_KEY);
  return v ? new Date(v) : null;
}

async function isBypassActive() {
  const until = await getBypassUntil();
  return !!until && until > new Date();
}

// Grant a pass for the rest of the current non-free stretch (until the next
// free-time block begins). Falls back to 2h if the schedule has nothing coming.
async function grantBypass() {
  const next = await nextFreeStart(new Date());
  const until = next || new Date(Date.now() + 2 * 3600 * 1000);
  await storage.setItem(BYPASS_KEY, until.toISOString());
  return until;
}

async function clearBypass() {
  await storage.removeItem(BYPASS_KEY);
}

// ---- enforcement ------------------------------------------------------------

async function dm(user, text) {
  try {
    await user.send(text);
  } catch {
    /* user may have DMs closed — ignore */
  }
}

async function enforceMember(member) {
  if (!member) return;

  // Free time or an active bypass → hands off.
  if (await isFreeTime()) return;
  if (await isBypassActive()) return;

  // 1) In a voice channel during curfew → disconnect.
  if (member.voice && member.voice.channelId) {
    try {
      await member.voice.disconnect("Outside designated free time");
      await dm(
        member.user,
        "🚫 It ain't free time, homie. Get outta voice and go handle your business. Run `/bypass` if you wanna plead your case to the group."
      );
    } catch (err) {
      console.error(`[enforce] couldn't disconnect ${member.id}:`, err.message);
    }
  }

  // 2) Playing a game during curfew → nudge (throttled).
  const activities = member.presence?.activities || [];
  const game = activities.find(
    (a) =>
      a.type === ActivityType.Playing &&
      (!GAME_FILTER || (a.name || "").toLowerCase().includes(GAME_FILTER))
  );
  if (game && Date.now() - lastNudgeAt > NUDGE_COOLDOWN_MS) {
    lastNudgeAt = Date.now();
    await dm(
      member.user,
      `🎮 I see you on **${game.name}** and it ain't free time. Turn that off, boy. \`/bypass\` if you think you got a case.`
    );
  }
}

async function sweep(client) {
  try {
    for (const guild of client.guilds.cache.values()) {
      let member = guild.members.cache.get(TARGET_USER_ID);
      if (!member) {
        try {
          member = await guild.members.fetch(TARGET_USER_ID);
        } catch {
          continue; // not in this guild
        }
      }
      await enforceMember(member);
    }
  } catch (err) {
    console.error("[enforce] sweep error:", err.message);
  }
}

function start(client) {
  // Event-driven: react the instant he joins voice or fires up a game...
  client.on("voiceStateUpdate", (_old, next) => {
    if (next.id === TARGET_USER_ID && next.channelId) {
      enforceMember(next.member).catch(() => {});
    }
  });
  client.on("presenceUpdate", (_old, next) => {
    if (next?.userId === TARGET_USER_ID && next.member) {
      enforceMember(next.member).catch(() => {});
    }
  });

  // ...plus a periodic sweep as a safety net (covers bypass expiry, curfew
  // starting while he's already in voice, missed events, etc.).
  setInterval(() => sweep(client), CHECK_INTERVAL_MS);
  sweep(client);

  console.log(`[enforce] curfew active for user ${TARGET_USER_ID}`);
}

module.exports = {
  start,
  grantBypass,
  clearBypass,
  isBypassActive,
  getBypassUntil,
  TARGET_USER_ID,
};
