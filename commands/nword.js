module.exports = {
  name: "nword",
  description: "Give the user the n-word pass",
  execute(client, message, args) {
    message.channel.send(
      "<@!" +
        message.author.id +
        "> you now have the n-word pass NOW SAY IT !!!!!!!!!!!!!!!"
    );
  },
};
