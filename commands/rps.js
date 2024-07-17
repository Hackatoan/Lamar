module.exports = {
  name: "rps",
  description: "Play rock-paper-scissors",
  execute(client, message, args) {
    if (!args.length) {
      return message.channel.send(
        "Please provide a choice: rock, paper, or scissors."
      );
    }

    const choices = ["rock", "paper", "scissors"];
    const userChoice = args[0].toLowerCase();

    if (!choices.includes(userChoice)) {
      return message.channel.send(
        "Invalid choice. Please choose rock, paper, or scissors."
      );
    }

    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    message.channel.send(`You chose: ${userChoice}`);
    message.channel.send(`I chose: ${botChoice}`);

    if (userChoice === botChoice) {
      message.channel.send("It's a draw!");
    } else if (
      (userChoice === "rock" && botChoice === "scissors") ||
      (userChoice === "scissors" && botChoice === "paper") ||
      (userChoice === "paper" && botChoice === "rock")
    ) {
      message.channel.send("You win!");
    } else {
      message.channel.send("You lose!");
    }
  },
};
