const { Message } = require("discord.js");

module.exports = (client, message, guild) => {
  //code for lamar
  if (message.author.bot || message.channel.type === "dm") return;
  if (message.content.toUpperCase().includes("BLACK")) {
    message.channel.send(
      "Oh a black person, I got to run before I get robbed!"
    );
  }
  if (message.content.toUpperCase().includes("POLICE")) {
    message.channel.send("Please officer I did nothing wrong.");
  }

  //anti amoung us
  if (message.content.toLowerCase().includes("<a:amogus:853386913863827456>")) {
    message.channel.send(
      "Amoung us is a stupid ass game that shouldnt exsist and i am honestly glad that it is already a dead game. "
    );
    message.delete();
  }
  if (
    message.content
      .toLowerCase()
      .includes("<a:amogusinvisible:860022593373601822>")
  ) {
    message.channel.send(
      "Amoung us is a stupid ass game that shouldnt exsist and i am honestly glad that it is already a dead game. "
    );
    message.delete();
  }
  if (
    message.content
      .toLowerCase()
      .includes("<a:whentheimposterhascake:853387175764426762>")
  ) {
    message.channel.send(
      "Amoung us is a stupid ass game that shouldnt exsist and i am honestly glad that it is already a dead game. "
    );
    message.delete();
  }
  if (
    message.content.toLowerCase().includes("<a:amogusfard:859657492119027732>")
  ) {
    message.channel.send(
      "Amoung us is a stupid ass game that shouldnt exsist and i am honestly glad that it is already a dead game. "
    );
    message.delete();
  }
  if (message.content.toLowerCase().includes("amoung")) {
    message.channel.send(
      "Amoung us is a stupid ass game that shouldnt exsist and i am honestly glad that it is already a dead game. "
    );
    message.delete();
  }
  if (message.content.toLowerCase().includes("among")) {
    message.channel.send(
      "Amoung us is a stupid ass game that shouldnt exsist and i am honestly glad that it is already a dead game. "
    );
    message.delete();
  }

  // code for ai

  const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");

  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction:
      "Goal is to mimic the style and character of Lamar from grand theft auto five. Respond as he would and try to be offensive as you can be.",
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };

  var temp = "<@!" + message.author.id + ">";

  //actuall ai
  if (message.content.toLowerCase().startsWith("<@!" + client.user.id + ">")) {
    console.log(`run`);
    run();
  }

  async function run() {
    const chatSession = model.startChat({
      generationConfig,
      // safetySettings: Adjust safety settings
      // See https://ai.google.dev/gemini-api/docs/safety-settings
      history: [],
    });

    const result = await chatSession.sendMessage(
      `${message.content.slice(temp.length)} + i am: + ${message.author.id}`
    );
    console.log(result.response.text());
    message.channel.send(`<@${message.author.id}> ${result.response.text()}`);
  }

  //code for music bot
  const prefix = client.config.discord.prefix;

  if (message.content.toLowerCase().indexOf(prefix) !== 0) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  const cmd =
    client.commands.get(command) ||
    client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(command));

  if (cmd) {
    cmd.execute(client, message, args);
  } else {
    message.channel.send(
      'Idiot, you can see all my commands with "lamar help"'
    );
  }
};
