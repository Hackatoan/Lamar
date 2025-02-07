# Use a Node.js base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Set environment variables at runtime
ENV NODE_ENV=production

# Start the bot
CMD ["node", "bot.js"]
