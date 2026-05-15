[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/hackatoa)

# Lamar

A Discord bot inspired by Lamar from GTA V. Uses the Gemini API and Google Search to generate in-character responses.

## Features

- Responds in Lamar's voice using Gemini for text generation
- Google Search integration for current-events awareness
- Docker-ready

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
