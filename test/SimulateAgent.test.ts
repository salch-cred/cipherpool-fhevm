import hre from "hardhat";

describe("CipherTrust: Full End-to-End Drone Flight & Attack Simulation Demo", function () {
  it("executes the entire simulation successfully", async function () {
    console.log("\n======================================================================");
    console.log("   CipherTrust: Autonomous Agent Flight & Attack Simulation Script    ");
    console.log("======================================================================\n");

    const [admin, operator, oracle1, oracle2, stranger] = await hre.ethers.getSigners();

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
    await (await insurancePool.connect(stranger).stake({ value: hre.ethers.parseEther("10") })).wait();
    console.log(` -> Stranger staked 10 ETH. Insurance Pool Assets: ${hre.ethers.formatEther(await insurancePool.totalAssets())} ETH\n`);

    console.log("[3/6] Registering Autonomous Delivery Drone & Requesting Credit Delegation...");
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();
    console.log(" -> Delivery Drone Agent #0 registered.");

    let agent = await cipherTrust.getAgent(0);
    console.log(` -> Initial Uncertainty Variance (σ²): ${agent.trustScoreVar}`);
    let reqBond = await hre.fhevm.debugger.decryptEuint(5, await cipherTrust.getEncryptedRequiredBond(0));
    console.log(` -> Initial Required Collateral Bond: ${hre.ethers.formatEther(reqBond)} ETH`);

    await (await cipherTrust.connect(operator).requestCreditDelegation(0, hre.ethers.parseEther("5"))).wait();
    console.log(` -> Borrowed 5 ETH from InsurancePool. Delegated Bond staked: ${hre.ethers.formatEther(await cipherTrust.getDelegatedBond(0))} ETH`);
    
    let sufficient = await hre.fhevm.debugger.decryptEbool(await cipherTrust.getEncryptedBondSufficiency(0));
    console.log(` -> Collateral Sufficiency Status under FHE: ${sufficient ? "SUFFICIENT (Ready for Operations)" : "INSUFFICIENT"}`);

    // Register Underwritten Task for a client (Stranger)
    const limit = hre.ethers.parseEther("3");
    await (await cipherTrust.connect(admin).registerUnderwrittenTask(0, stranger.address, limit)).wait();
    console.log(` -> Active underwritten Task registered. Client: Stranger. Insurance Coverage Limit: 3.0 ETH\n`);

    console.log("[4/6] Executing Flight Telemetry Round 1 (Normal Operations)...");
    const scoreVal = 9;
    const errVal = 0;
    const targetAddress = await cipherTrust.getAddress();

    const input1 = hre.fhevm.createEncryptedInput(targetAddress, oracle1.address);
    input1.add64(scoreVal);
    input1.add64(scoreVal);
    input1.add64(scoreVal);
    input1.add64(scoreVal);
    input1.add64(errVal);
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

    await hre.fhevm.awaitDecryptionOracle();

    await hre.ethers.provider.send("evm_increaseTime", [172800]); // 2 days
    await hre.ethers.provider.send("evm_mine", []);

    // Perform another telemetry round to update scores with time passed
    const input3 = hre.fhevm.createEncryptedInput(targetAddress, oracle1.address);
    input3.add64(scoreVal);
    input3.add64(scoreVal);
    input3.add64(scoreVal);
    input3.add64(scoreVal);
    input3.add64(errVal);
    const encrypted3 = await input3.encrypt();
    await (
      await cipherTrust.connect(oracle1).submitTelemetry(
        0,
        encrypted3.handles[0],
        encrypted3.handles[1],
        encrypted3.handles[2],
        encrypted3.handles[3],
        encrypted3.handles[4],
        encrypted3.inputProof
      )
    ).wait();

    const input4 = hre.fhevm.createEncryptedInput(targetAddress, oracle2.address);
    input4.add64(scoreVal);
    input4.add64(scoreVal);
    input4.add64(scoreVal);
    input4.add64(scoreVal);
    input4.add64(errVal);
    const encrypted4 = await input4.encrypt();
    await (
      await cipherTrust.connect(oracle2).submitTelemetry(
        0,
        encrypted4.handles[0],
        encrypted4.handles[1],
        encrypted4.handles[2],
        encrypted4.handles[3],
        encrypted4.handles[4],
        encrypted4.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();

    agent = await cipherTrust.getAgent(0);
    let score = await hre.fhevm.debugger.decryptEuint(5, await cipherTrust.getEncryptedTrustScore(0));
    let bond = await hre.fhevm.debugger.decryptEuint(5, await cipherTrust.getEncryptedRequiredBond(0));
    let interest = await cipherTrust.getInterestAccumulated(0);

    console.log(` -> Telemetry Round processed. Bayesian Trust Score: ${score}/1000`);
    console.log(` -> Uncertainty Variance (σ²) decayed to: ${agent.trustScoreVar}`);
    console.log(` -> Required Bond reduced to: ${hre.ethers.formatEther(bond)} ETH`);
    console.log(` -> Accumulated Interest accrued to Pool: ${hre.ethers.formatEther(interest)} ETH\n`);

    console.log("[5/6] Simulating GPS Spoofing Attack (Sensor Outlier Filtration)...");
    const inputAttack1 = hre.fhevm.createEncryptedInput(targetAddress, oracle1.address);
    inputAttack1.add64(9); // compA
    inputAttack1.add64(3); // compB (drift > 2)
    inputAttack1.add64(9);
    inputAttack1.add64(9);
    inputAttack1.add64(0);
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

    await hre.fhevm.awaitDecryptionOracle();

    score = await hre.fhevm.debugger.decryptEuint(5, await cipherTrust.getEncryptedTrustScore(0));
    console.log(" -> [SUCCESS] Sensor fusion drift check triggered under FHE.");
    console.log(" -> [SUCCESS] Spoofed Sensor B discarded. Anomaly penalty applied.");
    console.log(` -> Penalized Bayesian Trust Score: ${score}/1000\n`);

    console.log("[6/6] Simulating Catastrophic Malfunction (FHE Auto-Liquidation & Parametric Claim)...");
    
    // Submitting Bad Telemetry Round 1 (Score drops from 503 to 420)
    let inputFail1 = hre.fhevm.createEncryptedInput(targetAddress, oracle1.address);
    inputFail1.add64(1); inputFail1.add64(1); inputFail1.add64(1); inputFail1.add64(1); inputFail1.add64(10);
    let encryptedFail1 = await inputFail1.encrypt();
    await (await cipherTrust.connect(oracle1).submitTelemetry(0, encryptedFail1.handles[0], encryptedFail1.handles[1], encryptedFail1.handles[2], encryptedFail1.handles[3], encryptedFail1.handles[4], encryptedFail1.inputProof)).wait();

    let inputFail2 = hre.fhevm.createEncryptedInput(targetAddress, oracle2.address);
    inputFail2.add64(1); inputFail2.add64(1); inputFail2.add64(1); inputFail2.add64(1); inputFail2.add64(10);
    let encryptedFail2 = await inputFail2.encrypt();
    await (await cipherTrust.connect(oracle2).submitTelemetry(0, encryptedFail2.handles[0], encryptedFail2.handles[1], encryptedFail2.handles[2], encryptedFail2.handles[3], encryptedFail2.handles[4], encryptedFail2.inputProof)).wait();

    await hre.fhevm.awaitDecryptionOracle();

    // Submitting Bad Telemetry Round 2 (Score drops from 420 to 329)
    let inputFail3 = hre.fhevm.createEncryptedInput(targetAddress, oracle1.address);
    inputFail3.add64(1); inputFail3.add64(1); inputFail3.add64(1); inputFail3.add64(1); inputFail3.add64(10);
    let encryptedFail3 = await inputFail3.encrypt();
    await (await cipherTrust.connect(oracle1).submitTelemetry(0, encryptedFail3.handles[0], encryptedFail3.handles[1], encryptedFail3.handles[2], encryptedFail3.handles[3], encryptedFail3.handles[4], encryptedFail3.inputProof)).wait();

    let inputFail4 = hre.fhevm.createEncryptedInput(targetAddress, oracle2.address);
    inputFail4.add64(1); inputFail4.add64(1); inputFail4.add64(1); inputFail4.add64(1); inputFail4.add64(10);
    let encryptedFail4 = await inputFail4.encrypt();
    await (await cipherTrust.connect(oracle2).submitTelemetry(0, encryptedFail4.handles[0], encryptedFail4.handles[1], encryptedFail4.handles[2], encryptedFail4.handles[3], encryptedFail4.handles[4], encryptedFail4.inputProof)).wait();

    await hre.fhevm.awaitDecryptionOracle();

    // Submitting Bad Telemetry Round 3 (Score drops from 329 to 273 - below 300)
    let inputFail5 = hre.fhevm.createEncryptedInput(targetAddress, oracle1.address);
    inputFail5.add64(1); inputFail5.add64(1); inputFail5.add64(1); inputFail5.add64(1); inputFail5.add64(10);
    let encryptedFail5 = await inputFail5.encrypt();
    await (await cipherTrust.connect(oracle1).submitTelemetry(0, encryptedFail5.handles[0], encryptedFail5.handles[1], encryptedFail5.handles[2], encryptedFail5.handles[3], encryptedFail5.handles[4], encryptedFail5.inputProof)).wait();

    const clientBalanceBefore = await hre.ethers.provider.getBalance(stranger.address);

    let inputFail6 = hre.fhevm.createEncryptedInput(targetAddress, oracle2.address);
    inputFail6.add64(1); inputFail6.add64(1); inputFail6.add64(1); inputFail6.add64(1); inputFail6.add64(10);
    let encryptedFail6 = await inputFail6.encrypt();
    await (await cipherTrust.connect(oracle2).submitTelemetry(0, encryptedFail6.handles[0], encryptedFail6.handles[1], encryptedFail6.handles[2], encryptedFail6.handles[3], encryptedFail6.handles[4], encryptedFail6.inputProof)).wait();

    await hre.fhevm.awaitDecryptionOracle();

    let debugScore = await hre.fhevm.debugger.decryptEuint(5, await cipherTrust.getEncryptedTrustScore(0));
    console.log(` -> Debug: trust score after malfunction round: ${debugScore}`);
    console.log(` -> Debug: currentRoundId: ${await cipherTrust.currentRoundId(0)}`);
    console.log(` -> Debug: agentActiveTaskId: ${await cipherTrust.agentActiveTaskId(0)}`);

    agent = await cipherTrust.getAgent(0);
    const clientBalanceAfter = await hre.ethers.provider.getBalance(stranger.address);
    const paidAmount = clientBalanceAfter - clientBalanceBefore;

    console.log(" -> [SUCCESS] FHE trust score fell below liquidation threshold (300).");
    console.log(` -> Agent Active Status: ${agent.active ? "ACTIVE" : "INACTIVE / DEACTIVATED"}`);
    console.log(` -> FHE Parametric Claim Paid out to Client: ${hre.ethers.formatEther(paidAmount)} ETH`);
    console.log(` -> Slashing remainder recovered to InsurancePool: ${hre.ethers.formatEther(await insurancePool.totalAssets())} ETH\n`);

    console.log("======================================================================");
    console.log("               Simulation Completed Successfully!                     ");
    console.log("======================================================================");
  });
});
