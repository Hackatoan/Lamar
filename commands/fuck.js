module.exports = {
  name: "fuck",
  description: "Insult a person",
  execute(client, message, args) {
    message.channel.send(args[0] + " has been raped successfully by me.");
  },
};
