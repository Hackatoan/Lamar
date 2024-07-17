module.exports = {
  name: "backup",
  description: "Randomly affirm or insult the user",
  execute(client, message, args) {
    function random(min, max) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      return num;
    }

    const x = random(0, 1);
    x
      ? message.channel.send(
          "Yeah <@!" + message.author.id + "> knows what he is talking about"
        )
      : message.channel.send(
          "No, <@!" + message.author.id + "> is a fucking idiot"
        );
  },
};
