// slash/reset.js — /reset wipes Lamar's conversation memory.
//
// Memory is channel-scoped (all users in a channel share one history), so:
//   /reset                     -> clears this channel's memory
//   /reset scope:user user:@X  -> best-effort removes X's lines from this channel

const { SlashCommandBuilder } = require("discord.js");
const storage = require("node-persist");

const data = new SlashCommandBuilder()
  .setName("reset")
  .setDescription("Reset Lamar's conversation memory")
  .addStringOption((o) =>
    o
      .setName("scope")
      .setDescription("What to reset (default: this channel)")
      .addChoices(
        { name: "this channel", value: "channel" },
        { name: "a specific user", value: "user" }
      )
  )
  .addUserOption((o) =>
    o.setName("user").setDescription("User to forget (when scope is 'a specific user')")
  );

async function execute(interaction) {
  const scope = interaction.options.getString("scope") || "channel";
  const key = `channel_history_${interaction.channelId}`;

  if (scope === "channel") {
    await storage.removeItem(key);
    return interaction.reply("🧠 Wiped. I don't remember a damn thing said in this channel.");
  }

  // scope === "user"
  const target = interaction.options.getUser("user");
  if (!target) {
    return interaction.reply({
      content: "Gimme somebody to forget: `/reset scope:user user:@someone`.",
      ephemeral: true,
    });
  }

  let history = (await storage.getItem(key)) || [];
  if (!history.length) {
    return interaction.reply({ content: "Ain't nothing to forget in here.", ephemeral: true });
  }

  // Lines were tagged with the user's display name at write time.
  let name = target.username;
  try {
    const m = await interaction.guild.members.fetch(target.id);
    name = m.displayName;
  } catch {
    /* fall back to username */
  }
  const tag = `[${name}]:`;

  const before = history.length;
  history = history.filter(
    (e) => !(e.role === "user" && typeof e.content === "string" && e.content.startsWith(tag))
  );
  await storage.setItem(key, history);

  const removed = before - history.length;
  return interaction.reply(
    removed
      ? `🧠 Forgot ${removed} thing(s) <@${target.id}> said in this channel.`
      : `Couldn't find anything from <@${target.id}> here — maybe their nickname changed since.`
  );
}

module.exports = { data, execute };
