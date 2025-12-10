# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install npm dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port (default gateway port)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
