# Use Node.js base image
FROM node:18

# Set working directory
WORKDIR /app

# Clone the repo (this assumes the repository is public)
RUN git clone https://github.com/yourusername/your-repo.git .

# Install dependencies
RUN npm install

# Start the bot
CMD ["node", "bot.js"]
