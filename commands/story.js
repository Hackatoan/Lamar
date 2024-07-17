module.exports = {
  name: "story",
  description: "Tell a predefined story",
  execute(client, message, args) {
    if (args[0] == 1) {
      message.channel.send(
        "So, I was walking down to the store, not to buy groceries or anything but head behind it to buy some weed. You know I'm a heavy stoner and all that. The deal went alright got a slight discount since the dealer is a good buddy of mine. So anyway, I was walking home and got bored so I started smoking it. The walk took an extra hour long but, I did eventually get home."
      );
      message.channel.send(
        "At home I just sat down and dosed off till the next day. This day I actually had to buy some groceries so I grabbed my wallet and left the house. Halfway through walking I was stopped by a police officer. I asked him what was wrong and he said that someone had robbed the house next door. I told him that I wasn't here last night, but he didn't care he dropped me to the ground and put his knee on my neck."
      );
      message.channel.send(
        "So me knowing I didn't do anything wrong I told him that I couldn't breathe but he didn't care. Eventually I just died."
      );
    } else {
      message.channel.send("Sorry we don't have that many stories yet");
    }
  },
};
