module.exports = {
  name: "help",
  description: "List all available commands",
  execute(client, message) {
    let helpMessage = "**Lamar Bot Commands:**\n";
    client.commands.forEach((command) => {
      helpMessage += `\`${command.name}\` - ${command.description}\n`;
    });
    message.channel.send(helpMessage);
  },
};
