module.exports = {
  name: "nwordattack",
  description: "Give a person the n-word pass",
  execute(client, message, args) {
    message.channel.send(
      args[0] + " you now have the n-word pass NOW SAY IT !!!!!!!!!!!!!!!"
    );
  },
};
