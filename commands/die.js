// commands/die.js — "lamar die" shuts the bot process down.
//
// This is a destructive, unauthenticated-by-default action (client.destroy()),
// so it must be restricted to the bot owner/admin. Anyone else just gets a
// snarky refusal instead of being able to take the bot offline.
const OWNER_ID = process.env.BOT_OWNER_ID || "1063760251951792140"; // hackatoa

module.exports = {
  name: "die",
  aliases: [],
  category: "Infos",
  utilisation: "{prefix} dice",

  execute(client, message, args) {
    if (message.author.id !== OWNER_ID) {
      message.channel.send("Nah, I ain't dying for you.");
      return;
    }

    message.channel.send("deding");
    setTimeout(function () {
      client.destroy();
    }, 1000);
  },
};
