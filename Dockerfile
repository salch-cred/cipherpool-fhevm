FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy dependency mappings and install
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Compile TS files to dist/
RUN npx tsc

# Expose port (HF requires this for Docker spaces)
EXPOSE 7860

# Run the compiled javascript directly for instant boot
CMD ["node", "dist/scripts/oracle_service.js"]
