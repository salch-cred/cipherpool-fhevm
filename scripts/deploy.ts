import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying CipherTrust with account:", deployer.address);

  const CipherTrust = await ethers.getContractFactory("CipherTrust");
  const cipherTrust = await CipherTrust.deploy();
  await cipherTrust.waitForDeployment();

  console.log("CipherTrust deployed to:", await cipherTrust.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
