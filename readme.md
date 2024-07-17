discord bot based on Lamar from gta V. Bot uses gemini and google api to create responses.
proably does not need all the intents but im lazy.

How to run
Node: clone the repo, use example.config.json to create a config.json file, fill in config, run npm install, type node bot.js in terminal

Docker: clone the repo (git clone https://github.com/Hackatoan/Lamar), use example.config.json to create a config.json file, fill in config, docker-compose build, docker-compose up -d

bot uses node-persist for storage. Ensure the data directory used by node-persist (./persist) is mapped to a persistent volume in Docker Compose.
