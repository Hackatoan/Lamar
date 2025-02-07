# Use Node.js as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the bot's files
COPY . .

# Expose necessary ports (optional, only if needed)
EXPOSE 3000 

# Set environment variables (optional, better in stack config)
ENV NODE_ENV=production

# Start the bot
CMD ["node", "bot.js"]
