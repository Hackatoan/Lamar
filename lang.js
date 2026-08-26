// Shared language config for the /language slash command + LLM prompt steering.
// Lamar is an LLM-persona bot, so we don't translate fixed strings — we tell the
// model to reply in the chosen language while staying fully in character.
const LANGS = {
  en: { label: "English", name: "English" },
  es: { label: "Español", name: "Spanish" },
  "pt-br": { label: "Português (BR)", name: "Brazilian Portuguese" },
  fr: { label: "Français", name: "French" },
  de: { label: "Deutsch", name: "German" },
  vi: { label: "Tiếng Việt", name: "Vietnamese" },
  th: { label: "ไทย", name: "Thai" },
};

// node-persist key for a guild's language preference (DM fallback bucket)
const langKey = (guildId) => `lang_${guildId || "dm"}`;

// Suffix appended to the system prompt to steer the reply language.
function langSuffix(code) {
  if (!code || code === "en" || !LANGS[code]) return "";
  const name = LANGS[code].name;
  return ` IMPORTANT: Reply ENTIRELY in ${name}, no matter what language the user writes in. Keep the exact same Lamar Davis energy — loud, slang-heavy, trash-talking, over the top — just express it naturally in ${name}.`;
}

module.exports = { LANGS, langKey, langSuffix };
