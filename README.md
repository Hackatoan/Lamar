# Lamar

> **🔗 Part of the Lamar project:** [Lamar](https://github.com/Hackatoan/Lamar) (Discord bot) · [lamar-web](https://github.com/Hackatoan/lamar-web) (landing site) · [lamarlive](https://github.com/Hackatoan/lamarlive) (/build gallery)

An AI-powered Discord bot in the voice of Lamar Davis (GTA V), with persistent memory.

🔗 **Live:** [lamar.hackatoa.com](https://lamar.hackatoa.com)   ·   ☕ **Support:** [Buy Me a Coffee](https://buymeacoffee.com/hackatoa)

## Overview

A character Discord bot that chats in-persona using an LLM, remembers context, and can reply in the server's chosen language.

## Features

- In-character AI chat (Gemini) with persistent memory
- Per-guild `/language` (6 languages)
- Companion landing site at lamar.hackatoa.com

## Tech Stack

Node.js · discord.js · Gemini · Docker

## Development

```bash
npm install
# set DISCORD + GEMINI keys in the environment, then:
npm start
```

## Deployment

Docker on the homelab host; GHCR + Watchtower auto-deploy.

## Support

If this project is useful to you, consider supporting development:

☕ **[Buy Me a Coffee](https://buymeacoffee.com/hackatoa)**

---

Part of the **[Hackatoa](https://hackatoa.com)** ecosystem — self-hosted apps, browser games, and bots. · [All repositories »](https://github.com/Hackatoan)
