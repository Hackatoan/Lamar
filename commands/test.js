// commands/help.js
module.exports = {
  name: "test",
  description: "test command",
  execute(client, message) {
    const helpMessage = `this is working`;
    message.channel.send(helpMessage);
  },
};
