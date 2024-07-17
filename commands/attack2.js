module.exports = {
  name: "attack2",
  description: "Repeatedly call a person a derogatory term",
  execute(client, message, args) {
    let x = 1;
    if (args[1]) {
      x = parseInt(args[1]);
    }

    while (x >= 1) {
      message.channel.send(args[0] + " is a nigger");
      x -= 1;
    }
  },
};
