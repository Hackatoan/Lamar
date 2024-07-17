module.exports = {
  name: "shoot",
  description: "Insult a person",
  execute(client, message, args) {
    message.channel.send(args[0] + " get owned stupid bitch ass nigger.");
  },
};
