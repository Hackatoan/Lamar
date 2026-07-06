[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/hackatoa)

# Lamar

A Discord bot inspired by Lamar from GTA V. Uses the Gemini API and Google Search to generate in-character responses.

## Features

- Responds in Lamar's voice using Gemini for text generation
- Google Search integration for current-events awareness
- **Gaming curfew** — kicks a target user from voice (and nudges them off games)
  outside of designated free time, read from a Google Calendar iCal feed
- `/bypass` — target can ask the group to let them stay on; 2+ "kick him" votes
  vetoes it, otherwise they get a pass for the rest of the current block
- Docker-ready

## Curfew configuration (env)

| Var | Required | Purpose |
|-----|----------|---------|
| `CALENDAR_ICAL_URL` | yes* | Secret iCal URL of the free-time calendar. **Unset → curfew is disabled (fails open, never kicks).** |
| `TARGET_USER_ID` | no | User the curfew applies to. Default `651282581442002945`. |
| `ENABLE_PRESENCE` | no | `true` to enable game-activity nudges. **Requires the "Presence Intent" toggle in the Discord Developer Portal**, else the bot won't start. Voice-kick works without it. |
| `GAME_FILTER` | no | Only nudge when the game name contains this substring (case-insensitive). Empty = any game. |

Event on the calendar = free time allowed. Outside events = curfew enforced.

The bot also needs the **Move Members** permission and a role above the target
to disconnect them from voice.

## Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/Hackatoan/Lamar
   cd Lamar
   ```

2. Update `docker-compose.yml` with your credentials:
   - `DISCORD_TOKEN` — your Discord bot token
   - `GEMINI_API_KEY` — Google Gemini API key
   - Any Google Search API credentials

3. Start the bot:
   ```bash
   docker compose up --build -d
   ```

---

[hackatoa.com](https://hackatoa.com) · [GitHub](https://github.com/Hackatoan) · [Buy Me A Coffee](https://buymeacoffee.com/hackatoa)
