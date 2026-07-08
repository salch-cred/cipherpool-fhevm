import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const cipherTrustAddress = process.env.CIPHERTRUST_ADDRESS;
  if (!cipherTrustAddress) {
    console.error("Error: CIPHERTRUST_ADDRESS environment variable not set.");
    process.exit(1);
  }

  console.log("======================================================================");
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || "http://localhost:8545");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
  console.log(`Starting CipherTrust Telemetry Oracle Daemon: ${wallet.address}`);
  console.log(`Target Protocol Contract Address: ${cipherTrustAddress}`);
  console.log("======================================================================");

  // Core execution loop
  while (true) {
    try {
      console.log(`[${new Date().toLocaleTimeString()}] Fetching agent telemetry coordinates...`);
      
      // Simulate real-time physical drone telemetry
      const x = Math.floor(Math.random() * 80) + 10;
      const y = Math.floor(Math.random() * 80) + 10;
      
      // Compute correct distance squares to beacons: A(10,10), B(90,10), C(50,80)
      const distA = Math.pow(x - 10, 2) + Math.pow(y - 10, 2);
      const distB = Math.pow(x - 90, 2) + Math.pow(y - 10, 2);
      const distC = Math.pow(x - 50, 2) + Math.pow(y - 80, 2);

      console.log(`Generated Coordinates: (${x}, ${y}) | DistSq: A=${distA}, B=${distB}, C=${distC}`);
      console.log("Pushing telemetry update successfully simulated.");
    } catch (e) {
      console.error("Error in oracle execution loop:", e);
    }
    
    // Wait for next telemetry submission round (e.g. 60 seconds)
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
