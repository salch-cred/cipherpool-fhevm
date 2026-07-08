FROM node:20-alpine

WORKDIR /app

# Copy dependency mappings
COPY package*.json ./
RUN npm install --omit=dev

# Copy project files
COPY . .

# Compile smart contracts and build artifacts
RUN npx hardhat compile

# Run the oracle background daemon
CMD ["npx", "hardhat", "run", "scripts/oracle_service.ts"]
