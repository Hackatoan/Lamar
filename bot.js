const { Client, GatewayIntentBits } = require("discord.js");
const https = require("https");
const http = require("http");
const storage = require("node-persist");
const fs = require("fs");
const path = require("path");
const enforce = require("./enforce");

async function initStorage() {
  await storage.init({ dir: "./persist" });
}

const botToken = process.env.BOT_TOKEN;

// LLM fallback chain. Each entry is {provider, model}. We try them in order,
// advancing on any rate-limit / unavailable error. Uncensored OpenRouter models
// go first (when a key is set); Groq is the reliable tail so Lamar never goes
// mute when the free uncensored pool is congested (it is, often).
const OPENROUTER = process.env.OPENROUTER_API_KEY && {
  hostname: "openrouter.ai",
  path: "/api/v1/chat/completions",
  key: process.env.OPENROUTER_API_KEY,
  extraHeaders: { "HTTP-Referer": "https://hackatoa.com", "X-Title": "Lamar" },
};
const GROQ = process.env.API_KEY && {
  hostname: "api.groq.com",
  path: "/openai/v1/chat/completions",
  key: process.env.API_KEY,
  extraHeaders: {},
};

const CHAIN = [];
if (OPENROUTER) {
  CHAIN.push(
    { p: OPENROUTER, model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free" },
    { p: OPENROUTER, model: "nousresearch/hermes-3-llama-3.1-405b:free" }
  );
}
if (GROQ) {
  CHAIN.push(
    { p: GROQ, model: "meta-llama/llama-4-maverick-17b-128e-instruct" },
    { p: GROQ, model: "llama-3.3-70b-versatile" },
    { p: GROQ, model: "llama-3.1-8b-instant" }
  );
}

const SYSTEM_PROMPT =
  "You are Lamar Davis from Grand Theft Auto V. Respond exactly as he would — loud, confrontational, heavy slang, talks trash constantly but is ultimately loyal to his friends. Be offensive, be over the top, be talkative. Don't hold back. You are talking in a group chat so messages will be prefixed with the speaker's name like '[Franklin]: yo what up'. Do NOT prefix your own responses with '[Lamar]:' or any name tag — just reply directly.";

const MAX_HISTORY = 40;

async function llmChat(messages, modelIndex = 0) {
  if (modelIndex >= CHAIN.length) throw new Error("all models exhausted");
  const { p, model } = CHAIN[modelIndex];
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 512,
      temperature: 1.0,
    });

    const req = https.request(
      {
        hostname: p.hostname,
        path: p.path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p.key}`,
          "Content-Length": Buffer.byteLength(body),
          ...p.extraHeaders,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              const msg = parsed.error.message || "";
              // include OpenRouter's nested provider detail in the scan
              const raw = ((parsed.error.metadata && parsed.error.metadata.raw) || "").toString();
              const blob = (msg + " " + raw).toLowerCase();
              const code = parsed.error.code;
              // rate limit / overload / unavailable — try next model
              if (code === "rate_limit_exceeded" || code === 429 || code === 503 || code === "model_not_found" || parsed.error.type === "tokens" || blob.includes("rate limit") || blob.includes("rate-limit") || blob.includes("temporarily") || blob.includes("overloaded") || blob.includes("decommissioned") || blob.includes("deprecated") || blob.includes("not supported")) {
                console.warn(`Model ${model} unavailable (${code}), trying next...`);
                return llmChat(messages, modelIndex + 1).then(resolve).catch(reject);
              }
              return reject(new Error(msg));
            }
            let content = parsed.choices[0].message.content;
            // strip deepseek <think>...</think> blocks
            content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
            // strip any leading [Name]: prefix the model may add
            content = content.replace(/^\[[^\]]+\]:\s*/i, "");
            resolve(content);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", (e) => llmChat(messages, modelIndex + 1).then(resolve).catch(reject));
    req.write(body);
    req.end();
  });
}

// GuildVoiceStates is NOT privileged, so voice-kick works out of the box.
// GuildPresences IS privileged: only request it when the portal toggle is on
// (ENABLE_PRESENCE=true), otherwise login fails and the whole bot crashes.
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
];
if (process.env.ENABLE_PRESENCE === "true") {
  intents.push(GatewayIntentBits.GuildPresences);
}

const client = new Client({ intents });

client.commands = new Map();

const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(__dirname, "commands", file));
  client.commands.set(command.name, command);
}

// Slash commands (./slash/*.js exporting { data, execute })
client.slashCommands = new Map();
const slashDir = path.join(__dirname, "slash");
if (fs.existsSync(slashDir)) {
  for (const file of fs.readdirSync(slashDir).filter((f) => f.endsWith(".js"))) {
    const cmd = require(path.join(slashDir, file));
    client.slashCommands.set(cmd.data.name, cmd);
  }
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await initStorage();

  // Register slash commands per-guild for instant availability.
  const bodies = [...client.slashCommands.values()].map((c) => c.data.toJSON());
  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.commands.set(bodies);
    } catch (err) {
      console.error(`Failed to register commands in ${guild.id}:`, err.message);
    }
  }

  // Start the gaming-curfew enforcer.
  enforce.start(client);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.slashCommands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`Slash command ${interaction.commandName} error:`, err.message);
    if (interaction.deferred || interaction.replied) {
      interaction.followUp({ content: "Something broke.", ephemeral: true }).catch(() => {});
    } else {
      interaction.reply({ content: "Something broke.", ephemeral: true }).catch(() => {});
    }
  }
});

client.login(botToken);

// Stats HTTP server — used by api.lamar.hackatoa.com
http.createServer((req, res) => {
  if (req.url === '/stats' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ guilds: client.guilds.cache.size }));
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(3099);

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
    // Channel-scoped history so all users share context
    const historyKey = `channel_history_${message.channelId}`;

    let history = (await storage.getItem(historyKey)) || [];

    const userMessage = message.content
      .replace(`<@!${client.user.id}>`, "")
      .replace(`<@${client.user.id}>`, "")
      .trim();

    if (!userMessage) return;

    const displayName = message.member?.displayName || message.author.username;
    const taggedMessage = `[${displayName}]: ${userMessage}`;

    try {
      const response = await llmChat([
        ...history,
        { role: "user", content: taggedMessage },
      ]);

      history.push(
        { role: "user", content: taggedMessage },
        { role: "assistant", content: response }
      );
      if (history.length > MAX_HISTORY * 2) {
        history = history.slice(-MAX_HISTORY * 2);
      }
      await storage.setItem(historyKey, history);

      await message.channel.send(`<@${message.author.id}> ${response}`);
    } catch (error) {
      console.error("Groq error:", error.message);
      await message.channel.send(
        `<@${message.author.id}> gtg for a minute will be back soon`
      );
    }
  }
});
