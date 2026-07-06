# Use a Node.js base image (20+ required: node-ical uses the regex `v` flag)
FROM node:20-alpine

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
