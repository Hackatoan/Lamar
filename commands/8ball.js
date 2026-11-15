// commands/8ball.js — `lamar 8ball <question>`: Magic 8-Ball, Lamar edition.
// Purely local (no LLM call), so it works even when the provider chain is down.
const ANSWERS = [
  // yes
  "Hell yeah, homie. That's a lock.",
  "Bet. Ain't no doubt about it.",
  "Straight up yes, dog.",
  "You already know it's a yes.",
  "Signs pointin' to yes, my dude.",
  // maybe
  "Ask me later, I'm busy bein' fly.",
  "Man, I can't call that one right now.",
  "Shake it again, homie, the vibes is cloudy.",
  "Better not tell you now, you can't handle it.",
  // no
  "Nah, dog. Not happenin'.",
  "Hell nah. Who told you that?",
  "Don't count on it, homie.",
  "My sources say nah, and my sources is the streets.",
  "That's a no, playa. Take the L.",
];

function pick(rand = Math.random) {
  return ANSWERS[Math.floor(rand() * ANSWERS.length)];
}

module.exports = {
  name: "8ball",
  description: "Ask the Magic 8-Ball (Lamar edition) a yes/no question",
  ANSWERS,
  pick,
  execute(client, message, args) {
    if (!args.length) {
      return message.channel.send("Ask me somethin' first, dog. `lamar 8ball will I get rich?`");
    }
    return message.channel.send(`🎱 ${pick()}`);
  },
};
