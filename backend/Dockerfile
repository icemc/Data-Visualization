FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["npm", "start"]