import { expect } from "chai";
import hre from "hardhat";

describe("CipherTrust FHE with Bayesian Filter and Sensor Fusion", function () {
  let admin: any;
  let operator: any;
  let oracle1: any;
  let oracle2: any;
  let underwriter: any;
  let stranger: any;
  let cipherTrust: any;
  let reputationBadge: any;
  let insurancePool: any;

  beforeEach(async function () {
    [admin, operator, oracle1, oracle2, underwriter, stranger] = await hre.ethers.getSigners();

    const ReputationBadge = await hre.ethers.getContractFactory("ReputationBadge");
    reputationBadge = await ReputationBadge.connect(admin).deploy();
    await reputationBadge.waitForDeployment();

    const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
    insurancePool = await InsurancePool.connect(admin).deploy();
    await insurancePool.waitForDeployment();

    const CipherTrust = await hre.ethers.getContractFactory("CipherTrust");
    cipherTrust = await CipherTrust.connect(admin).deploy();
    await cipherTrust.waitForDeployment();

    // Set up linkages
    await (await reputationBadge.connect(admin).setCipherTrust(await cipherTrust.getAddress())).wait();
    await (await insurancePool.connect(admin).setCipherTrust(await cipherTrust.getAddress())).wait();
    await (await cipherTrust.connect(admin).setReputationBadge(await reputationBadge.getAddress())).wait();
    await (await cipherTrust.connect(admin).setInsurancePool(await insurancePool.getAddress())).wait();

    // Authorize oracles and underwriters
    await (await cipherTrust.connect(admin).authorizeOracle(oracle1.address)).wait();
    await (await cipherTrust.connect(admin).authorizeOracle(oracle2.address)).wait();
    await (await cipherTrust.connect(admin).authorizeUnderwriter(underwriter.address)).wait();
  });

  it("registers an agent, initializes trust variance to 100, and performs Bayesian score updates", async function () {
    // 1. Register agent
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();

    let agent = await cipherTrust.getAgent(0);
    expect(agent.operator).to.equal(operator.address);
    expect(agent.registered).to.equal(true);
    expect(agent.trustScoreVar).to.equal(100n); // maximum initial uncertainty

    // Initial score is 500
    let encryptedScore = await cipherTrust.getEncryptedTrustScore(0);
    let score = await hre.fhevm.debugger.decryptEuint(5, encryptedScore); // 5 = euint64
    expect(score).to.equal(500n);

    // Initial required bond is base (Medium = 1 ETH) + variance premium (100 * 0.04 ETH = 4 ETH) = 5 ETH
    let encryptedRequiredBond = await cipherTrust.getEncryptedRequiredBond(0);
    let requiredBond = await hre.fhevm.debugger.decryptEuint(5, encryptedRequiredBond);
    expect(requiredBond).to.equal(hre.ethers.parseEther("5"));

    // 2. Deposit collateral bond of 5 ETH to be sufficient
    await (await cipherTrust.connect(operator).depositBond(0, { value: hre.ethers.parseEther("5") })).wait();
    let isSufficient = await cipherTrust.getEncryptedBondSufficiency(0);
    expect(await hre.fhevm.debugger.decryptEbool(isSufficient)).to.equal(true);

    // 3. Oracle telemetry submission
    // We set quorum threshold to 2 oracles
    await (await cipherTrust.connect(admin).setQuorumThreshold(2)).wait();

    const ctAddress = await cipherTrust.getAddress();

    // Oracle 1 submits: CompletionA: 9, CompletionB: 9, Uptime: 9, Latency: 9, Error: 0
    const scoreVal = 9;
    const errVal = 0;
    const input1 = hre.fhevm.createEncryptedInput(ctAddress, oracle1.address);
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

    // Score shouldn't change yet because quorum is 2
    encryptedScore = await cipherTrust.getEncryptedTrustScore(0);
    score = await hre.fhevm.debugger.decryptEuint(5, encryptedScore);
    expect(score).to.equal(500n);

    // Oracle 2 submits
    const input2 = hre.fhevm.createEncryptedInput(ctAddress, oracle2.address);
    input2.add64(scoreVal); // compA
    input2.add64(scoreVal); // compB
    input2.add64(scoreVal); // uptime
    input2.add64(scoreVal); // latency
    input2.add64(errVal);   // error
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

    // Now score updates:
    // oldVar = 100, ORACLE_VAR = 50. newVar = (100 * 50) / 150 = 33
    // alpha = (50 * 100) / 150 = 33. beta = (100 * 100) / 150 = 66
    // x_obs = 9*40 + 9*30 + 9*15 = 765
    // newScore = (500 * 33 + 765 * 66) / 100 = (16500 + 50490) / 100 = 669
    encryptedScore = await cipherTrust.getEncryptedTrustScore(0);
    score = await hre.fhevm.debugger.decryptEuint(5, encryptedScore);
    expect(score).to.equal(669n);
  });

  it("detects sensor anomalies and applies strict SLA penalty under FHE", async function () {
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();
    const ctAddress = await cipherTrust.getAddress();

    // Oracle 1 submits anomalous metrics: CompletionA = 9, CompletionB = 3 (drift > 2)
    // Should trigger sensor fusion anomaly filter -> setting score of this round to 0 and error to 10
    const input1 = hre.fhevm.createEncryptedInput(ctAddress, oracle1.address);
    input1.add64(9); // compA
    input1.add64(3); // compB (drift > 2)
    input1.add64(9); // uptime
    input1.add64(9); // latency
    input1.add64(0); // error
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

    // Since quorum threshold is 1 by default, the score updates immediately
    // oldVar = 100. newVar = 33
    // alpha = 33, beta = 66
    // Because of sensor anomaly: x_obs = 0 - 10 * 15 = 0 (underflow clamp)
    // newScore = (500 * 33 + 0 * 66) / 100 = 165
    let encryptedScore = await cipherTrust.getEncryptedTrustScore(0);
    let score = await hre.fhevm.debugger.decryptEuint(5, encryptedScore);
    expect(score).to.equal(165n);
  });

  it("handles async public tier reveal and mints soulbound badge", async function () {
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();

    // Request tier reveal
    const tx = await cipherTrust.connect(operator).requestTierReveal(0);
    await tx.wait();

    // Await decryption oracle to fulfill the request
    await hre.fhevm.awaitDecryptionOracle();

    // Badge should be minted (tier 2 / Medium for starting score 500)
    const tier = await reputationBadge.tierOf(0);
    expect(tier).to.equal(2); // Tier.Medium
  });

  it("handles async slash check and forwards penalty to InsurancePool", async function () {
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();
    await (await cipherTrust.connect(operator).depositBond(0, { value: hre.ethers.parseEther("5") })).wait();

    // Encrypt a breach signal (1 = true)
    const ctAddress = await cipherTrust.getAddress();
    const input = hre.fhevm.createEncryptedInput(ctAddress, oracle1.address);
    input.add64(1);
    const encrypted = await input.encrypt();

    const tx = await cipherTrust.connect(oracle1).requestSlashCheck(0, encrypted.handles[0], encrypted.inputProof);
    await tx.wait();

    // Await decryption oracle to fulfill the request
    await hre.fhevm.awaitDecryptionOracle();

    // Check that operator is slashed (10% of 5 ETH = 0.5 ETH)
    const agent = await cipherTrust.getAgent(0);
    expect(agent.postedBond).to.equal(hre.ethers.parseEther("4.5"));

    // Check InsurancePool received penalty
    expect(await insurancePool.totalAssets()).to.equal(hre.ethers.parseEther("0.5"));
  });

  it("handles automatic FHE liquidation when score falls below threshold", async function () {
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();
    await (await cipherTrust.connect(operator).depositBond(0, { value: hre.ethers.parseEther("5") })).wait();

    // Set threshold to 2 oracles for score update
    await (await cipherTrust.connect(admin).setQuorumThreshold(2)).wait();

    const ctAddress = await cipherTrust.getAddress();

    // Oracles submit terrible telemetry (Score = 1, Error = 10)
    // This will cause the score to drop significantly
    const scoreVal = 1;
    const errVal = 10;
    
    // Oracle 1
    const input1 = hre.fhevm.createEncryptedInput(ctAddress, oracle1.address);
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

    // Oracle 2
    const input2 = hre.fhevm.createEncryptedInput(ctAddress, oracle2.address);
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

    // Await decryption oracle to process the automatic liquidation check
    await hre.fhevm.awaitDecryptionOracle();

    // Agent should be deactivated and posted bond slashed to 0
    const agent = await cipherTrust.getAgent(0);
    expect(agent.active).to.equal(false);
    expect(agent.postedBond).to.equal(0n);

    // InsurancePool should receive the fully liquidated 5 ETH
    expect(await insurancePool.totalAssets()).to.equal(hre.ethers.parseEther("5"));
  });

  it("delegates credit from InsurancePool and accumulates interest under FHE", async function () {
    // 1. Register agent
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();

    // 2. Stake 10 ETH to InsurancePool so it has funds to delegate
    await (await insurancePool.connect(stranger).stake({ value: hre.ethers.parseEther("10") })).wait();
    expect(await insurancePool.totalAssets()).to.equal(hre.ethers.parseEther("10"));

    // 3. Request credit delegation of 5 ETH
    await (await cipherTrust.connect(operator).requestCreditDelegation(0, hre.ethers.parseEther("5"))).wait();

    // Verify delegated bond is 5 ETH
    let delegated = await cipherTrust.getDelegatedBond(0);
    expect(delegated).to.equal(hre.ethers.parseEther("5"));

    // Verify sufficiency (bondSufficient should be true since totalCollateral = 0 posted + 5 delegated >= 5 required)
    let isSufficient = await cipherTrust.getEncryptedBondSufficiency(0);
    expect(await hre.fhevm.debugger.decryptEbool(isSufficient)).to.equal(true);

    // 4. Fast forward time to accumulate interest
    // Since we divide by 8640000000 (calibrated for 10-day interest), let's skip 2 days (172800 seconds)
    await hre.ethers.provider.send("evm_increaseTime", [172800]);
    await hre.ethers.provider.send("evm_mine", []);

    // 5. Submit telemetry to trigger the score update block interest accrual
    const ctAddress = await cipherTrust.getAddress();
    const scoreVal = 9;
    const errVal = 0;
    const input1 = hre.fhevm.createEncryptedInput(ctAddress, oracle1.address);
    input1.add64(scoreVal);
    input1.add64(scoreVal);
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

    // Verify interest accumulated is greater than 0
    let interest = await cipherTrust.getInterestAccumulated(0);
    expect(interest).to.be.greaterThan(0n);

    // 6. Repay the interest
    await (await cipherTrust.connect(operator).repayInterest(0, { value: interest })).wait();

    // Verify interest resets to 0
    interest = await cipherTrust.getInterestAccumulated(0);
    expect(interest).to.equal(0n);
  });

  it("handles parametric insurance claims and pays out client on liquidation", async function () {
    // 1. Register agent & deposit 5 ETH bond
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();
    await (await cipherTrust.connect(operator).depositBond(0, { value: hre.ethers.parseEther("5") })).wait();

    // 2. Register underwritten task: Client = stranger, Coverage limit = 3 ETH
    const limit = hre.ethers.parseEther("3");
    await (await cipherTrust.connect(admin).registerUnderwrittenTask(0, stranger.address, limit)).wait();
    
    let task = await cipherTrust.tasks(1);
    expect(task.client).to.equal(stranger.address);
    expect(task.coverageLimit).to.equal(limit);
    expect(task.active).to.equal(true);

    // 3. Set quorum to 2 and submit terrible telemetry (Score = 1, Error = 10)
    // The final score drops significantly below 300
    await (await cipherTrust.connect(admin).setQuorumThreshold(2)).wait();

    const ctAddress = await cipherTrust.getAddress();
    const scoreVal = 1;
    const errVal = 10;
    
    // Oracle 1
    const input1 = hre.fhevm.createEncryptedInput(ctAddress, oracle1.address);
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

    // Oracle 2
    const input2 = hre.fhevm.createEncryptedInput(ctAddress, oracle2.address);
    input2.add64(scoreVal);
    input2.add64(scoreVal);
    input2.add64(scoreVal);
    input2.add64(scoreVal);
    input2.add64(errVal);
    const encrypted2 = await input2.encrypt();
    
    // Track stranger's starting balance to assert payout
    const balanceBefore = await hre.ethers.provider.getBalance(stranger.address);

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

    // Await KMS decryption oracle to process claims payout (single-step decryption)
    await hre.fhevm.awaitDecryptionOracle();

    // 4. Assertions
    // Agent must be deactivated
    const agent = await cipherTrust.getAgent(0);
    expect(agent.active).to.equal(false);
    expect(agent.postedBond).to.equal(0n);

    // Client must receive pro-rata compensation:
    // score drops to 165. severity = 1000 - 165 = 835
    // payout = (3 ETH * 835) / 1000 = 2.505 ETH
    const balanceAfter = await hre.ethers.provider.getBalance(stranger.address);
    expect(balanceAfter - balanceBefore).to.be.closeTo(hre.ethers.parseEther("2.505"), hre.ethers.parseEther("0.05"));

    // Residual goes to InsurancePool (5 ETH - 2.505 ETH = 2.495 ETH)
    expect(await insurancePool.totalAssets()).to.be.closeTo(hre.ethers.parseEther("2.495"), hre.ethers.parseEther("0.05"));
  });

  it("handles on-chain FHE Perceptron classification and neural slashing", async function () {
    // 1. Register agent & deposit 5 ETH bond
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();
    await (await cipherTrust.connect(operator).depositBond(0, { value: hre.ethers.parseEther("5") })).wait();

    // 2. Set Perceptron weights to be highly sensitive to latency and error rate
    // Completion/Uptime = 10, Latency = 100, Error = 200, Bias = 300, Threshold = 500
    await (await cipherTrust.connect(admin).updateNeuronWeights(10, 10, 100, 200, 300, 500)).wait();

    // 3. Oracle telemetry submission with Latency = 9, Error = 5 (inducing neural breach)
    // Even though the Bayesian score remains above 300, the Perceptron fires!
    const ctAddress = await cipherTrust.getAddress();
    const input1 = hre.fhevm.createEncryptedInput(ctAddress, oracle1.address);
    input1.add64(9); // compA
    input1.add64(9); // compB
    input1.add64(9); // uptime
    input1.add64(9); // latency (9 * 100 = 900 risk)
    input1.add64(5); // error (5 * 200 = 1000 risk)
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

    // Await KMS decryption oracle
    await hre.fhevm.awaitDecryptionOracle();

    // Assert that the FHE Perceptron triggered liquidation
    const agent = await cipherTrust.getAgent(0);
    expect(agent.active).to.equal(false);
    expect(agent.postedBond).to.equal(0n);
  });

  it("handles zero-deposit hardware leasing and reputation-based credit delegation", async function () {
    // 1. Setup high reputation agent
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();
    await (await cipherTrust.connect(operator).depositBond(0, { value: hre.ethers.parseEther("5") })).wait();
    
    // Submit positive telemetry to ensure high trust score
    const ctAddress = await cipherTrust.getAddress();
    const input = hre.fhevm.createEncryptedInput(ctAddress, oracle1.address);
    input.add64(9); input.add64(9); input.add64(9); input.add64(1); input.add64(0);
    const encrypted = await input.encrypt();
    await (await cipherTrust.connect(oracle1).submitTelemetry(0, encrypted.handles[0], encrypted.handles[1], encrypted.handles[2], encrypted.handles[3], encrypted.handles[4], encrypted.inputProof)).wait();
    await hre.fhevm.awaitDecryptionOracle();

    // Trigger public tier reveal to mint reputation badge (Tier 2/3)
    await (await cipherTrust.connect(operator).requestTierReveal(0)).wait();
    await hre.fhevm.awaitDecryptionOracle(); // resolves decrypt request
    
    // 2. Stake capital in the InsurancePool
    await (await insurancePool.connect(stranger).stake({ value: hre.ethers.parseEther("10") })).wait();
    
    // 3. Request zero-deposit lease of a high-value GPU (hardwareId = 999) with 3 ETH bond
    const leaseTx = await cipherTrust.connect(operator).requestLeaseHardware(0, 999, hre.ethers.parseEther("3"));
    await leaseTx.wait();

    // Verify lease is active
    let lease = await cipherTrust.leases(1);
    expect(lease.lessee).to.equal(operator.address);
    expect(lease.hardwareId).to.equal(999n);
    expect(lease.requiredBond).to.equal(hre.ethers.parseEther("3"));
    expect(lease.active).to.equal(true);

    // 4. Settle lease with success = true
    await (await cipherTrust.connect(admin).settleLeaseHardware(1, true)).wait();
    
    lease = await cipherTrust.leases(1);
    expect(lease.active).to.equal(false);

    // 5. Request another lease and settle with success = false (theft/damage slash)
    await (await cipherTrust.connect(operator).requestLeaseHardware(0, 888, hre.ethers.parseEther("2"))).wait();
    
    const balanceBefore = await hre.ethers.provider.getBalance(admin.address);
    await (await cipherTrust.connect(admin).settleLeaseHardware(2, false)).wait();
    const balanceAfter = await hre.ethers.provider.getBalance(admin.address);
    
    // Admin (hardware owner) must receive the 2 ETH slashed compensation
    expect(balanceAfter - balanceBefore).to.be.closeTo(hre.ethers.parseEther("2"), hre.ethers.parseEther("0.05"));
  });

  it("handles confidential FHE biometric authentication and drift verification", async function () {
    const ctAddress = await cipherTrust.getAddress();

    // 1. Register biometric signature: (100, 200, 300)
    const regInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    regInput.add64(100);
    regInput.add64(200);
    regInput.add64(300);
    const regEnc = await regInput.encrypt();

    await (
      await cipherTrust.connect(operator).registerBiometricSignature(
        regEnc.handles[0],
        regEnc.handles[1],
        regEnc.handles[2],
        regEnc.inputProof
      )
    ).wait();

    // 2. Verify with valid biometric signature (102, 198, 301) - Distance = 5 <= 15
    const validAuthInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    validAuthInput.add64(102);
    validAuthInput.add64(198);
    validAuthInput.add64(301);
    const validAuthEnc = await validAuthInput.encrypt();

    await (
      await cipherTrust.connect(operator).requestBiometricAuth(
        validAuthEnc.handles[0],
        validAuthEnc.handles[1],
        validAuthEnc.handles[2],
        validAuthEnc.inputProof
      )
    ).wait();

    // Await KMS decryption oracle
    await hre.fhevm.awaitDecryptionOracle();

    // Assert that the mapping was updated to true
    expect(await cipherTrust.biometricAuthPassed(operator.address)).to.equal(true);

    // 3. Verify with invalid biometric signature (120, 200, 300) - Distance = 20 > 15
    const invalidAuthInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    invalidAuthInput.add64(120);
    invalidAuthInput.add64(200);
    invalidAuthInput.add64(300);
    const invalidAuthEnc = await invalidAuthInput.encrypt();

    await (
      await cipherTrust.connect(operator).requestBiometricAuth(
        invalidAuthEnc.handles[0],
        invalidAuthEnc.handles[1],
        invalidAuthEnc.handles[2],
        invalidAuthEnc.inputProof
      )
    ).wait();

    // Await KMS decryption oracle
    await hre.fhevm.awaitDecryptionOracle();

    // Assert that the mapping was updated to false
    expect(await cipherTrust.biometricAuthPassed(operator.address)).to.equal(false);
  });

  it("handles confidential messaging anti-spam filtering (FHE-Shield)", async function () {
    const ctAddress = await cipherTrust.getAddress();

    // 1. Set spam threshold of operator to 15
    await (await cipherTrust.connect(operator).setSpamThreshold(15)).wait();

    // 2. Send low spam score message (weights: 2, 3, 4 = 9 <= 15)
    const lowInput = hre.fhevm.createEncryptedInput(ctAddress, admin.address);
    lowInput.add64(2);
    lowInput.add64(3);
    lowInput.add64(4);
    const lowEnc = await lowInput.encrypt();

    await (
      await cipherTrust.connect(admin).sendConfidentialMessage(
        operator.address,
        lowEnc.handles[0],
        lowEnc.handles[1],
        lowEnc.handles[2],
        lowEnc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();
    expect(await cipherTrust.inboxCount(operator.address)).to.equal(1);
    expect(await cipherTrust.spamInboxCount(operator.address)).to.equal(0);

    // 3. Send high spam score message (weights: 10, 5, 2 = 17 > 15)
    const highInput = hre.fhevm.createEncryptedInput(ctAddress, admin.address);
    highInput.add64(10);
    highInput.add64(5);
    highInput.add64(2);
    const highEnc = await highInput.encrypt();

    await (
      await cipherTrust.connect(admin).sendConfidentialMessage(
        operator.address,
        highEnc.handles[0],
        highEnc.handles[1],
        highEnc.handles[2],
        highEnc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();
    expect(await cipherTrust.inboxCount(operator.address)).to.equal(1);
    expect(await cipherTrust.spamInboxCount(operator.address)).to.equal(1);
  });

  it("handles challenge-response passwordless authentication (FHE-Pass)", async function () {
    const ctAddress = await cipherTrust.getAddress();

    // 1. Register auth secret: 5000
    const secInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    secInput.add64(5000);
    const secEnc = await secInput.encrypt();

    await (
      await cipherTrust.connect(operator).registerAuthSecret(
        secEnc.handles[0],
        secEnc.inputProof
      )
    ).wait();

    // 2. Generate challenge: 123
    await (await cipherTrust.connect(operator).generateAuthChallenge(123)).wait();
    expect(await cipherTrust.activeAuthChallenge(operator.address)).to.equal(123n);

    // 3. Verify correct response (5000 + 123 = 5123)
    const corRespInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    corRespInput.add64(5123);
    const corRespEnc = await corRespInput.encrypt();

    await (
      await cipherTrust.connect(operator).verifyAuthChallenge(
        corRespEnc.handles[0],
        corRespEnc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();
    expect(await cipherTrust.authPassed(operator.address)).to.equal(true);

    // 4. Verify incorrect response (5000)
    const incorRespInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    incorRespInput.add64(5000);
    const incorRespEnc = await incorRespInput.encrypt();

    await (
      await cipherTrust.connect(operator).verifyAuthChallenge(
        incorRespEnc.handles[0],
        incorRespEnc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();
    expect(await cipherTrust.authPassed(operator.address)).to.equal(false);
  });

  it("handles biometric uniqueness checks and Sybil rejections (FHE-Passport)", async function () {
    const ctAddress = await cipherTrust.getAddress();

    // 1. Register User 1 passport: (100, 200, 300)
    const p1Input = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    p1Input.add64(100);
    p1Input.add64(200);
    p1Input.add64(300);
    const p1Enc = await p1Input.encrypt();

    await (
      await cipherTrust.connect(operator).requestPassportRegistration(
        p1Enc.handles[0],
        p1Enc.handles[1],
        p1Enc.handles[2],
        p1Enc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();
    expect(await cipherTrust.passportUnique(operator.address)).to.equal(true);
    expect(await cipherTrust.hasPassport(operator.address)).to.equal(true);
    expect(await cipherTrust.passportCount()).to.equal(1);

    // 2. Register User 2 passport: (200, 300, 400) - Should be unique (dist = 300 > 10)
    const p2Input = hre.fhevm.createEncryptedInput(ctAddress, admin.address);
    p2Input.add64(200);
    p2Input.add64(300);
    p2Input.add64(400);
    const p2Enc = await p2Input.encrypt();

    await (
      await cipherTrust.connect(admin).requestPassportRegistration(
        p2Enc.handles[0],
        p2Enc.handles[1],
        p2Enc.handles[2],
        p2Enc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();
    expect(await cipherTrust.passportUnique(admin.address)).to.equal(true);
    expect(await cipherTrust.hasPassport(admin.address)).to.equal(true);
    expect(await cipherTrust.passportCount()).to.equal(2);

    // 3. User 3 attempts to register duplicate template of User 1 (102, 198, 301) - Distance = 5 <= 10 -> Should be rejected
    const signers = await hre.ethers.getSigners();
    const stranger = signers[3];
    
    const p3Input = hre.fhevm.createEncryptedInput(ctAddress, stranger.address);
    p3Input.add64(102);
    p3Input.add64(198);
    p3Input.add64(301);
    const p3Enc = await p3Input.encrypt();

    await (
      await cipherTrust.connect(stranger).requestPassportRegistration(
        p3Enc.handles[0],
        p3Enc.handles[1],
        p3Enc.handles[2],
        p3Enc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();
    expect(await cipherTrust.passportUnique(stranger.address)).to.equal(false);
    expect(await cipherTrust.hasPassport(stranger.address)).to.equal(false);
    expect(await cipherTrust.passportCount()).to.equal(2);
  });

  it("handles confidential behavioral anomaly detection for AI agents (FHE-Aegis)", async function () {
    const ctAddress = await cipherTrust.getAddress();

    // Register agent 0
    await (await cipherTrust.connect(admin).registerAgent(operator.address, 0)).wait();

    // 1. Register agent baseline: TxSize = 10, Freq = 5, Confidence = 90
    const baseInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    baseInput.add64(10);
    baseInput.add64(5);
    baseInput.add64(90);
    const baseEnc = await baseInput.encrypt();

    await (
      await cipherTrust.connect(operator).registerAgentBaseline(
        0,
        baseEnc.handles[0],
        baseEnc.handles[1],
        baseEnc.handles[2],
        baseEnc.inputProof
      )
    ).wait();

    // Set some bond so we can verify slashing on hijack
    await (await cipherTrust.connect(operator).depositBond(0, { value: hre.ethers.parseEther("5") })).wait();

    // 2. Evaluate normal behavior: TxSize = 12, Freq = 6, Confidence = 88 (drift = 4 + 1 + 4 = 9 <= 1000)
    const normInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    normInput.add64(12);
    normInput.add64(6);
    normInput.add64(88);
    const normEnc = await normInput.encrypt();

    await (
      await cipherTrust.connect(operator).evaluateAgentBehavior(
        0,
        normEnc.handles[0],
        normEnc.handles[1],
        normEnc.handles[2],
        normEnc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();
    expect(await cipherTrust.agentBehaviorCompromised(0)).to.equal(false);
    
    const agentBefore = await cipherTrust.getAgent(0);
    expect(agentBefore.active).to.equal(true);

    // 3. Evaluate hijacked/rogue behavior: TxSize = 50, Freq = 20, Confidence = 30 (drift = 1600 + 225 + 3600 = 5425 > 1000)
    const rogueInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    rogueInput.add64(50);
    rogueInput.add64(20);
    rogueInput.add64(30);
    const rogueEnc = await rogueInput.encrypt();

    await (
      await cipherTrust.connect(operator).evaluateAgentBehavior(
        0,
        rogueEnc.handles[0],
        rogueEnc.handles[1],
        rogueEnc.handles[2],
        rogueEnc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();
    expect(await cipherTrust.agentBehaviorCompromised(0)).to.equal(true);

    const agentAfter = await cipherTrust.getAgent(0);
    expect(agentAfter.active).to.equal(false);
    expect(agentAfter.postedBond).to.equal(0n);
  });

  it("handles confidential payroll streaming and yields (FHE-Stream)", async function () {
    const ctAddress = await cipherTrust.getAddress();

    const signers = await hre.ethers.getSigners();
    const fundingTx = await signers[0].sendTransaction({
      to: ctAddress,
      value: hre.ethers.parseEther("1.0")
    });
    await fundingTx.wait();

    // 1. Admin creates a salary stream for operator: flowRate = 1000 wei per block
    const rateInput = hre.fhevm.createEncryptedInput(ctAddress, admin.address);
    rateInput.add64(1000);
    const rateEnc = await rateInput.encrypt();

    await (
      await cipherTrust.connect(admin).createSalaryStream(
        operator.address,
        rateEnc.handles[0],
        rateEnc.inputProof
      )
    ).wait();

    // Mine 5 blocks
    for (let i = 0; i < 5; i++) {
      await hre.ethers.provider.send("evm_mine", []);
    }

    // 2. Claim stream rewards
    const claimTx = await cipherTrust.connect(operator).claimSalaryStream();
    const receipt = await claimTx.wait();

    await hre.fhevm.awaitDecryptionOracle();

    // Verify event logs to see claimed amount (6000 wei: 5 mined blocks + 1 claim transaction block)
    const filter = cipherTrust.filters.StreamClaimed(operator.address);
    const events = await cipherTrust.queryFilter(filter, 0, "latest");
    expect(events.length).to.equal(1);
    expect(events[0].args.amount).to.equal(6000n);
  });

  it("handles confidential location triangulation and physical proof checks (FHE-Triangulation)", async () => {
    const ctAddress = await cipherTrust.getAddress();

    // 1. Success case: actual location (30, 40)
    // Distance Squares to Beacons:
    // A(10, 10): 1300, B(90, 10): 4500, C(50, 80): 2000
    const successInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    successInput.add64(30);
    successInput.add64(40);
    successInput.add64(1300);
    successInput.add64(4500);
    successInput.add64(2000);
    const successEnc = await successInput.encrypt();

    await (
      await cipherTrust.connect(operator).requestTriangulation(
        successEnc.handles[0],
        successEnc.handles[1],
        successEnc.handles[2],
        successEnc.handles[3],
        successEnc.handles[4],
        successEnc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();

    expect(await cipherTrust.locationVerified(operator.address)).to.be.true;

    // 2. Failure case: spoofed distance coordinates (e.g. sending 0 for distances)
    const spoofInput = hre.fhevm.createEncryptedInput(ctAddress, operator.address);
    spoofInput.add64(30);
    spoofInput.add64(40);
    spoofInput.add64(0);
    spoofInput.add64(0);
    spoofInput.add64(0);
    const spoofEnc = await spoofInput.encrypt();

    await (
      await cipherTrust.connect(operator).requestTriangulation(
        spoofEnc.handles[0],
        spoofEnc.handles[1],
        spoofEnc.handles[2],
        spoofEnc.handles[3],
        spoofEnc.handles[4],
        spoofEnc.inputProof
      )
    ).wait();

    await hre.fhevm.awaitDecryptionOracle();

    expect(await cipherTrust.locationVerified(operator.address)).to.be.false;
  });
});

