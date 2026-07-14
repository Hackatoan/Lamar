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

// Grace window after he leaves voice, so swapping devices (phone -> PlayStation)
// doesn't burn the pass.
const GRACE_MS = parseInt(process.env.BYPASS_GRACE_MS, 10) || 5 * 60 * 1000;
const BYPASS_KEY = "curfew_bypass"; // { phase, armedUntil, graceUntil }
let lastNudgeAt = 0;

// In-memory flag: true while a /bypass poll is actively running.
// Prevents kicking him during the vote window before armBypass() is called.
let pollPending = false;
function setPollPending(val) { pollPending = val; }

// ---- bypass state -----------------------------------------------------------
// Session-based: /bypass "arms" a pass; his next voice join consumes it and he's
// exempt until he leaves the call. Leaving opens a short grace window; if he
// doesn't rejoin within it, the pass is spent.
//
//   phase "armed"  -> poll passed, waiting for him to join a call
//   phase "active" -> in a call, exempt from enforcement
//   phase "grace"  -> just left; still exempt until graceUntil (device swap)

async function getBypass() {
  return (await storage.getItem(BYPASS_KEY)) || null;
}
async function setBypass(state) {
  await storage.setItem(BYPASS_KEY, state);
}
async function clearBypass() {
  await storage.removeItem(BYPASS_KEY);
}

// Arm a pass after a successful /bypass poll. If he's already in a call it goes
// straight to an active session so he isn't kicked before he can use it.
async function armBypass(inVoiceNow) {
  const next = await nextFreeStart(new Date());
  // An unused arm only makes sense for the current non-free stretch.
  const armedUntil = (next || new Date(Date.now() + 2 * 3600 * 1000)).toISOString();
  await setBypass({ phase: inVoiceNow ? "active" : "armed", armedUntil });
  return { armedUntil: new Date(armedUntil), active: !!inVoiceNow };
}

// Is he exempt right now? Only during an active call session or its grace window.
// An "armed" pass does NOT exempt yet — it waits for him to actually join.
async function isBypassActive() {
  const b = await getBypass();
  if (!b) return false;
  const now = new Date();
  if (b.phase === "active") return true;
  if (b.phase === "grace") {
    if (b.graceUntil && new Date(b.graceUntil) > now) return true;
    await clearBypass(); // grace elapsed without a rejoin — pass spent
    return false;
  }
  if (b.phase === "armed" && b.armedUntil && new Date(b.armedUntil) < now) {
    await clearBypass(); // never used before free time came around
  }
  return false;
}

// He joined voice: consume an armed pass (or resume from grace) into an active
// session. Returns true if he's now bypassed.
async function onTargetJoin() {
  const b = await getBypass();
  if (!b) return false;
  const now = new Date();
  const armedOk = b.phase === "armed" && (!b.armedUntil || new Date(b.armedUntil) > now);
  const graceOk = b.phase === "grace" && (!b.graceUntil || new Date(b.graceUntil) > now);
  if (armedOk || graceOk || b.phase === "active") {
    await setBypass({ phase: "active", armedUntil: b.armedUntil });
    return true;
  }
  return false;
}

// He left voice: open the grace window (only meaningful from an active session).
async function onTargetLeave() {
  const b = await getBypass();
  if (b && b.phase === "active") {
    await setBypass({
      phase: "grace",
      armedUntil: b.armedUntil,
      graceUntil: new Date(Date.now() + GRACE_MS).toISOString(),
    });
  }
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

  // Free time, active bypass, or poll currently running → hands off.
  if (await isFreeTime()) return;
  if (pollPending) return;
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
  // Voice: drive the session-based bypass, and enforce on join.
  client.on("voiceStateUpdate", async (oldS, newS) => {
    if (oldS.id !== TARGET_USER_ID && newS.id !== TARGET_USER_ID) return;
    const joined = !oldS.channelId && newS.channelId;
    const left = oldS.channelId && !newS.channelId;
    try {
      if (joined) {
        // Consume an armed/grace pass into an active session first...
        const bypassed = await onTargetJoin();
        if (!bypassed) await enforceMember(newS.member); // ...otherwise enforce
      } else if (left) {
        await onTargetLeave(); // open device-swap grace
      } else if (newS.channelId) {
        // channel switch / other in-voice update
        if (!(await isBypassActive())) await enforceMember(newS.member);
      }
    } catch (err) {
      console.error("[enforce] voice handler error:", err.message);
    }
  });

  client.on("presenceUpdate", (_old, next) => {
    if (next?.userId === TARGET_USER_ID && next.member) {
      enforceMember(next.member).catch(() => {});
    }
  });

  // ...plus a periodic sweep as a safety net (bypass/grace expiry, curfew
  // starting while he's already in voice, missed events, etc.).
  setInterval(() => sweep(client), CHECK_INTERVAL_MS);
  sweep(client);

  console.log(`[enforce] curfew active for user ${TARGET_USER_ID}`);
}

module.exports = {
  start,
  armBypass,
  clearBypass,
  isBypassActive,
  getBypass,
  onTargetJoin,
  onTargetLeave,
  setPollPending,
  GRACE_MS,
  TARGET_USER_ID,
};
