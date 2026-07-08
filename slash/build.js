// slash/build.js — /build: ask Claude Code (via the host bridge, no API) to
// generate a self-contained webpage and publish it at lamarlive.hackatoa.com.
//
// Role-gated to the Niggiwagas server's role. Each user gets a gallery at
// /u/<id>/ and can hold up to MAX_BUILDS pages; /build delete frees a slot.
//
//   /build create prompt:<text> [name:<slug>]
//   /build list
//   /build delete name:<slug>

const fs = require("fs/promises");
const fss = require("fs");
const path = require("path");
const crypto = require("crypto");
const { SlashCommandBuilder } = require("discord.js");
const storage = require("node-persist");

const PAGES_DIR = process.env.LAMARLIVE_PAGES_DIR || "/pages";
const JOBS_DIR = process.env.LAMARLIVE_JOBS_DIR || "/jobs";
const PUBLIC_BASE = process.env.LAMARLIVE_BASE || "https://lamarlive.hackatoa.com";
const BUILD_ROLE_ID = process.env.BUILD_ROLE_ID || "1391691724283318312"; // NiggiWagas
const GUILD_ID = process.env.BUILD_GUILD_ID || "1391661812918779934"; // Niggiwagas
const ADMIN_USER_ID = process.env.BUILD_ADMIN_ID || "1063760251951792140"; // hackatoa
const MAX_BUILDS = parseInt(process.env.BUILD_MAX, 10) || 10;
const COOLDOWN_MS = parseInt(process.env.BUILD_COOLDOWN_MS, 10) || 120 * 1000;
const RESULT_TIMEOUT_MS = 160 * 1000;

const data = new SlashCommandBuilder()
  .setName("build")
  .setDescription("Build & deploy a webpage with Lamar (NiggiWagas role only)")
  .addSubcommand((sc) =>
    sc
      .setName("create")
      .setDescription("Build a new page from a prompt")
      .addStringOption((o) =>
        o.setName("prompt").setDescription("What should the page be?").setRequired(true)
      )
      .addStringOption((o) =>
        o.setName("name").setDescription("Optional custom name for the page")
      )
  )
  .addSubcommand((sc) => sc.setName("list").setDescription("List your builds"))
  .addSubcommand((sc) =>
    sc
      .setName("delete")
      .setDescription("Delete one of your builds to free a slot")
      .addStringOption((o) =>
        o.setName("name").setDescription("The build's name/slug").setRequired(true)
      )
  )
  .addSubcommandGroup((g) =>
    g
      .setName("admin")
      .setDescription("Admin-only build management")
      .addSubcommand((sc) =>
        sc
          .setName("list")
          .setDescription("List all builds, or one user's")
          .addUserOption((o) => o.setName("user").setDescription("Filter to this user"))
      )
      .addSubcommand((sc) =>
        sc
          .setName("delete")
          .setDescription("Delete a specific user's build")
          .addUserOption((o) => o.setName("user").setDescription("Build owner").setRequired(true))
          .addStringOption((o) => o.setName("name").setDescription("Build slug").setRequired(true))
      )
      .addSubcommand((sc) =>
        sc
          .setName("wipe")
          .setDescription("Wipe ALL of a user's builds")
          .addUserOption((o) => o.setName("user").setDescription("Build owner").setRequired(true))
      )
  );

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

function userDir(userId) {
  return path.join(PAGES_DIR, "u", userId);
}

async function listBuilds(userId) {
  const dir = userDir(userId);
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const builds = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    let meta = { title: e.name, prompt: "", created: null };
    try {
      meta = { ...meta, ...JSON.parse(await fs.readFile(path.join(dir, e.name, "meta.json"), "utf8")) };
    } catch {
      /* no meta — use defaults */
    }
    builds.push({ slug: e.name, ...meta });
  }
  builds.sort((a, b) => (b.created || 0) - (a.created || 0));
  return builds;
}

