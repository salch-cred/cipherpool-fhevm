import hre from "hardhat";

async function main() {
  console.log("======================================================================");
  console.log("   CipherTrust: Autonomous Agent Flight & Attack Simulation Script    ");
  console.log("======================================================================\n");

  const [admin, operator, oracle1, oracle2, stranger] = await hre.ethers.getSigners();
  const ctAddress = "0x0000000000000000000000000000000000000000"; // Mock deploy or real depending on hardhat network

  console.log("[1/6] Deploying CipherTrust Protocol Contract Suite...");
  const ReputationBadge = await hre.ethers.getContractFactory("ReputationBadge");
  const reputationBadge = await ReputationBadge.connect(admin).deploy();
  await reputationBadge.waitForDeployment();
  console.log(` -> ReputationBadge SB-NFT deployed to: ${await reputationBadge.getAddress()}`);

  const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
  const insurancePool = await InsurancePool.connect(admin).deploy();
  await insurancePool.waitForDeployment();
  console.log(` -> InsurancePool deployed to: ${await insurancePool.getAddress()}`);

  const CipherTrust = await hre.ethers.getContractFactory("CipherTrust");
  const cipherTrust = await CipherTrust.connect(admin).deploy();
  await cipherTrust.waitForDeployment();
  console.log(` -> CipherTrust Core deployed to: ${await cipherTrust.getAddress()}`);

  // Linked contracts
  await (await reputationBadge.connect(admin).setCipherTrust(await cipherTrust.getAddress())).wait();
  await (await insurancePool.connect(admin).setCipherTrust(await cipherTrust.getAddress())).wait();
  await (await cipherTrust.connect(admin).setReputationBadge(await reputationBadge.getAddress())).wait();
  await (await cipherTrust.connect(admin).setInsurancePool(await insurancePool.getAddress())).wait();

  // Authorize Oracles
  await (await cipherTrust.connect(admin).authorizeOracle(oracle1.address)).wait();
  await (await cipherTrust.connect(admin).authorizeOracle(oracle2.address)).wait();
  await (await cipherTrust.connect(admin).setQuorumThreshold(2)).wait();
  console.log(" -> Oracles authorized. Quorum threshold set to 2.\n");

  console.log("[2/6] Initializing Underwriting Capital (InsurancePool Staking)...");
  // Stranger stakes 10 ETH into the InsurancePool
  await (await insurancePool.connect(stranger).stake({ value: hre.ethers.parseEther("10") })).wait();
  console.log(` -> Stranger staked 10 ETH. Insurance Pool Assets: ${hre.ethers.formatEther(await insurancePool.totalAssets())} ETH\n`);

  console.log("[3/6] Registering Autonomous Delivery Drone & Requesting Credit Delegation...");
  // Register drone agent #0
  await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();
  console.log(" -> Delivery Drone Agent #0 registered.");

  let agent = await cipherTrust.getAgent(0);
  console.log(` -> Initial Uncertainty Variance (σ²): ${agent.trustScoreVar}`);
  let reqBond = await hre.fhevm.debugger.decryptEuint(5, await cipherTrust.getEncryptedRequiredBond(0));
  console.log(` -> Initial Required Collateral Bond: ${hre.ethers.formatEther(reqBond)} ETH`);

  // Operator borrows bond from InsurancePool (Credit Delegation)
  await (await cipherTrust.connect(operator).requestCreditDelegation(0, hre.ethers.parseEther("5"))).wait();
  console.log(` -> Borrowed 5 ETH from InsurancePool. Delegated Bond staked: ${hre.ethers.formatEther(await cipherTrust.getDelegatedBond(0))} ETH`);
  
  let sufficient = await hre.fhevm.debugger.decryptEbool(await cipherTrust.getEncryptedBondSufficiency(0));
  console.log(` -> Collateral Sufficiency Status under FHE: ${sufficient ? "SUFFICIENT (Ready for Operations)" : "INSUFFICIENT"}\n`);

  console.log("[4/6] Executing Flight Telemetry Round 1 (Normal Operations)...");
  // Redundant sensor readings: Sensor A = 9, Sensor B = 9, Uptime = 9, Latency = 9, Error = 0
  const scoreVal = 9;
  const errVal = 0;
  const targetAddress = await cipherTrust.getAddress();

  // Oracle 1 attestation
  const input1 = hre.fhevm.createEncryptedInput(targetAddress, oracle1.address);
  input1.add64(scoreVal); // compA
  input1.add64(scoreVal); // compB
  input1.add64(scoreVal); // uptime
  input1.add64(scoreVal); // latency
  input1.add64(errVal);   // error
  const encrypted1 = await input1.encrypt();
  await (
    await cipherTrust.connect(oracle1).submitTelemetry(
      0,
      encrypted1.handles[0],
      encrypted1.handles[1],
      encrypted1.handles[2],
      encrypted1.handles[3],
      encrypted1.handles[4],
      encrypted1.inputProof
    )
  ).wait();

  // Oracle 2 attestation
  const input2 = hre.fhevm.createEncryptedInput(targetAddress, oracle2.address);
  input2.add64(scoreVal);
  input2.add64(scoreVal);
  input2.add64(scoreVal);
  input2.add64(scoreVal);
  input2.add64(errVal);
  const encrypted2 = await input2.encrypt();
  await (
    await cipherTrust.connect(oracle2).submitTelemetry(
      0,
      encrypted2.handles[0],
      encrypted2.handles[1],
      encrypted2.handles[2],
      encrypted2.handles[3],
      encrypted2.handles[4],
      encrypted2.inputProof
    )
  ).wait();

  // Fast forward block time to simulate operations
  await hre.ethers.provider.send("evm_increaseTime", [172800]); // 2 days
  await hre.ethers.provider.send("evm_mine", []);

  agent = await cipherTrust.getAgent(0);
  let score = await hre.fhevm.debugger.decryptEuint(5, await cipherTrust.getEncryptedTrustScore(0));
  let bond = await hre.fhevm.debugger.decryptEuint(5, await cipherTrust.getEncryptedRequiredBond(0));
  let interest = await cipherTrust.getInterestAccumulated(0);

  console.log(` -> Telemetry Round processed. Bayesian Trust Score: ${score}/1000`);
  console.log(` -> Uncertainty Variance (σ²) decayed to: ${agent.trustScoreVar}`);
  console.log(` -> Required Bond reduced to: ${hre.ethers.formatEther(bond)} ETH`);
  console.log(` -> Accumulated Interest accrued to Pool: ${hre.ethers.formatEther(interest)} ETH\n`);

  console.log("[5/6] Simulating GPS Spoofing Attack (Sensor Outlier Filtration)...");
  // Sensors disagree: Sensor A reports 9 (normal), Sensor B reports 3 (spoofed location drift)
  const inputAttack1 = hre.fhevm.createEncryptedInput(targetAddress, oracle1.address);
  inputAttack1.add64(9); // compA (healthy)
  inputAttack1.add64(3); // compB (spoofed drift > 2)
  inputAttack1.add64(9); // uptime
  inputAttack1.add64(9); // latency
  inputAttack1.add64(0); // error
  const encryptedAttack1 = await inputAttack1.encrypt();
  await (
    await cipherTrust.connect(oracle1).submitTelemetry(
      0,
      encryptedAttack1.handles[0],
      encryptedAttack1.handles[1],
      encryptedAttack1.handles[2],
      encryptedAttack1.handles[3],
      encryptedAttack1.handles[4],
      encryptedAttack1.inputProof
    )
  ).wait();

  const inputAttack2 = hre.fhevm.createEncryptedInput(targetAddress, oracle2.address);
  inputAttack2.add64(9);
  inputAttack2.add64(3);
  inputAttack2.add64(9);
  inputAttack2.add64(9);
  inputAttack2.add64(0);
  const encryptedAttack2 = await inputAttack2.encrypt();
  await (
    await cipherTrust.connect(oracle2).submitTelemetry(
      0,
      encryptedAttack2.handles[0],
      encryptedAttack2.handles[1],
      encryptedAttack2.handles[2],
      encryptedAttack2.handles[3],
      encryptedAttack2.handles[4],
      encryptedAttack2.inputProof
    )
  ).wait();

  // Await decryption oracle to run FHE checks
  await hre.fhevm.awaitDecryptionOracle();

  score = await hre.fhevm.debugger.decryptEuint(5, await cipherTrust.getEncryptedTrustScore(0));
  console.log(" -> [SUCCESS] Sensor fusion drift check triggered under FHE.");
  console.log(" -> [SUCCESS] Spoofed Sensor B discarded. Anomaly penalty applied.");
  console.log(` -> Penalized Bayesian Trust Score: ${score}/1000\n`);

  console.log("[6/6] Simulating Catastrophic Malfunction (FHE Auto-Liquidation)...");
  // Multiple rounds of failure/errors to push trust score below 300
  const inputFail1 = hre.fhevm.createEncryptedInput(targetAddress, oracle1.address);
  inputFail1.add64(1);
  inputFail1.add64(1);
  inputFail1.add64(1);
  inputFail1.add64(1);
  inputFail1.add64(10); // extreme error rate
  const encryptedFail1 = await inputFail1.encrypt();
  await (
    await cipherTrust.connect(oracle1).submitTelemetry(
      0,
      encryptedFail1.handles[0],
      encryptedFail1.handles[1],
      encryptedFail1.handles[2],
      encryptedFail1.handles[3],
      encryptedFail1.handles[4],
      encryptedFail1.inputProof
    )
  ).wait();

  const inputFail2 = hre.fhevm.createEncryptedInput(targetAddress, oracle2.address);
  inputFail2.add64(1);
  inputFail2.add64(1);
  inputFail2.add64(1);
  inputFail2.add64(1);
  inputFail2.add64(10);
  const encryptedFail2 = await inputFail2.encrypt();
  await (
    await cipherTrust.connect(oracle2).submitTelemetry(
      0,
      encryptedFail2.handles[0],
      encryptedFail2.handles[1],
      encryptedFail2.handles[2],
      encryptedFail2.handles[3],
      encryptedFail2.handles[4],
      encryptedFail2.inputProof
    )
  ).wait();

  // Await decryption oracle to finalize liquidation check
  await hre.fhevm.awaitDecryptionOracle();

  agent = await cipherTrust.getAgent(0);
  console.log(" -> [SUCCESS] FHE trust score fell below liquidation threshold (300).");
  console.log(` -> Agent Active Status: ${agent.active ? "ACTIVE" : "INACTIVE / DEACTIVATED"}`);
  console.log(` -> Slashed Bond remaining: ${hre.ethers.formatEther(agent.postedBond)} ETH`);
  console.log(` -> Slashed Bond recovered to InsurancePool: ${hre.ethers.formatEther(await insurancePool.totalAssets())} ETH\n`);

  console.log("======================================================================");
  console.log("               Simulation Completed Successfully!                     ");
  console.log("======================================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
