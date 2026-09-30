// Repeat count came straight from user input with no upper bound, so
// "lamar attack2 <name> 999999999" would fire that many unawaited
// message.channel.send() calls in a tight synchronous loop — flooding the
// channel, hammering the Discord API hard enough to get the bot
// rate-limited (or banned), and piling up unbounded pending promises.
// Every other repeat-driven path in this bot is capped or cooldown-gated;
// this one wasn't. Clamp to a small max instead.
const MAX_REPEATS = 5;

module.exports = {
  name: "attack2",
  description: "Repeatedly call a person a derogatory term",
  execute(client, message, args) {
    let x = 1;
    if (args[1]) {
      const parsed = parseInt(args[1], 10);
      if (Number.isFinite(parsed)) x = parsed;
    }
    x = Math.min(Math.max(x, 1), MAX_REPEATS);

    while (x >= 1) {
      message.channel.send(args[0] + " is a nigger");
      x -= 1;
    }
  },
};
