// slash/edit.js — /edit: revise an existing build. Reads the current page,
// sends it plus the requested change through the same host bridge (Claude Code,
// tools disabled), and republishes to the same URL. NiggiWagas role only.

const fs = require("fs/promises");
const fss = require("fs");
const path = require("path");
const { SlashCommandBuilder } = require("discord.js");
const storage = require("node-persist");
const {
  userDir, listBuilds, runBuild, writeGallery, slugify,
  PUBLIC_BASE, BUILD_ROLE_ID, COOLDOWN_MS, guildId,
} = require("./build.js");

const data = new SlashCommandBuilder()
  .setName("edit")
  .setDescription("Edit one of your existing builds (NiggiWagas role only)")
  .addStringOption((o) =>
    o.setName("name").setDescription("The build to edit (its name/slug)").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("prompt").setDescription("What to change").setRequired(true)
  );

async function execute(interaction) {
  const hasRole = interaction.member?.roles?.cache?.has(BUILD_ROLE_ID);
  if (!hasRole) {
    return interaction.reply({
      content: "🚫 Only members with the **NiggiWagas** role can use `/edit`.",
      ephemeral: true,
    });
  }

  const userId = interaction.user.id;
  const displayName = interaction.member?.displayName || interaction.user.username;
  const slug = slugify(interaction.options.getString("name"));
  const changes = interaction.options.getString("prompt");

  const dir = userDir(userId);
  const buildDir = path.join(dir, slug);
  const indexPath = path.join(buildDir, "index.html");
  if (
    !slug ||
    !path.resolve(buildDir).startsWith(path.resolve(dir) + path.sep) ||
    !fss.existsSync(indexPath)
  ) {
    return interaction.reply({
      content: `No build named \`${slug}\`. Check \`/build list\`.`,
      ephemeral: true,
    });
  }

  // shared cooldown with /build
  const cdKey = `build_cd_${userId}`;
  const last = (await storage.getItem(cdKey)) || 0;
  const wait = COOLDOWN_MS - (Date.now() - last);
  if (wait > 0) {
    return interaction.reply({
      content: `⏳ Slow down — try again in ${Math.ceil(wait / 1000)}s.`,
      ephemeral: true,
    });
  }

  const current = await fs.readFile(indexPath, "utf8");
  await storage.setItem(cdKey, Date.now());
  await interaction.reply(`✏️ Lamar's tweakin' \`${slug}\`… gimme a sec.`);

  const editPrompt =
    "Here is an existing complete HTML page:\n\n" +
    current +
    "\n\nApply these changes: " +
    changes +
    "\n\nReturn the COMPLETE updated HTML document — keep everything that wasn't asked to change.";

  const result = await runBuild(editPrompt);

  if (!result.ok) {
    const msg = String(result.error || "edit failed");
    const friendly = msg.startsWith("AUTH:")
      ? "⚠️ The builder's Claude auth is expired on the host — an admin needs to re-login. Try again after."
      : `❌ Edit failed: ${msg.slice(0, 300)}`;
    return interaction.editReply(friendly);
  }

  await fs.writeFile(indexPath, result.html);
  try {
    const metaPath = path.join(buildDir, "meta.json");
    let meta = {};
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    } catch {
      /* no meta yet */
    }
    meta.edited = Date.now();
    meta.lastEdit = changes;
    await fs.writeFile(metaPath, JSON.stringify(meta));
  } catch {
    /* meta is best-effort */
  }
  await writeGallery(userId, displayName);

  return interaction.editReply(
    `✅ Updated! ${PUBLIC_BASE}/u/${userId}/${slug}/ — hard-refresh (Ctrl/Cmd+Shift+R) to see it.`
  );
}

module.exports = { data, execute, guildId };
