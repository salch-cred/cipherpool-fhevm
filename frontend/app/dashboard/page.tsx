"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Cpu, 
  Activity, 
  Lock, 
  Key, 
  Coins, 
  Terminal, 
  UserCheck, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  FileCode,
  Gauge,
  Skull,
  Radio,
  ArrowDownLeft,
  Percent
} from "lucide-react";

export default function Dashboard() {
  const [role, setRole] = useState<"operator" | "oracle" | "underwriter" | "admin">("operator");
  const [logs, setLogs] = useState<string[]>([
    "Encrypted Bayesian Filter (EBF) system initialized.",
    "Confidential Parametric Auto-Liquidation Engine active.",
    "Sensor Outlier Filter active (MAX_DRIFT = 2).",
    "Confidential Credit Delegation & FHE Yield Pricing module active.",
    "Ready for agent registration."
  ]);
  
  // Simulated State representing the Smart Contract state
  const [agentRegistered, setAgentRegistered] = useState(false);
  const [agentActive, setAgentActive] = useState(true);
  const [agentId, setAgentId] = useState("0");
  const [agentType, setAgentType] = useState("trading-bot");
  const [postedCollateral, setPostedCollateral] = useState(0); // in ETH
  const [delegatedBond, setDelegatedBond] = useState(0); // in ETH borrowed from pool
  const [interestAccumulated, setInterestAccumulated] = useState(0); // in ETH
  
  // Encrypted state (stored as ciphertext handles on-chain)
  const [encryptedScore, setEncryptedScore] = useState("0x8e83f...c129e");
  const [encryptedRequiredBond, setEncryptedRequiredBond] = useState("0x3f12a...77b10");
  const [encryptedSufficiency, setEncryptedSufficiency] = useState("0xab120...de09a");
  const [encryptedLiquidationThreshold, setEncryptedLiquidationThreshold] = useState("0x4f12d...9a01e");
  const [encryptedDelegatedBond, setEncryptedDelegatedBond] = useState("0x00000...00000");
  const [encryptedInterestAccumulated, setEncryptedInterestAccumulated] = useState("0x00000...00000");
  
  // Bayesian Filter state variables
  const [trustScoreVar, setTrustScoreVar] = useState(100); // starts at 100
  
  // Decrypted values (visible to authorized roles only)
  const [decryptedScore, setDecryptedScore] = useState<number | null>(null);
  const [decryptedRequiredBond, setDecryptedRequiredBond] = useState<number | null>(null);
  const [decryptedSufficiency, setDecryptedSufficiency] = useState<boolean | null>(null);
  
  // Insurance Pool State
  const [poolStaked, setPoolStaked] = useState(10); // 10 ETH initial staking
  
  // Task Underwriting & Claims State
  const [activeTask, setActiveTask] = useState<{ client: string; limit: number; active: boolean } | null>(null);
  const [taskClient, setTaskClient] = useState("0x90F8bf...244f0");
  const [taskLimit, setTaskLimit] = useState(3);
  const [payoutLog, setPayoutLog] = useState<{ client: string; amount: number; severity: number; remainder: number } | null>(null);

  // FHE-ML Perceptron State Variables
  const [wComp, setWComp] = useState(40);
  const [wUpt, setWUpt] = useState(30);
  const [wLat, setWLat] = useState(15);
  const [wErr, setWErr] = useState(80);
  const [bias, setBias] = useState(200);
  const [riskThreshold, setRiskThreshold] = useState(800);
  const [encryptedNeuralRisk, setEncryptedNeuralRisk] = useState("0x4e93f...a209c");
  const [decryptedNeuralRisk, setDecryptedNeuralRisk] = useState<number | null>(null);

  // Hardware Leasing State Variables
  const [activeLease, setActiveLease] = useState<{ id: number; hardwareId: number; bond: number; active: boolean } | null>(null);
  const [inputHardwareId, setInputHardwareId] = useState(999);
  const [inputLeaseBond, setInputLeaseBond] = useState(3);
  const [leaseLog, setLeaseLog] = useState<{ id: number; success: boolean; payout: number } | null>(null);

  // FHE-MFA Biometrics State Variables
  const [biometricsRegistered, setBiometricsRegistered] = useState(false);
  const [bioX, setBioX] = useState(100);
  const [bioY, setBioY] = useState(200);
  const [bioZ, setBioZ] = useState(300);
  const [authX, setAuthX] = useState(102);
  const [authY, setAuthY] = useState(198);
  const [authZ, setAuthZ] = useState(301);
  const [authVerified, setAuthVerified] = useState<boolean | null>(null);
  const [isVerifyingBio, setIsVerifyingBio] = useState(false);

  // FHE-Guard: Spam Filtering State
  const [spamThresholdVal, setSpamThresholdVal] = useState(15);
  const [msgInboxCount, setMsgInboxCount] = useState(0);
  const [msgSpamInboxCount, setMsgSpamInboxCount] = useState(0);
  const [msgWeightA, setMsgWeightA] = useState(3);
  const [msgWeightB, setMsgWeightB] = useState(4);
  const [msgWeightC, setMsgWeightC] = useState(5);
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [lastMsgSpamStatus, setLastMsgSpamStatus] = useState<boolean | null>(null);

  // FHE-Guard: Passwordless Auth State
  const [secretRegistered, setSecretRegistered] = useState(false);
  const [authSecretVal, setAuthSecretVal] = useState(5000);
  const [authChallengeVal, setAuthChallengeVal] = useState<number | null>(null);
  const [authResponseVal, setAuthResponseVal] = useState(5123);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);
  const [authPassStatus, setAuthPassStatus] = useState<boolean | null>(null);

  // FHE-Passport State Variables
  const [hasPassport, setHasPassport] = useState(false);
  const [passportRegisteredCount, setPassportRegisteredCount] = useState(0);
  const [passportX, setPassportX] = useState(100);
  const [passportY, setPassportY] = useState(200);
  const [passportZ, setPassportZ] = useState(300);
  const [passportUniqueStatus, setPassportUniqueStatus] = useState<boolean | null>(null);
  const [isCheckingPassport, setIsCheckingPassport] = useState(false);
  const [registeredTemplates, setRegisteredTemplates] = useState<{x: number, y: number, z: number}[]>([]);

  // FHE-Aegis State Variables
  const [hasBaseline, setHasBaseline] = useState(false);
  const [baseTxSize, setBaseTxSize] = useState(10);
  const [baseFreq, setBaseFreq] = useState(5);
  const [baseConfidence, setBaseConfidence] = useState(90);
  const [currentTxSize, setCurrentTxSize] = useState(12);
  const [currentFreq, setCurrentFreq] = useState(6);
  const [currentConfidence, setCurrentConfidence] = useState(88);
  const [isCompromised, setIsCompromised] = useState<boolean | null>(null);
  const [isCheckingBehavior, setIsCheckingBehavior] = useState(false);

  // FHE-Stream State Variables
  const [streamFlowRate, setStreamFlowRate] = useState(100);
  const [streamActive, setStreamActive] = useState(false);
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const [isClaimingStream, setIsClaimingStream] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);
  const [streamBlocksAccrued, setStreamBlocksAccrued] = useState(0);

  // Inputs
  const [inputCompletionA, setInputCompletionA] = useState(9);
  const [inputCompletionB, setInputCompletionB] = useState(9);
  const [inputUptimeA, setInputUptimeA] = useState(9);
  const [inputUptimeB, setInputUptimeB] = useState(9);
  
  const [inputLatency, setInputLatency] = useState(9);
  const [inputError, setInputError] = useState(0);
  const [depositAmount, setDepositAmount] = useState(5);
  const [borrowAmount, setBorrowAmount] = useState(5);
  const [isSlashing, setIsSlashing] = useState(false);
  
  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Simulate passive interest accrual
  useEffect(() => {
    if (!agentRegistered || !agentActive || delegatedBond === 0) return;
    
    const interval = setInterval(() => {
      // Interest rate depends on score:
      // Score >= 750 -> 1% (0.01)
      // Score >= 400 -> 5% (0.05)
      // else -> 25% (0.25)
      const score = decryptedScore ?? 500;
      const apr = score >= 750 ? 0.01 : score >= 400 ? 0.05 : 0.25;
      
      // Accumulate interest rapidly for visual effect (0.0001 ETH per second per delegated ETH)
      const rateFactor = apr * 0.001;
      const increment = delegatedBond * rateFactor;
      
      setInterestAccumulated((prev) => {
        const next = Number((prev + increment).toFixed(6));
        setEncryptedInterestAccumulated(`0x${Math.random().toString(16).substring(2, 8)}...${Math.random().toString(16).substring(2, 5)}`);
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [agentRegistered, agentActive, delegatedBond, decryptedScore]);

  const handleRegisterAgent = () => {
    setAgentRegistered(true);
    setAgentActive(true);
    setPostedCollateral(0);
    setDelegatedBond(0);
    setInterestAccumulated(0);
    setTrustScoreVar(100);
    setDecryptedScore(500); // starts neutral
    setDecryptedRequiredBond(5.0); // 1.0 (base) + 100 * 0.04 (variance premium) = 5.0 ETH
    setDecryptedSufficiency(false);
    setActiveTask(null);
    setPayoutLog(null);
    addLog("Tx: registerAgent(operator, identityId=0) broadcasted.");
    addLog("Agent #0 registered. Variance σ² initialized to 100 (maximum uncertainty).");
    addLog("On-chain FHE liquidation threshold set to 300 (encrypted).");
    addLog("Calculated required bond: base (1.0 ETH) + uncertainty premium (4.0 ETH) = 5.0 ETH.");
  };

  const handleDepositCollateral = () => {
    const newTotal = postedCollateral + depositAmount;
    setPostedCollateral(newTotal);
    addLog(`Tx: depositCollateral(agentId=0) - deposited ${depositAmount} ETH.`);
    
    // Check sufficiency
    if (decryptedRequiredBond !== null) {
      const sufficient = (newTotal + delegatedBond) >= decryptedRequiredBond;
      setDecryptedSufficiency(sufficient);
      addLog(`Re-evaluating FHE sufficiency: totalCollateral(${(newTotal + delegatedBond).toFixed(2)} ETH) >= requiredBond(${decryptedRequiredBond} ETH) -> ${sufficient ? "Sufficient" : "Insufficient"}`);
    }
  };

  const handleRequestCredit = () => {
    if (poolStaked < borrowAmount) {
      addLog("[ERROR] Insufficient Insurance Pool liquidity to delegate credit.");
      return;
    }
    setPoolStaked((prev) => prev - borrowAmount);
    const newDelegated = delegatedBond + borrowAmount;
    setDelegatedBond(newDelegated);
    
    setEncryptedDelegatedBond(`0x${Math.random().toString(16).substring(2, 8)}...${Math.random().toString(16).substring(2, 5)}`);
    addLog(`Tx: requestCreditDelegation(agentId=0, amount=${borrowAmount} ETH) broadcasted.`);
    addLog(`Credit delegated from InsurancePool. Robot's delegated bond on-chain increases to ${newDelegated} ETH.`);
    
    // Check sufficiency
    if (decryptedRequiredBond !== null) {
      const sufficient = (postedCollateral + newDelegated) >= decryptedRequiredBond;
      setDecryptedSufficiency(sufficient);
      addLog(`Re-evaluating FHE sufficiency: totalCollateral(${(postedCollateral + newDelegated).toFixed(2)} ETH) >= requiredBond(${decryptedRequiredBond} ETH) -> ${sufficient ? "Sufficient" : "Insufficient"}`);
    }
  };

  const handleRepayInterest = () => {
    if (interestAccumulated === 0) return;
    const paid = interestAccumulated;
    setPoolStaked((prev) => prev + paid);
    setInterestAccumulated(0);
    setEncryptedInterestAccumulated("0x00000...00000");
    addLog(`Tx: repayInterest(agentId=0, value=${paid.toFixed(6)} ETH) sent.`);
    addLog(`Accrued interest repaid to InsurancePool. Interest balance reset to 0.`);
  };

  const handleRequestLease = () => {
    const badgeTier = decryptedScore !== null ? (decryptedScore >= 750 ? 3 : decryptedScore >= 400 ? 2 : 1) : 0;
    if (badgeTier < 2) {
      addLog(`[ERROR] Insufficient reputation tier (Tier ${badgeTier}) for lease underwriting. Tier 2 (Medium) or Tier 3 (High) required.`);
      return;
    }
    if (poolStaked < inputLeaseBond) {
      addLog(`[ERROR] InsurancePool has insufficient liquidity (${poolStaked.toFixed(2)} ETH) to delegate credit for lease bond (${inputLeaseBond} ETH).`);
      return;
    }
    
    setActiveLease({
      id: 1,
      hardwareId: inputHardwareId,
      bond: inputLeaseBond,
      active: true
    });
    setPoolStaked(prev => prev - inputLeaseBond);
    
    addLog(`Tx: requestLeaseHardware(agentId=0, hardwareId=${inputHardwareId}, leaseBond=${inputLeaseBond} ETH) sent.`);
    addLog(`Lease successfully activated with ZERO user deposit. Credit delegated from InsurancePool.`);
  };

  const handleSettleLease = (success: boolean) => {
    if (!activeLease) return;
    
    const leaseId = activeLease.id;
    const bond = activeLease.bond;
    const hardware = activeLease.hardwareId;
    
    setActiveLease(null);
    
    if (success) {
      setPoolStaked(prev => prev + bond);
      setLeaseLog({ id: leaseId, success: true, payout: 0 });
      addLog(`Tx: settleLeaseHardware(leaseId=${leaseId}, success=true) sent.`);
      addLog(`Lease completed successfully. Delegated bond of ${bond} ETH fully repaid to InsurancePool.`);
    } else {
      setLeaseLog({ id: leaseId, success: false, payout: bond });
      addLog(`[SLASH ALERT] Lessee damaged or stole hardware!`);
      addLog(`Tx: settleLeaseHardware(leaseId=${leaseId}, success=false) sent.`);
      addLog(`[SLASH ALERT] Underwritten bond of ${bond} ETH fully slashed to compensate Hardware Owner.`);
    }
  };

  const handleRegisterBiometrics = () => {
    setBiometricsRegistered(true);
    addLog(`Tx: registerBiometricSignature(X=${bioX}, Y=${bioY}, Z=${bioZ}) broadcasted.`);
    addLog(`Encrypted 3D biometric vector registered on-chain for msg.sender.`);
  };

  const handleVerifyBiometrics = () => {
    setIsVerifyingBio(true);
    setAuthVerified(null);
    addLog(`Tx: requestBiometricAuth(X_f=${authX}, Y_f=${authY}, Z_f=${authZ}) sent.`);
    addLog(`Awaiting Zama KMS Decryption callback...`);

    setTimeout(() => {
      const distance = Math.abs(bioX - authX) + Math.abs(bioY - authY) + Math.abs(bioZ - authZ);
      const success = distance <= 15;
      
      setIsVerifyingBio(false);
      setAuthVerified(success);
      if (success) {
        addLog(`[MFA SUCCESS] Biometrics authenticated! Manhattan distance: ${distance} <= 15.`);
      } else {
        addLog(`[MFA FAILED] Intruder Alert! Biometric drift: ${distance} > 15 tolerance limit.`);
      }
    }, 1500);
  };

  // FHE-Guard: Spam Filtering Handlers
  const handleSendMsg = () => {
    setIsSendingMsg(true);
    setLastMsgSpamStatus(null);
    addLog(`Tx: sendConfidentialMessage(wA=${msgWeightA}, wB=${msgWeightB}, wC=${msgWeightC}) sent.`);
    addLog(`Awaiting Zama KMS Decryption spam evaluation callback...`);

    setTimeout(() => {
      const sum = msgWeightA + msgWeightB + msgWeightC;
      const isSpam = sum > spamThresholdVal;
      
      setIsSendingMsg(false);
      setLastMsgSpamStatus(isSpam);
      
      if (isSpam) {
        setMsgSpamInboxCount(prev => prev + 1);
        addLog(`[SPAM BLOCKED] Message classified as SPAM! Total weight: ${sum} > threshold (${spamThresholdVal}).`);
      } else {
        setMsgInboxCount(prev => prev + 1);
        addLog(`[INBOX SUCCESS] Message received in primary inbox! Total weight: ${sum} <= threshold (${spamThresholdVal}).`);
      }
    }, 1500);
  };

  // FHE-Guard: Passwordless Auth Handlers
  const handleRegisterSecret = () => {
    setSecretRegistered(true);
    addLog(`Tx: registerAuthSecret(Secret=${authSecretVal}) broadcasted.`);
    addLog(`On-chain FHE credential master secret registered successfully.`);
  };

  const handleGenerateChallenge = () => {
    const chall = Math.floor(Math.random() * 900) + 100;
    setAuthChallengeVal(chall);
    setAuthResponseVal(authSecretVal + chall);
    addLog(`Tx: generateAuthChallenge() -> Generated random challenge seed: ${chall}.`);
  };

  const handleVerifyChallenge = () => {
    setIsVerifyingAuth(true);
    setAuthPassStatus(null);
    addLog(`Tx: verifyAuthChallenge(Response=${authResponseVal}) sent.`);
    addLog(`Evaluating response = secret + challenge under FHE. Awaiting KMS callback...`);

    setTimeout(() => {
      const expected = authSecretVal + (authChallengeVal ?? 0);
      const success = authResponseVal === expected;
      
      setIsVerifyingAuth(false);
      setAuthPassStatus(success);
      if (success) {
        addLog(`[AUTH SUCCESS] Passwordless Login Verified! Response matched expected decrypted sum.`);
      } else {
        addLog(`[AUTH FAILED] Access Denied! Invalid credentials challenge response.`);
      }
    }, 1500);
  };

  // FHE-Passport: Biometric Uniqueness Check Handlers
  const handleRequestPassport = () => {
    setIsCheckingPassport(true);
    setPassportUniqueStatus(null);
    addLog(`Tx: requestPassportRegistration(X=${passportX}, Y=${passportY}, Z=${passportZ}) sent.`);
    addLog(`Awaiting Zama KMS Decryption uniqueness validation callback...`);

    setTimeout(() => {
      let duplicateFound = false;
      for (const t of registeredTemplates) {
        const distance = Math.abs(t.x - passportX) + Math.abs(t.y - passportY) + Math.abs(t.z - passportZ);
        if (distance <= 10) {
          duplicateFound = true;
          break;
        }
      }

      const isUnique = !duplicateFound;
      setIsCheckingPassport(false);
      setPassportUniqueStatus(isUnique);

      if (isUnique) {
        setHasPassport(true);
        setPassportRegisteredCount(prev => prev + 1);
        setRegisteredTemplates(prev => [...prev, { x: passportX, y: passportY, z: passportZ }]);
        addLog(`[PASSPORT REGISTERED] Welcome User! Biometric template unique. Sybil-Proof Identity registered.`);
      } else {
        addLog(`[PASSPORT REJECTED] Sybil attack blocked! Biometric template too close to an existing passport.`);
      }
    }, 1500);
  };

  // FHE-Aegis: Behavioral Anomaly Detector Handlers
  const handleRegisterBaseline = () => {
    setHasBaseline(true);
    addLog(`Tx: registerAgentBaseline(TxSize=${baseTxSize}, Freq=${baseFreq}, Confidence=${baseConfidence}) sent.`);
    addLog(`[BASE REGISTRATION] Operational baseline metrics registered successfully under FHE.`);
  };

  const handleEvaluateBehavior = () => {
    setIsCheckingBehavior(true);
    setIsCompromised(null);
    addLog(`Tx: evaluateAgentBehavior(TxSize=${currentTxSize}, Freq=${currentFreq}, Confidence=${currentConfidence}) sent.`);
    addLog(`Computing behavioral squared Euclidean drift under FHE. Awaiting Zama KMS callback...`);

    setTimeout(() => {
      const drift = Math.pow(currentTxSize - baseTxSize, 2) + Math.pow(currentFreq - baseFreq, 2) + Math.pow(currentConfidence - baseConfidence, 2);
      const breached = drift > 1000;

      setIsCheckingBehavior(false);
      setIsCompromised(breached);

      if (breached) {
        setAgentActive(false);
        setPostedCollateral(0);
        setDelegatedBond(0);
        addLog(`[AEGIS ALARM] Compromised agent behavior drift detected! Drift: ${drift} > 1000. Slashed and Deactivated.`);
      } else {
        addLog(`[AEGIS NORMAL] Agent behavior within normal parameters. Drift: ${drift} <= 1000.`);
      }
    }, 1500);
  };

  // FHE-Stream: Confidential Salary & Yield Streaming Handlers
  const handleCreateStream = () => {
    setIsCreatingStream(true);
    addLog(`Tx: createSalaryStream(rate=${streamFlowRate} tokens/block) sent.`);
    
    setTimeout(() => {
      setIsCreatingStream(false);
      setStreamActive(true);
      setStreamBlocksAccrued(0);
      addLog(`[STREAM CREATED] Confidential salary stream successfully initialized on-chain.`);
    }, 1200);
  };

  const handleClaimStream = () => {
    setIsClaimingStream(true);
    setClaimedAmount(null);
    addLog(`Tx: claimSalaryStream() sent.`);
    addLog(`Aggregating streamed blocks (${streamBlocksAccrued} blocks) and decrypting yield under FHE...`);

    setTimeout(() => {
      const claim = streamFlowRate * streamBlocksAccrued;
      setIsClaimingStream(false);
      setClaimedAmount(claim);
      setStreamBlocksAccrued(0);
      addLog(`[STREAM CLAIMED] Successfully claimed stream yield of ${claim} native tokens! Funds transferred.`);
    }, 1500);
  };

  const handleRegisterTask = () => {
    const totalCollateral = postedCollateral + delegatedBond;
    if (totalCollateral < taskLimit) {
      addLog(`[ERROR] Insufficient collateral bond (${totalCollateral} ETH) to underwrite task limit of ${taskLimit} ETH.`);
      return;
    }
    setActiveTask({
      client: taskClient,
      limit: taskLimit,
      active: true
    });
    addLog(`Tx: registerUnderwrittenTask(agentId=0, client=${taskClient}, limit=${taskLimit} ETH) sent.`);
    addLog(`Task successfully underwritten on-chain. Active coverage locked: ${taskLimit} ETH.`);
  };

  const handleOracleSubmit = async () => {
    addLog("Initiating Telemetry Submission...");
    addLog(`Client-side encrypting redundant sensor readings: CompA=${inputCompletionA}, CompB=${inputCompletionB}, UptA=${inputUptimeA}, UptB=${inputUptimeB}...`);
    
    // Generate mock ciphertexts
    const r1 = Math.random().toString(16).substring(2, 7);
    const r2 = Math.random().toString(16).substring(2, 7);
    addLog(`Ciphertexts generated. Handles: compA_ct=0x${r1}... uptA_ct=0x${r2}...`);
    addLog("Tx: submitTelemetry(agentId=0, compA_ct, compB_ct, uptA_ct, uptB_ct, latency_ct, error_ct, inputProof) sent.");
    
    // Anomaly Detection
    const compDiff = Math.abs(inputCompletionA - inputCompletionB);
    const uptDiff = Math.abs(inputUptimeA - inputUptimeB);
    const hasAnomaly = compDiff > 2 || uptDiff > 2;
    
    // Compute EBF Update
    const ORACLE_VAR = 50;
    const oldVar = trustScoreVar;
    const newVar = Math.max(10, Math.floor((oldVar * ORACLE_VAR) / (oldVar + ORACLE_VAR)));
    
    const alpha = (ORACLE_VAR * 100) / (oldVar + ORACLE_VAR);
    const beta = (oldVar * 100) / (oldVar + ORACLE_VAR);
    
    // x_obs = weighted telemetry sum
    let x_obs = 0;
    let finalComp = 0;
    let finalUpt = 0;
    let finalLat = 0;
    let finalErr = 0;

    if (hasAnomaly) {
      // strict penalty: all success scores are 0, error rate is 10/10
      x_obs = 0 - 10 * 15;
      finalComp = 0;
      finalUpt = 0;
      finalLat = 0;
      finalErr = 10;
    } else {
      const compAvg = (inputCompletionA + inputCompletionB) / 2;
      const uptAvg = (inputUptimeA + inputUptimeB) / 2;
      x_obs = compAvg * 40 + uptAvg * 30 + inputLatency * 15 - inputError * 15;
      finalComp = compAvg;
      finalUpt = uptAvg;
      finalLat = inputLatency;
      finalErr = inputError;
    }
    
    // Evaluate FHE-ML Neural Perceptron (Confidential Predictor)
    const positiveRisk = (finalLat * wLat) + (finalErr * wErr) + bias;
    const negativeRisk = (finalComp * wComp) + (finalUpt * wUpt);
    const neuralRisk = Math.max(0, positiveRisk - negativeRisk);
    const isNeuralBreach = neuralRisk > riskThreshold;

    const currentScore = decryptedScore ?? 500;
    
    // Bayesian FHE weighted mean
    const newScore = Math.floor((currentScore * alpha + Math.max(0, x_obs) * beta) / 100);
    const clampedScore = Math.max(0, Math.min(1000, newScore));
    
    const isLiquidated = clampedScore < 300 || isNeuralBreach;
    
    setTimeout(() => {
      setDecryptedNeuralRisk(neuralRisk);
      const rRisk = Math.random().toString(16).substring(2, 7);
      setEncryptedNeuralRisk(`0x${rRisk}...${neuralRisk.toString(16).toUpperCase()}`);

      addLog(`[FHE-ML] Evaluating On-Chain Perceptron: positiveRisk=${positiveRisk}, negativeRisk=${negativeRisk} -> Neural ReLU Risk: ${neuralRisk}/${riskThreshold}`);
      if (isNeuralBreach) {
        addLog(`[FHE-ML ALERT] Neural Risk predicted (${neuralRisk}) exceeds underwriting threshold (${riskThreshold})!`);
      }

      if (hasAnomaly) {
        addLog(`[ANOMALY DETECTED] Telemetry drift exceeded MAX_DRIFT limit of 2.`);
        addLog(`[ANOMALY DETECTED] Strict hardware fault penalty applied: telemetry discarded and error set to 10.`);
      }
      
      if (isLiquidated) {
        setTrustScoreVar(newVar);
        setDecryptedScore(clampedScore);
        setAgentActive(false);
        setDecryptedRequiredBond(0);
        setDecryptedSufficiency(false);
        
        const selfBond = postedCollateral;
        const borrowedBond = delegatedBond;
        const totalBond = selfBond + borrowedBond;
        
        setPostedCollateral(0);
        setDelegatedBond(0);
        setInterestAccumulated(0);
        
        const severity = 1000 - clampedScore;
        let payout = 0;
        if (activeTask && activeTask.active) {
          payout = Number(((activeTask.limit * severity) / 1000).toFixed(4));
        }
        if (payout > totalBond) payout = totalBond;
        const remainder = totalBond - payout;
        
        if (activeTask && activeTask.active) {
          setPayoutLog({
            client: activeTask.client,
            amount: payout,
            severity: severity,
            remainder: remainder
          });
          setPoolStaked(prev => prev + remainder);
          setActiveTask(null);
        } else {
          setPoolStaked(prev => prev + totalBond);
        }
        
        addLog(`[ALERT] Bayesian trust score mean dropped to ${clampedScore}/1000.`);
        addLog(`[ALERT] FHE trust score fell below liquidation threshold (300)!`);
        if (payout > 0) {
          addLog(`[ALERT] FHE Parametric Claim paid: ${payout} ETH sent to Client (${activeTask?.client}).`);
          addLog(`[ALERT] Slashing remainder of ${remainder.toFixed(4)} ETH returned to InsurancePool LPs.`);
        } else {
          addLog(`[ALERT] FHE Auto-Liquidation triggered. Total bond of ${totalBond} ETH fully slashed and sent to InsurancePool.`);
        }
        addLog("[ALERT] Agent #0 deactivated and marked as LIQUIDATED.");
      } else {
        // Dynamic Premium math: requiredBond = base + premium
        let baseBond = 1.0; // medium trust base
        if (clampedScore >= 750) baseBond = 0.1;
        else if (clampedScore < 400) baseBond = 5.0;
        
        const premium = newVar * 0.04;
        const requiredBond = Number((baseBond + premium).toFixed(2));
        
        setTrustScoreVar(newVar);
        setDecryptedScore(clampedScore);
        setDecryptedRequiredBond(requiredBond);
        const sufficient = (postedCollateral + delegatedBond) >= requiredBond;
        setDecryptedSufficiency(sufficient);
        
        setEncryptedScore(`0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 5)}`);
        setEncryptedRequiredBond(`0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 5)}`);
        setEncryptedSufficiency(`0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 5)}`);
        
        addLog(`Bayesian update applied. Variance σ² decreased from ${oldVar} to ${newVar}.`);
        addLog(`Updated Bayesian Trust Score Mean: ${clampedScore}/1000.`);
        addLog(`Dynamic Required Bond updated: base(${baseBond} ETH) + premium(${premium.toFixed(2)} ETH) = ${requiredBond} ETH.`);
      }
    }, 1000);
  };

  const handleRequestSlash = () => {
    setIsSlashing(true);
    addLog("Oracle requested async SLA breach slash check.");
    addLog("FHE.requestDecryption(breachFlag) called. Awaiting Zama KMS Decryption Oracle...");
    
    setTimeout(() => {
      setIsSlashing(false);
      const totalBond = postedCollateral + delegatedBond;
      const penalty = totalBond * 0.1;
      
      if (postedCollateral >= penalty) {
        setPostedCollateral((prev) => prev - penalty);
      } else {
        const diff = penalty - postedCollateral;
        setPostedCollateral(0);
        setDelegatedBond((prev) => Math.max(0, prev - diff));
      }
      
      const newTotal = Math.max(0, postedCollateral + delegatedBond - penalty);
      if (decryptedRequiredBond !== null) {
        setDecryptedSufficiency(newTotal >= decryptedRequiredBond);
      }
      addLog("KMS Oracle returned verified decryption: SLA breached!");
      addLog(`Agent slashed: 10% penalty of ${penalty.toFixed(2)} ETH sent to InsurancePool.`);
    }, 1500);
  };

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-12 text-white">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
              World First
            </span>
            <span className="text-white/40 text-xs">Reputation-Based FHE Credit Delegation</span>
          </div>
          <h1 className="bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent mt-1">
            CipherTrust Underwriting Control Center
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Confidential credit underwriting, sensor anomaly filtering, and FHE interest rate curves.
          </p>
        </div>
        
        {/* Role Selector */}
        <div className="flex rounded-lg bg-white/5 p-1 border border-white/10">
          {(["operator", "oracle", "underwriter"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                role === r 
                  ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                  : "text-white/60 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Side: Actions */}
        <div className="space-y-6 lg:col-span-7">
          {/* Operator Action card */}
          {role === "operator" && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">Operator Dashboard</h2>
              </div>

              {!agentRegistered ? (
                <div className="text-center py-8">
                  <p className="mb-4 text-sm text-white/60">
                    Register this autonomous agent to begin encrypted underwriting.
                  </p>
                  <button
                    onClick={handleRegisterAgent}
                    className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 animate-pulse"
                  >
                    Register Agent #0
                  </button>
                </div>
              ) : !agentActive ? (
                <div className="text-center py-8 border border-rose-500/20 bg-rose-500/5 rounded-lg">
                  <Skull className="h-10 w-10 text-rose-500 mx-auto mb-2 animate-bounce" />
                  <h3 className="text-lg font-bold text-rose-400">Agent Liquidated & Deactivated</h3>
                  <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto">
                    The FHE Trust Score dropped below the liquidation threshold (300). Posted bond has been fully slashed and operations are halted.
                  </p>
                  <button
                    onClick={handleRegisterAgent}
                    className="mt-4 rounded bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold transition text-white"
                  >
                    Re-register New Agent
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Collateral Deposit */}
                  <div className="rounded-lg bg-white/5 p-4 border border-white/5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                      Collateral Management (Self-Funded)
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase text-white/40 mb-1">
                          Deposit Amount (ETH)
                        </label>
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(Number(e.target.value))}
                          className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <button
                        onClick={handleDepositCollateral}
                        className="mt-5 rounded bg-cyan-500 px-6 py-2 text-sm font-bold text-black hover:opacity-90 transition"
                      >
                        Deposit Bond
                      </button>
                    </div>
                  </div>

                  {/* Credit Delegation */}
                  <div className="rounded-lg bg-white/5 p-4 border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                        Underwriting Credit Delegation (Lending)
                      </h3>
                      <span className="text-[10px] text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2 py-0.5 rounded font-mono">
                        Available Pool: {poolStaked.toFixed(2)} ETH
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mb-4">
                      Borrow required bond capital directly from the Insurance Pool. Repay interest accrued under FHE.
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase text-white/40 mb-1">
                          Borrow Amount (ETH)
                        </label>
                        <input
                          type="number"
                          value={borrowAmount}
                          onChange={(e) => setBorrowAmount(Number(e.target.value))}
                          className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <button
                        onClick={handleRequestCredit}
                        className="mt-5 rounded bg-indigo-500 px-6 py-2 text-sm font-bold text-white hover:opacity-90 transition flex items-center gap-1.5"
                      >
                        <ArrowDownLeft className="h-4 w-4" />
                        Borrow Bond
                      </button>
                    </div>

                    {delegatedBond > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                        <div className="rounded bg-white/2 p-3 border border-white/5">
                          <span className="text-[10px] text-white/40 uppercase block mb-1">Delegated Bond</span>
                          <span className="text-sm font-bold text-indigo-400">{delegatedBond} ETH</span>
                        </div>
                        <div className="rounded bg-white/2 p-3 border border-white/5 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-white/40 uppercase block mb-1">Interest Owed (FHE)</span>
                            <span className="text-sm font-bold text-rose-400">{interestAccumulated} ETH</span>
                          </div>
                          {interestAccumulated > 0 && (
                            <button
                              onClick={handleRepayInterest}
                              className="rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-1.5 text-xs font-bold hover:bg-rose-500/20 transition"
                            >
                              Repay
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Task Underwriting */}
                  <div className="rounded-lg bg-white/5 p-4 border border-white/5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                      Confidential Parametric Task Underwriting
                    </h3>
                    <p className="text-xs text-white/60">
                      Register a client's task. The robot's collateral bond (posted + delegated) will back this task's insurance coverage.
                    </p>

                    {activeTask && activeTask.active ? (
                      <div className="rounded bg-teal-500/10 border border-teal-500/20 p-3 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-teal-400 uppercase block font-semibold">Active Insured Task</span>
                          <span className="text-xs text-white/80">Client: {activeTask.client}</span>
                        </div>
                        <span className="text-xs font-bold text-teal-400 font-mono">Coverage: {activeTask.limit} ETH</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase text-white/40 mb-1">Client Address</label>
                            <input
                              type="text"
                              value={taskClient}
                              onChange={(e) => setTaskClient(e.target.value)}
                              className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-white/40 mb-1">Coverage Limit (ETH)</label>
                            <input
                              type="number"
                              value={taskLimit}
                              onChange={(e) => setTaskLimit(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleRegisterTask}
                          className="w-full rounded bg-gradient-to-r from-teal-400 to-indigo-500 py-2 text-xs font-bold text-black hover:opacity-90 transition"
                        >
                          Underwrite Task
                        </button>
                      </div>
                    )}

                    {payoutLog && (
                      <div className="rounded bg-rose-500/10 border border-rose-500/20 p-3 space-y-1">
                        <div className="flex justify-between items-center text-rose-400 font-semibold text-xs">
                          <span>⚠️ PARAMETRIC CLAIM PAID</span>
                          <span>-{payoutLog.amount} ETH</span>
                        </div>
                        <p className="text-[10px] text-white/60">
                          Failure Severity: {payoutLog.severity}/1000. Coverage paid to Client: {payoutLog.amount} ETH. Remainder {payoutLog.remainder.toFixed(4)} ETH returned to LP pool.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Hardware Leasing */}
                  <div className="rounded-lg bg-white/5 p-4 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-bold">
                        Zero-Deposit Hardware Leasing Portal
                      </h3>
                      <span className="text-[10px] text-white/40 border border-white/10 px-2 py-0.5 rounded font-mono">
                        Lessee: Operator
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      Lease high-performance GPU or DePIN hardware nodes without posting collateral deposits, backed by your on-chain revealed reputation score.
                    </p>

                    {activeLease && activeLease.active ? (
                      <div className="space-y-3">
                        <div className="rounded bg-indigo-500/10 border border-indigo-500/20 p-3 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-indigo-400 block font-semibold uppercase">ACTIVE UNDERWRITTEN LEASE</span>
                            <span className="text-xs text-white/80 font-mono">Hardware ID: #{activeLease.hardwareId}</span>
                          </div>
                          <span className="text-xs font-bold text-indigo-400 font-mono">Delegated Bond: {activeLease.bond} ETH</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSettleLease(true)}
                            className="flex-1 rounded bg-emerald-500 py-2 text-xs font-bold text-black hover:opacity-90 transition"
                          >
                            Return Hardware (Success)
                          </button>
                          <button
                            onClick={() => handleSettleLease(false)}
                            className="flex-1 rounded bg-rose-500 py-2 text-xs font-bold text-white hover:opacity-90 transition"
                          >
                            Flag Damage/Theft (Slash)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase text-white/40 mb-1">Hardware ID</label>
                            <input
                              type="number"
                              value={inputHardwareId}
                              onChange={(e) => setInputHardwareId(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-white/40 mb-1">Underwriting Bond (ETH)</label>
                            <input
                              type="number"
                              value={inputLeaseBond}
                              onChange={(e) => setInputLeaseBond(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleRequestLease}
                          className="w-full rounded bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 py-2 text-xs font-bold text-black hover:opacity-90 transition"
                        >
                          Request Zero-Deposit Lease
                        </button>
                      </div>
                    )}

                    {leaseLog && (
                      <div className={`rounded p-3 space-y-1 text-xs font-semibold ${
                        leaseLog.success 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                          : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                      }`}>
                        <div className="flex justify-between items-center">
                          <span>{leaseLog.success ? "✅ LEASE COMPLETED" : "🚨 LEASE SLASHED"}</span>
                          <span>{leaseLog.success ? "Bond Repaid" : `-${leaseLog.payout} ETH`}</span>
                        </div>
                        <p className="text-[10px] text-white/60 font-normal">
                          {leaseLog.success 
                            ? "Lease settled. Underwritten credit successfully returned to the pool." 
                            : `Hardware lease #${leaseLog.id} breached. Collateral bond paid to owner.`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* FHE-MFA Biometrics Authentication */}
                  <div className="rounded-lg bg-white/5 p-4 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-bold">
                        FHE-MFA: Confidential Biometric Gate
                      </h3>
                      <span className="text-[10px] text-white/40 border border-white/10 px-2 py-0.5 rounded font-mono">
                        Status: {biometricsRegistered ? "MFA Active" : "Unregistered"}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      Lock your account operations behind homomorphic biometric distance checking (Manhattan Distance metric |X - X_f| + |Y - Y_f| + |Z - Z_f| &le; 15).
                    </p>

                    {!biometricsRegistered ? (
                      <div className="space-y-3">
                        <span className="text-[10px] text-white/40 uppercase block font-semibold">Step 1: Register Encrypted Biometric Embedding</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">X Axis</label>
                            <input
                              type="number"
                              value={bioX}
                              onChange={(e) => setBioX(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Y Axis</label>
                            <input
                              type="number"
                              value={bioY}
                              onChange={(e) => setBioY(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Z Axis</label>
                            <input
                              type="number"
                              value={bioZ}
                              onChange={(e) => setBioZ(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleRegisterBiometrics}
                          className="w-full rounded bg-gradient-to-r from-cyan-400 to-indigo-500 py-2 text-xs font-bold text-black hover:opacity-90 transition"
                        >
                          Register Biometric Key (Encrypt & Store)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <span className="text-[10px] text-white/40 uppercase block font-semibold">Step 2: Authenticate with Fresh Biometrics</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">X Fresh</label>
                            <input
                              type="number"
                              value={authX}
                              onChange={(e) => setAuthX(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Y Fresh</label>
                            <input
                              type="number"
                              value={authY}
                              onChange={(e) => setAuthY(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Z Fresh</label>
                            <input
                              type="number"
                              value={authZ}
                              onChange={(e) => setAuthZ(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleVerifyBiometrics}
                          disabled={isVerifyingBio}
                          className="w-full rounded bg-cyan-500 py-2 text-xs font-bold text-black hover:opacity-90 transition font-bold"
                        >
                          {isVerifyingBio ? "Verifying under FHE..." : "Decrypt & Verify Authentication"}
                        </button>

                        {authVerified !== null && (
                          <div className={`rounded p-3 text-xs font-bold flex justify-between items-center ${
                            authVerified 
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                              : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                          }`}>
                            <span>{authVerified ? "🔓 ACCESS GRANTED" : "🔒 ACCESS DENIED"}</span>
                            <span className="font-mono text-[10px] text-white/50">
                              Drift: {Math.abs(bioX - authX) + Math.abs(bioY - authY) + Math.abs(bioZ - authZ)} / 15
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* FHE-Shield: Confidential Spam Filtering */}
                  <div className="rounded-lg bg-white/5 p-4 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-bold">
                        FHE-Shield: Confidential Spam Filter
                      </h3>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded font-mono">
                          Inbox: {msgInboxCount}
                        </span>
                        <span className="text-[10px] text-rose-400 border border-rose-500/20 bg-rose-500/5 px-2 py-0.5 rounded font-mono">
                          Spam: {msgSpamInboxCount}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-white/60">
                      Evaluate inbound message weights homomorphically without revealing their text content. Messages exceeding threshold are isolated into the spam folder.
                    </p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[9px] text-white/40 uppercase mb-0.5">Threshold</label>
                          <input
                            type="number"
                            value={spamThresholdVal}
                            onChange={(e) => setSpamThresholdVal(Number(e.target.value))}
                            className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-white/40 uppercase mb-0.5">W_A (Spam)</label>
                          <input
                            type="number"
                            value={msgWeightA}
                            onChange={(e) => setMsgWeightA(Number(e.target.value))}
                            className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-white/40 uppercase mb-0.5">W_B (Phish)</label>
                          <input
                            type="number"
                            value={msgWeightB}
                            onChange={(e) => setMsgWeightB(Number(e.target.value))}
                            className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-white/40 uppercase mb-0.5">W_C (Malware)</label>
                          <input
                            type="number"
                            value={msgWeightC}
                            onChange={(e) => setMsgWeightC(Number(e.target.value))}
                            className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSendMsg}
                        disabled={isSendingMsg}
                        className="w-full rounded bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 py-2 text-xs font-bold text-black hover:opacity-90 transition"
                      >
                        {isSendingMsg ? "Evaluating spam filters..." : "Send Confidential Message"}
                      </button>

                      {lastMsgSpamStatus !== null && (
                        <div className={`rounded p-3 text-xs font-bold flex justify-between items-center ${
                          lastMsgSpamStatus 
                            ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" 
                            : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        }`}>
                          <span>{lastMsgSpamStatus ? "🚨 MESSAGE BLOCKED (SPAM)" : "📩 MESSAGE DELIVERED (INBOX)"}</span>
                          <span className="font-mono text-[10px] text-white/50">
                            Sum: {msgWeightA + msgWeightB + msgWeightC} / {spamThresholdVal}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FHE-Pass: Challenge-Response Authentication */}
                  <div className="rounded-lg bg-white/5 p-4 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-bold">
                        FHE-Pass: Passwordless Auth Gate
                      </h3>
                      <span className="text-[10px] text-white/40 border border-white/10 px-2 py-0.5 rounded font-mono">
                        Vault: {secretRegistered ? "Secret Registered" : "Empty"}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      Login securely without exposing your master secret key using dynamic challenge-response proofs (R = Secret + Challenge) computed under FHE.
                    </p>

                    {!secretRegistered ? (
                      <div className="space-y-3">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Master secret key</label>
                            <input
                              type="number"
                              value={authSecretVal}
                              onChange={(e) => setAuthSecretVal(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <button
                            onClick={handleRegisterSecret}
                            className="rounded bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-1.5 text-xs font-bold text-black hover:opacity-90 transition h-[32px]"
                          >
                            Register Key
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <button
                            onClick={handleGenerateChallenge}
                            className="rounded border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 px-3 py-1.5 text-[10px] font-bold transition"
                          >
                            Generate Challenge Code
                          </button>
                          {authChallengeVal !== null && (
                            <span className="text-xs font-mono text-cyan-400">
                              Active Challenge: {authChallengeVal}
                            </span>
                          )}
                        </div>

                        {authChallengeVal !== null && (
                          <div className="space-y-3 pt-2">
                            <div>
                              <label className="block text-[9px] text-white/40 uppercase mb-0.5">Your Response (Secret + Challenge)</label>
                              <input
                                type="number"
                                value={authResponseVal}
                                onChange={(e) => setAuthResponseVal(Number(e.target.value))}
                                className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                              />
                            </div>
                            <button
                              onClick={handleVerifyChallenge}
                              disabled={isVerifyingAuth}
                              className="w-full rounded bg-cyan-500 py-2 text-xs font-bold text-black hover:opacity-90 transition"
                            >
                              {isVerifyingAuth ? "Verifying response under FHE..." : "Authenticate Verification Proof"}
                            </button>

                            {authPassStatus !== null && (
                              <div className={`rounded p-3 text-xs font-bold flex justify-between items-center ${
                                authPassStatus 
                                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                                  : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                              }`}>
                                <span>{authPassStatus ? "🔓 PASS-MFA AUTHENTICATED" : "🔒 ACCESS DENIED"}</span>
                                <span className="font-mono text-[10px] text-white/50">
                                  Expected: {authSecretVal + authChallengeVal}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* FHE-Passport: Private Biometric Uniqueness Check */}
                  <div className="rounded-lg bg-white/5 p-4 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-bold">
                        FHE-Passport: Biometric Uniqueness Check
                      </h3>
                      <span className="text-[10px] text-white/40 border border-white/10 px-2 py-0.5 rounded font-mono">
                        Count: {passportRegisteredCount}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      Register a Sybil-resistant identity privately. The contract loops through the database of templates under FHE to verify that your biometric template is unique before granting a passport.
                    </p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] text-white/40 uppercase mb-0.5">X Axis</label>
                          <input
                            type="number"
                            value={passportX}
                            onChange={(e) => setPassportX(Number(e.target.value))}
                            className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-white/40 uppercase mb-0.5">Y Axis</label>
                          <input
                            type="number"
                            value={passportY}
                            onChange={(e) => setPassportY(Number(e.target.value))}
                            className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-white/40 uppercase mb-0.5">Z Axis</label>
                          <input
                            type="number"
                            value={passportZ}
                            onChange={(e) => setPassportZ(Number(e.target.value))}
                            className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleRequestPassport}
                        disabled={isCheckingPassport}
                        className="w-full rounded bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 py-2 text-xs font-bold text-black hover:opacity-90 transition font-bold"
                      >
                        {isCheckingPassport ? "Checking templates under FHE..." : "Register Biometric Passport"}
                      </button>

                      {passportUniqueStatus !== null && (
                        <div className={`rounded p-3 text-xs font-bold flex justify-between items-center ${
                          passportUniqueStatus 
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                        }`}>
                          <span>{passportUniqueStatus ? "✅ PASSPORT REGISTERED (UNIQUE)" : "🚨 REGISTRATION REJECTED (DUPLICATE)"}</span>
                          <span className="font-mono text-[10px] text-white/50">
                            {passportUniqueStatus ? "Sybil Check Passed" : "Sybil Attack Blocked"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FHE-Aegis: AI Agent Behavior Drift Gate */}
                  <div className="rounded-lg bg-white/5 p-4 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-bold">
                        FHE-Aegis: AI Agent Behavior Drift Detector
                      </h3>
                      <span className="text-[10px] text-white/40 border border-white/10 px-2 py-0.5 rounded font-mono">
                        Status: {hasBaseline ? "Baseline Set" : "Unmonitored"}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      Monitor AI agent operations to prevent hijacked models or prompt drift. Calculates squared Euclidean distance against baseline metrics under FHE. Drift exceeding 1000 results in deactivation and slashing.
                    </p>

                    {!hasBaseline ? (
                      <div className="space-y-3">
                        <span className="text-[10px] text-white/40 uppercase block font-semibold">Step 1: Set Agent Behavioral Baseline</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Base Tx Size</label>
                            <input
                              type="number"
                              value={baseTxSize}
                              onChange={(e) => setBaseTxSize(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Base Freq</label>
                            <input
                              type="number"
                              value={baseFreq}
                              onChange={(e) => setBaseFreq(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Base Confidence</label>
                            <input
                              type="number"
                              value={baseConfidence}
                              onChange={(e) => setBaseConfidence(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleRegisterBaseline}
                          className="w-full rounded bg-gradient-to-r from-cyan-400 to-indigo-500 py-2 text-xs font-bold text-black hover:opacity-90 transition"
                        >
                          Register Encrypted Behavior Baseline
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <span className="text-[10px] text-white/40 uppercase block font-semibold">Step 2: Submit Telemetry for Behavioral Drift Verification</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Current Tx Size</label>
                            <input
                              type="number"
                              value={currentTxSize}
                              onChange={(e) => setCurrentTxSize(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Current Freq</label>
                            <input
                              type="number"
                              value={currentFreq}
                              onChange={(e) => setCurrentFreq(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Current Confidence</label>
                            <input
                              type="number"
                              value={currentConfidence}
                              onChange={(e) => setCurrentConfidence(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleEvaluateBehavior}
                          disabled={isCheckingBehavior}
                          className="w-full rounded bg-cyan-500 py-2 text-xs font-bold text-black hover:opacity-90 transition"
                        >
                          {isCheckingBehavior ? "Evaluating behaviors under FHE..." : "Run Behavior Drift Audit"}
                        </button>

                        {isCompromised !== null && (
                          <div className={`rounded p-3 text-xs font-bold flex justify-between items-center ${
                            isCompromised 
                              ? "bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-pulse" 
                              : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          }`}>
                            <span>{isCompromised ? "🚨 ROGUE DRIFT DETECTED - SLASHED" : "✅ AGENT BEHAVIOR NORMAL"}</span>
                            <span className="font-mono text-[10px] text-white/50">
                              Drift: {Math.pow(currentTxSize - baseTxSize, 2) + Math.pow(currentFreq - baseFreq, 2) + Math.pow(currentConfidence - baseConfidence, 2)} / 1000
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* FHE-Stream: Confidential Salary & Yield Streaming */}
                  <div className="rounded-lg bg-white/5 p-4 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-bold">
                        FHE-Stream: Confidential Staking & Payroll
                      </h3>
                      <span className="text-[10px] text-white/40 border border-white/10 px-2 py-0.5 rounded font-mono">
                        Stream: {streamActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      Distribute yields and streaming salaries confidentially. Flow rates (tokens per block) remain encrypted. Claim accrued balances privately using dynamic KMS decryptions.
                    </p>

                    {!streamActive ? (
                      <div className="space-y-3">
                        <span className="text-[10px] text-white/40 uppercase block font-semibold">Step 1: Initialize Confidential Salary Flow Rate</span>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-[9px] text-white/40 uppercase mb-0.5">Flow Rate (tokens/block)</label>
                            <input
                              type="number"
                              value={streamFlowRate}
                              onChange={(e) => setStreamFlowRate(Number(e.target.value))}
                              className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <button
                            onClick={handleCreateStream}
                            disabled={isCreatingStream}
                            className="rounded bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-1.5 text-xs font-bold text-black hover:opacity-90 transition h-[32px]"
                          >
                            {isCreatingStream ? "Creating..." : "Start Stream"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <span className="text-[10px] text-white/40 uppercase block font-semibold">Step 2: Accumulate Blocks & Claim Streaming Yields</span>
                        
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/5">
                          <div>
                            <span className="text-[10px] text-white/40 block">Accrued Mined Blocks</span>
                            <span className="text-sm font-mono text-cyan-400 font-bold">{streamBlocksAccrued} blocks</span>
                          </div>
                          <button
                            onClick={() => {
                              setStreamBlocksAccrued(prev => prev + 1);
                              addLog(`Simulated Block Mined! Accrued blocks increased.`);
                            }}
                            className="rounded border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 px-3 py-1 text-[10px] font-bold transition"
                          >
                            ➕ Mine block
                          </button>
                        </div>

                        <button
                          onClick={handleClaimStream}
                          disabled={isClaimingStream}
                          className="w-full rounded bg-cyan-500 py-2 text-xs font-bold text-black hover:opacity-90 transition"
                        >
                          {isClaimingStream ? "Decrypting stream yield under FHE..." : "Claim Stream Earnings"}
                        </button>

                        {claimedAmount !== null && (
                          <div className="rounded p-3 text-xs font-bold flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <span>📩 Payout Cleared! Received:</span>
                            <span className="font-mono text-[10px] text-white">
                              {claimedAmount} native tokens
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Oracle Action Card */}
          {role === "oracle" && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">Redundant Sensor Telemetry</h2>
              </div>

              {!agentRegistered ? (
                <p className="text-sm text-white/40 text-center py-6">
                  Please register an agent first.
                </p>
              ) : !agentActive ? (
                <p className="text-sm text-rose-400 text-center py-6 italic font-bold">
                  Agent has been deactivated due to auto-liquidation. Telemetry submission is blocked.
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="rounded-lg bg-white/5 p-3 border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase mb-2">Sensor A Readings</div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-white/60 mb-1">Completion (0-10)</label>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={inputCompletionA}
                            onChange={(e) => setInputCompletionA(Number(e.target.value))}
                            className="w-full accent-cyan-500"
                          />
                          <span className="text-xs text-cyan-400">{inputCompletionA}/10</span>
                        </div>
                        <div>
                          <label className="block text-[10px] text-white/60 mb-1">Uptime (0-10)</label>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={inputUptimeA}
                            onChange={(e) => setInputUptimeA(Number(e.target.value))}
                            className="w-full accent-cyan-500"
                          />
                          <span className="text-xs text-cyan-400">{inputUptimeA}/10</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-white/5 p-3 border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase mb-2">Sensor B Readings</div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-white/60 mb-1">Completion (0-10)</label>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={inputCompletionB}
                            onChange={(e) => setInputCompletionB(Number(e.target.value))}
                            className="w-full accent-cyan-500"
                          />
                          <span className="text-xs text-cyan-400">{inputCompletionB}/10</span>
                        </div>
                        <div>
                          <label className="block text-[10px] text-white/60 mb-1">Uptime (0-10)</label>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={inputUptimeB}
                            onChange={(e) => setInputUptimeB(Number(e.target.value))}
                            className="w-full accent-cyan-500"
                          />
                          <span className="text-xs text-cyan-400">{inputUptimeB}/10</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Latency (0-10)</label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={inputLatency}
                        onChange={(e) => setInputLatency(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                      <span className="text-xs text-cyan-400">{inputLatency}/10</span>
                    </div>

                    <div>
                      <label className="block text-xs text-white/60 mb-1">Error Rate (0-10)</label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={inputError}
                        onChange={(e) => setInputError(Number(e.target.value))}
                        className="w-full accent-rose-500"
                      />
                      <span className="text-xs text-rose-400">{inputError}/10</span>
                    </div>
                  </div>

                  <button
                    onClick={handleOracleSubmit}
                    className="w-full rounded bg-cyan-500 py-2.5 text-sm font-bold text-black hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    Encrypt & Submit Telemetry
                  </button>

                  <div className="border-t border-white/5 pt-4">
                    <h3 className="mb-2 text-xs font-semibold text-white/50">Emergency Slashing</h3>
                    <button
                      onClick={handleRequestSlash}
                      disabled={isSlashing}
                      className="rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition px-4 py-2 text-xs font-bold"
                    >
                      {isSlashing ? "Checking..." : "Trigger Slash Check (SLA Breach)"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Underwriter Action Card */}
          {role === "underwriter" && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                  <Shield className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">Confidential Risk Underwriting</h2>
              </div>

              {!agentRegistered ? (
                <p className="text-sm text-white/40 text-center py-6">
                  Please register an agent first.
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-white/60">
                    As an authorized underwriter, you have read-access to the agent's derived risk parameters.
                  </p>
                  
                  <div className="grid gap-4 grid-cols-2">
                    <div className="rounded bg-white/5 p-4 border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase mb-1">Encrypted Trust Score</div>
                      <div className="text-xs font-mono text-cyan-400 truncate">{encryptedScore}</div>
                      {decryptedScore !== null ? (
                        <div className="mt-2 text-lg font-bold text-white">{decryptedScore} / 1000</div>
                      ) : (
                        <div className="mt-2 text-xs text-white/30 italic">Decrypt to view</div>
                      )}
                    </div>

                    <div className="rounded bg-white/5 p-4 border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase mb-1">Required Bond</div>
                      <div className="text-xs font-mono text-cyan-400 truncate">{encryptedRequiredBond}</div>
                      {decryptedRequiredBond !== null ? (
                        <div className="mt-2 text-lg font-bold text-white">{decryptedRequiredBond} ETH</div>
                      ) : (
                        <div className="mt-2 text-xs text-white/30 italic">Decrypt to view</div>
                      )}
                    </div>

                    <div className="rounded bg-white/5 p-4 border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase mb-1">Encrypted Delegated Bond</div>
                      <div className="text-xs font-mono text-cyan-400 truncate">{encryptedDelegatedBond}</div>
                      <div className="mt-2 text-xs text-white/50">{delegatedBond > 0 ? `${delegatedBond} ETH` : "0 ETH"}</div>
                    </div>

                    <div className="rounded bg-white/5 p-4 border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase mb-1">Encrypted Accrued Interest</div>
                      <div className="text-xs font-mono text-cyan-400 truncate">{encryptedInterestAccumulated}</div>
                      <div className="mt-2 text-xs text-white/50">{interestAccumulated > 0 ? `${interestAccumulated} ETH` : "0 ETH"}</div>
                    </div>

                    <div className="rounded bg-white/5 p-4 border border-white/5 col-span-2">
                      <div className="text-[10px] text-white/40 uppercase mb-1">FHE Yield Curve Calibration (APR)</div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-cyan-400">
                        <Percent className="h-4 w-4 text-emerald-500" />
                        <span>High Trust: 1% APR | Med Trust: 5% APR | Low Trust: 25% APR (Confidential)</span>
                      </div>
                    </div>
                  </div>

                  {/* FHE-ML Perceptron Control & Real-time Evaluation */}
                  <div className="border-t border-white/5 pt-4 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Confidential FHE-ML Neural Perceptron
                    </h3>
                    <p className="text-xs text-white/50">
                      Configure the underwriter neuron weights and model bias. Telemetry inputs pass through this single-layer neural node under FHE.
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-white/40 uppercase mb-1">W_Comp</label>
                        <input
                          type="number"
                          value={wComp}
                          onChange={(e) => setWComp(Number(e.target.value))}
                          className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/40 uppercase mb-1">W_Uptime</label>
                        <input
                          type="number"
                          value={wUpt}
                          onChange={(e) => setWUpt(Number(e.target.value))}
                          className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/40 uppercase mb-1">W_Latency</label>
                        <input
                          type="number"
                          value={wLat}
                          onChange={(e) => setWLat(Number(e.target.value))}
                          className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/40 uppercase mb-1">W_Error</label>
                        <input
                          type="number"
                          value={wErr}
                          onChange={(e) => setWErr(Number(e.target.value))}
                          className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/40 uppercase mb-1">Bias</label>
                        <input
                          type="number"
                          value={bias}
                          onChange={(e) => setBias(Number(e.target.value))}
                          className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/40 uppercase mb-1">Limit</label>
                        <input
                          type="number"
                          value={riskThreshold}
                          onChange={(e) => setRiskThreshold(Number(e.target.value))}
                          className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        addLog(`Tx: updateNeuronWeights(wComp=${wComp}, wUpt=${wUpt}, wLat=${wLat}, wErr=${wErr}, bias=${bias}, threshold=${riskThreshold}) sent.`);
                        addLog("FHE-ML Perceptron weights successfully calibrated on-chain.");
                      }}
                      className="w-full rounded bg-emerald-500 py-1.5 text-xs font-bold text-black hover:opacity-90 transition"
                    >
                      Calibrate Perceptron
                    </button>

                    <div className="rounded bg-black/30 p-3 border border-white/5 grid grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <span className="text-[10px] text-white/40 uppercase block mb-1">Encrypted Neural Risk</span>
                        <span className="text-xs font-mono text-cyan-400 truncate block">{encryptedNeuralRisk}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 uppercase block mb-1">Decrypted ReLU Risk</span>
                        <span className="text-sm font-bold text-white block">
                          {decryptedNeuralRisk !== null ? `${decryptedNeuralRisk} / ${riskThreshold}` : "Decrypt to view"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => addLog("Underwriter decrypted trust scoring details client-side via Zama Relayer.")}
                    className="w-full border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 py-2 text-xs font-bold rounded transition"
                  >
                    Fetch & Decrypt Risk Params
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Interactive FHE Terminal */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-6 font-mono text-xs">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span className="font-bold text-white/80">Bayesian Telemetry Logs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-white/40 uppercase">LIVE</span>
              </div>
            </div>
            
            <div className="h-40 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
              {logs.map((log, index) => (
                <div key={index} className="text-white/70">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: State & Badges */}
        <div className="space-y-6 lg:col-span-5">
          {/* Agent Reputation Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-bold text-white">Underwriting Status</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/50">Agent Status</span>
                {agentRegistered ? (
                  agentActive ? (
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      Active / Underwritten
                    </span>
                  ) : (
                    <span className="rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20">
                      Liquidated / Inactive
                    </span>
                  )
                ) : (
                  <span className="rounded bg-white/5 px-2 py-0.5 text-xs font-medium text-white/30">
                    Unregistered
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/50">Uncertainty Variance (σ²)</span>
                  <span className="text-[10px] text-white/30 uppercase">(Public)</span>
                </div>
                <span className="text-sm font-bold text-cyan-400">{trustScoreVar}</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/50">Self-Posted Collateral</span>
                <span className="text-sm font-bold text-white">{postedCollateral} ETH</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/50">Borrowed (Delegated) Bond</span>
                <span className="text-sm font-bold text-indigo-400">{delegatedBond} ETH</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/50">Encrypted Trust Score Mean</span>
                <span className="text-xs font-mono text-cyan-400/80">{encryptedScore}</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/50">Encrypted Required Bond</span>
                <span className="text-xs font-mono text-cyan-400/80">{encryptedRequiredBond}</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/50">Collateral Sufficiency</span>
                {decryptedSufficiency !== null ? (
                  decryptedSufficiency ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-4 w-4" /> Sufficient
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                      <AlertTriangle className="h-4 w-4" /> Insufficient
                    </span>
                  )
                ) : (
                  <span className="text-xs font-mono text-cyan-400/80">{encryptedSufficiency}</span>
                )}
              </div>
            </div>
          </div>

          {/* Soulbound Reputation Badge */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur flex flex-col items-center text-center">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
              Reputation Badge
            </h3>
            
            {agentRegistered && agentActive && decryptedScore !== null ? (
              <div className="w-full max-w-[200px] aspect-square rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-white/20 p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden group">
                {/* Glow ring */}
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="flex justify-between items-start">
                  <Shield className="h-8 w-8 text-cyan-400" />
                  <span className="text-[10px] font-mono text-white/40">CTRUST #000</span>
                </div>
                
                <div className="text-left mt-4">
                  <div className="text-xs text-white/50">Trust Tier</div>
                  <div className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                    {decryptedScore >= 750 ? "HIGH TRUST" : decryptedScore >= 400 ? "MEDIUM TRUST" : "LOW TRUST"}
                  </div>
                </div>

                <div className="text-left mt-2 border-t border-white/10 pt-2 flex justify-between items-center text-[10px] text-white/40">
                  <span>Soulbound NFT</span>
                  <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[200px] aspect-square rounded-2xl border border-white/5 bg-white/2 p-6 flex flex-col items-center justify-center text-white/20">
                <Lock className="h-10 w-10 mb-2" />
                <span className="text-xs">Badge Locked</span>
              </div>
            )}
            
            <p className="mt-4 text-xs text-white/40">
              Minted automatically on ReputationBadge.sol after a public tier reveal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
