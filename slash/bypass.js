// slash/bypass.js — /bypass posts a veto poll to the group.
//
// The target pleads to stay on during curfew. The group votes. If at least 2
// people vote "kick him", the bypass is DENIED and enforcement stands. Otherwise
// he gets a pass for the rest of the current non-free block.

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const enforce = require("../enforce");
const { isFreeTime } = require("../freetime");

const POLL_MS = 60 * 1000; // voting window
const VETO_THRESHOLD = 2; // this many "kick him" votes denies the bypass

const data = new SlashCommandBuilder()
  .setName("bypass")
  .setDescription("Ask the group to let you stay on during curfew (they can veto).");

async function execute(interaction) {
  // No point bypassing during free time — nothing is being enforced.
  if (await isFreeTime()) {
    return interaction.reply({
      content: "It's already free time — ain't nothing to bypass. Go crazy. 😎",
      ephemeral: true,
    });
  }

  if (await enforce.isBypassActive()) {
    const until = await enforce.getBypassUntil();
    return interaction.reply({
      content: `A bypass is already active until <t:${Math.floor(
        until.getTime() / 1000
      )}:t>.`,
      ephemeral: true,
    });
  }

  const kickBtn = new ButtonBuilder()
    .setCustomId("bypass_kick")
    .setLabel("🦶 Kick him")
    .setStyle(ButtonStyle.Danger);
  const stayBtn = new ButtonBuilder()
    .setCustomId("bypass_stay")
    .setLabel("😎 Let him cook")
    .setStyle(ButtonStyle.Success);
  const row = new ActionRowBuilder().addComponents(stayBtn, kickBtn);

  const embed = new EmbedBuilder()
    .setTitle("🗳️ Bypass request")
    .setDescription(
      `<@${enforce.TARGET_USER_ID}> wants to stay on during curfew.\n\n` +
        `Vote below. **${VETO_THRESHOLD} or more "Kick him" votes** and the bypass is denied.\n` +
        `Voting closes <t:${Math.floor((Date.now() + POLL_MS) / 1000)}:R>.`
    )
    .setColor(0xf1c40f);

  await interaction.reply({ embeds: [embed], components: [row] });
  const pollMsg = await interaction.fetchReply();

  const kickVotes = new Set();
  const stayVotes = new Set();

  const collector = pollMsg.createMessageComponentCollector({ time: POLL_MS });

  collector.on("collect", async (i) => {
    if (i.customId === "bypass_kick") {
      kickVotes.add(i.user.id);
      stayVotes.delete(i.user.id);
    } else {
      stayVotes.add(i.user.id);
      kickVotes.delete(i.user.id);
    }
    await i.reply({ content: "Vote counted. ✅", ephemeral: true });

    // Short-circuit: enough veto votes, close early.
    if (kickVotes.size >= VETO_THRESHOLD) collector.stop("vetoed");
  });

  collector.on("end", async () => {
    const denied = kickVotes.size >= VETO_THRESHOLD;
    const disabledRow = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(stayBtn).setDisabled(true),
      ButtonBuilder.from(kickBtn).setDisabled(true)
    );

    let resultText;
    if (denied) {
      await enforce.clearBypass();
      resultText =
        `❌ **Bypass denied** — ${kickVotes.size} voted to kick him. ` +
        `Curfew stands. Get off, <@${enforce.TARGET_USER_ID}>.`;
    } else {
      const until = await enforce.grantBypass();
      resultText =
        `✅ **Bypass granted** — only ${kickVotes.size} vote(s) to kick. ` +
        `<@${enforce.TARGET_USER_ID}> is clear until <t:${Math.floor(
          until.getTime() / 1000
        )}:t>. Enjoy it.`;
    }

    const resultEmbed = EmbedBuilder.from(embed)
      .setDescription(
        `🦶 Kick: **${kickVotes.size}**  |  😎 Stay: **${stayVotes.size}**`
      )
      .setColor(denied ? 0xe74c3c : 0x2ecc71);

    await pollMsg.edit({ embeds: [resultEmbed], components: [disabledRow] });
    await interaction.followUp({ content: resultText });
  });
}

module.exports = { data, execute };