async function allUsers() {
  let entries;
  try {
    entries = await fs.readdir(path.join(PAGES_DIR, "u"), { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    out.push({ userId: e.name, builds: await listBuilds(e.name) });
  }
  return out;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

async function writeGallery(userId, displayName) {
  const builds = await listBuilds(userId);
  const cards = builds
    .map(
      (b) =>
        `<a class="card" href="./${encodeURIComponent(b.slug)}/">` +
        `<div class="t">${esc(b.title || b.slug)}</div>` +
        `<div class="p">${esc((b.prompt || "").slice(0, 120))}</div></a>`
    )
    .join("\n");
  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${esc(displayName)}'s builds</title><style>` +
    `body{background:#0d0d10;color:#e6e6e6;font:16px/1.5 system-ui,sans-serif;max-width:820px;margin:6vh auto;padding:0 20px}` +
    `h1{font-size:1.5rem}a{color:inherit;text-decoration:none}` +
    `.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));margin-top:20px}` +
    `.card{display:block;background:#17171d;border:1px solid #26262e;border-radius:12px;padding:14px;transition:.15s}` +
    `.card:hover{border-color:#5865f2;transform:translateY(-2px)}` +
    `.t{font-weight:600;margin-bottom:4px}.p{color:#9a9aa5;font-size:.85rem}` +
    `.empty{color:#9a9aa5;margin-top:20px}</style></head><body>` +
    `<h1>🛠️ ${esc(displayName)}'s builds</h1>` +
    (builds.length ? `<div class="grid">${cards}</div>` : `<p class="empty">No builds yet.</p>`) +
    `</body></html>`;
  await fs.mkdir(userDir(userId), { recursive: true });
  await fs.writeFile(path.join(userDir(userId), "index.html"), html);
}

// Send a job to the host builder and wait for its result file.
function runBuild(prompt) {
  const id = crypto.randomUUID();
  const jobPath = path.join(JOBS_DIR, "queue", id + ".json");
  const resPath = path.join(JOBS_DIR, "results", id + ".json");
  fss.writeFileSync(jobPath, JSON.stringify({ id, prompt }));
  return new Promise((resolve) => {
    const started = Date.now();
    const iv = setInterval(() => {
      if (fss.existsSync(resPath)) {
        clearInterval(iv);
        let res;
        try {
          res = JSON.parse(fss.readFileSync(resPath, "utf8"));
        } catch {
          res = { ok: false, error: "couldn't read build result" };
        }
        try { fss.unlinkSync(resPath); } catch {}
        resolve(res);
      } else if (Date.now() - started > RESULT_TIMEOUT_MS) {
        clearInterval(iv);
        try { fss.unlinkSync(jobPath); } catch {}
        resolve({ ok: false, error: "build timed out" });
      }
    }, 1500);
  });
}

async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  // ---- admin group: hackatoa only, and bypasses the role gate ----
  if (group === "admin") {
    if (interaction.user.id !== ADMIN_USER_ID) {
      return interaction.reply({ content: "🚫 `/build admin` is owner-only.", ephemeral: true });
    }
    return adminExecute(interaction, sub);
  }

  // ---- everything else: NiggiWagas role only ----
  const hasRole = interaction.member?.roles?.cache?.has(BUILD_ROLE_ID);
  if (!hasRole) {
    return interaction.reply({
      content: "🚫 Only members with the **NiggiWagas** role can use `/build`.",
      ephemeral: true,
    });
  }

  const userId = interaction.user.id;
  const displayName = interaction.member?.displayName || interaction.user.username;

  // ---- list ----
  if (sub === "list") {
    const builds = await listBuilds(userId);
    if (!builds.length) {
      return interaction.reply({
        content: `You got no builds yet. Make one with \`/build create\`. (${MAX_BUILDS} max)`,
        ephemeral: true,
      });
    }
    const lines = builds
      .map((b) => `• **${b.title || b.slug}** — ${PUBLIC_BASE}/u/${userId}/${b.slug}/`)
      .join("\n");
    return interaction.reply({
      content: `Your builds (${builds.length}/${MAX_BUILDS}) — gallery: ${PUBLIC_BASE}/u/${userId}/\n${lines}`,
      ephemeral: true,
    });
  }

  // ---- delete ----
  if (sub === "delete") {
    const slug = slugify(interaction.options.getString("name"));
    const target = path.join(userDir(userId), slug);
    // guard against traversal — resolved path must stay under the user's dir
    if (!slug || !path.resolve(target).startsWith(path.resolve(userDir(userId)) + path.sep)) {
      return interaction.reply({ content: "Bad build name.", ephemeral: true });
    }
    if (!fss.existsSync(target)) {
      return interaction.reply({ content: `No build named \`${slug}\`.`, ephemeral: true });
    }
    await fs.rm(target, { recursive: true, force: true });
    await writeGallery(userId, displayName);
    return interaction.reply({ content: `🗑️ Deleted \`${slug}\`.`, ephemeral: true });
  }

  // ---- create ----
  const prompt = interaction.options.getString("prompt");

  // build-count cap
  const builds = await listBuilds(userId);
  if (builds.length >= MAX_BUILDS) {
    return interaction.reply({
      content: `You're maxed at ${MAX_BUILDS} builds. Delete one first: \`/build delete\`.`,
      ephemeral: true,
    });
  }

  // per-user cooldown
  const cdKey = `build_cd_${userId}`;
  const last = (await storage.getItem(cdKey)) || 0;
  const wait = COOLDOWN_MS - (Date.now() - last);
  if (wait > 0) {
    return interaction.reply({
      content: `⏳ Slow down — try again in ${Math.ceil(wait / 1000)}s.`,
      ephemeral: true,
    });
  }

  // slug (custom name or derived from prompt), de-duped
  let base = slugify(interaction.options.getString("name") || prompt) || "page";
  let slug = base;
  let n = 2;
  while (fss.existsSync(path.join(userDir(userId), slug))) slug = `${base}-${n++}`;

  await storage.setItem(cdKey, Date.now());
  await interaction.reply(`🛠️ Lamar's cookin' up \`${slug}\`… gimme a minute.`);

  const result = await runBuild(prompt);

  if (!result.ok) {
    const msg = String(result.error || "build failed");
    const friendly = msg.startsWith("AUTH:")
      ? "⚠️ The builder's Claude auth is expired on the host — an admin needs to re-login. Try again after."
      : `❌ Build failed: ${msg.slice(0, 300)}`;
    return interaction.editReply(friendly);
  }

  // publish
  const dir = path.join(userDir(userId), slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), result.html);
  await fs.writeFile(
    path.join(dir, "meta.json"),
    JSON.stringify({ title: slug, prompt, by: displayName, created: Date.now() })
  );
  await writeGallery(userId, displayName);

  const url = `${PUBLIC_BASE}/u/${userId}/${slug}/`;
  return interaction.editReply(`✅ Done! <@${userId}> your page is live: ${url}`);
}

// ---- admin handlers (hackatoa only) ----
async function adminExecute(interaction, sub) {
  if (sub === "list") {
    const target = interaction.options.getUser("user");
    if (target) {
      const builds = await listBuilds(target.id);
      if (!builds.length) {
        return interaction.reply({ content: `<@${target.id}> has no builds.`, ephemeral: true });
      }
      const lines = builds
        .map((b) => `• \`${b.slug}\` — ${PUBLIC_BASE}/u/${target.id}/${b.slug}/`)
        .join("\n");
      return interaction.reply({
        content: `<@${target.id}> — ${builds.length}/${MAX_BUILDS}\n${lines}`,
        ephemeral: true,
      });
    }
    const users = await allUsers();
    if (!users.length) {
      return interaction.reply({ content: "Nobody's built anything yet.", ephemeral: true });
    }
    const total = users.reduce((a, u) => a + u.builds.length, 0);
    const lines = users
      .sort((a, b) => b.builds.length - a.builds.length)
      .map((u) => `• <@${u.userId}> — ${u.builds.length}`)
      .join("\n");
    return interaction.reply({
      content: `**${total}** build(s) across **${users.length}** user(s):\n${lines}`,
      ephemeral: true,
    });
  }

  const target = interaction.options.getUser("user");

  if (sub === "wipe") {
    const builds = await listBuilds(target.id);
    await fs.rm(userDir(target.id), { recursive: true, force: true });
    return interaction.reply({
      content: `🗑️ Wiped ${builds.length} build(s) from <@${target.id}>.`,
      ephemeral: true,
    });
  }

  if (sub === "delete") {
    const slug = slugify(interaction.options.getString("name"));
    const targetDir = path.join(userDir(target.id), slug);
    if (!slug || !path.resolve(targetDir).startsWith(path.resolve(userDir(target.id)) + path.sep)) {
      return interaction.reply({ content: "Bad build name.", ephemeral: true });
    }
    if (!fss.existsSync(targetDir)) {
      return interaction.reply({ content: `<@${target.id}> has no build \`${slug}\`.`, ephemeral: true });
    }
    await fs.rm(targetDir, { recursive: true, force: true });
    let name = target.username;
    try {
      const m = await interaction.guild.members.fetch(target.id);
      name = m.displayName;
    } catch {
      /* fall back to username */
    }
    await writeGallery(target.id, name);
    return interaction.reply({
      content: `🗑️ Deleted \`${slug}\` from <@${target.id}>.`,
      ephemeral: true,
    });
  }
}

module.exports = { data, execute, guildId: GUILD_ID };
