FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY src/ ./src/
COPY public/ ./public/

# Expose port
EXPOSE 8003

# Set environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
