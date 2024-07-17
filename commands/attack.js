module.exports = {
  name: "attack",
  description: "call a person a derogatory term",

  execute(client, message, args) {
    message.channel.send(
      args[0] +
        " Is a stupid bitch ass nigger peice of shit bitch ass nigger shit."
    );
  },
};
