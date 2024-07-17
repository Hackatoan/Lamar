// commands/help.js
module.exports = {
  name: "test",
  description: "test command",
  execute(message) {
    const helpMessage = `this is working`;
    message.channel.send(helpMessage);
  },
};
