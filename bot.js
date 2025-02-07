const { Client, GatewayIntentBits } = require("discord.js");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const storage = require("node-persist");
const fs = require("fs");
const path = require("path");

async function initStorage() {
  await storage.init({
    dir: "./persist", // you can change the directory if needed
  });
}

// Load configuration
const botToken = process.env.BOT_TOKEN;
const apiKey = process.env.API_KEY;


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const genAI = new GoogleGenerativeAI(apiKey);
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  safetySettings,
  systemInstruction:
    "Goal is to mimic the style and character of Lamar from grand theft auto five. Respond as he would and try to be offensive as you can be. Also be a bit talkative and dont just push people away",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

client.commands = new Map();

const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(__dirname, "commands", file));
  client.commands.set(command.name, command);
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await initStorage();
});

client.login(botToken);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (content.startsWith("lamar")) {
    const args = content.split(" ").slice(1);
    const commandName = args[0] ? args[0].toLowerCase() : "help";
    const command = client.commands.get(commandName);

    if (command) {
      command.execute(client, message, args.slice(1));
    } else {
      message.channel.send(`Unknown command: ${commandName}`);
    }
  }

  if (content.startsWith(`<@${client.user.id}>`)) {
    const userId = message.author.id;
    const historyKey = `history_${userId}`;

    let userHistory = (await storage.getItem(historyKey)) || [];
    console.log(userHistory);

    console.log("Bot mentioned, generating response...");

    const chatSession = model.startChat({
      generationConfig,
      history: userHistory,
    });

    const userMessage = message.content
      .replace(`<@!${client.user.id}>`, "")
      .trim();

    try {
      const result = await chatSession.sendMessage(userMessage);
      const response = result.response.text();
      console.log(response);
      // Add bot's response to the history
      await storage.setItem(historyKey, userHistory);

      await message.channel.send(`<@${message.author.id}> ${response}`);
    } catch (error) {
      console.error("Error generating response:", error);
      await message.channel.send(
        `<@${message.author.id}> Sorry, something went wrong.`
      );
    }
  }
});
