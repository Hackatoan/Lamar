// slash/language.js — /language sets the language Lamar replies in for this server.
// Stored per-guild in node-persist (shared singleton); read by bot.js when it
// builds the system prompt for each LLM reply.
const { SlashCommandBuilder } = require("discord.js");
const storage = require("node-persist");
const { LANGS, langKey } = require("../lang");

const data = new SlashCommandBuilder()
  .setName("language")
  .setDescription("Set the language Lamar replies in for this server")
  .addStringOption((o) =>
    o
      .setName("language")
      .setDescription("Language Lamar will talk in")
      .setRequired(true)
      .addChoices(
        ...Object.entries(LANGS).map(([value, { label }]) => ({ name: label, value }))
      )
  );

async function execute(interaction) {
  const code = interaction.options.getString("language");
  await storage.setItem(langKey(interaction.guildId), code);
  const label = (LANGS[code] || LANGS.en).label;
  await interaction.reply(`aight — Lamar talkin' in **${label}** now for this whole server. 🌍`);
}

module.exports = { data, execute };
