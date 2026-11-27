// commands/ping.js — `lamar ping`: quick "is Lamar alive?" check.
// Shows Discord gateway heartbeat latency and how long the bot's been up.
// Purely local (no LLM call), so it answers even when the provider chain is down.

function formatUptime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  let s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!parts.length || (!d && !h)) parts.push(`${s}s`);
  return parts.join(" ");
}

function reply(wsPing, uptimeMs) {
  // ws.ping is -1 until the first heartbeat ack comes back.
  const latency = wsPing >= 0 ? `${Math.round(wsPing)}ms` : "still warmin' up";
  return `🏓 Pong, homie. Gateway: **${latency}** · Up for **${formatUptime(uptimeMs)}**.`;
}

module.exports = {
  name: "ping",
  description: "Check Lamar's gateway latency and uptime",
  formatUptime,
  reply,
  execute(client, message) {
    return message.channel.send(reply(client.ws.ping, client.uptime));
  },
};
