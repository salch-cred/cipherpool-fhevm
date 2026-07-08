# CipherTrust — Confidential Underwriting Protocol for Autonomous Agents & Robots

**Built for the Zama Developer Program — Season 3 ("Composable Privacy Is the Key"), Builder Track.**

---

## 🚀 Overview

CipherTrust is the world's first **Confidential Risk Underwriting and Parameter Pricing Engine** designed specifically for the autonomous machine economy (robots, drone fleets, DePIN nodes, and AI trading bots). 

By leveraging **Fully Homomorphic Encryption (FHE)** via Zama's `fhEVM`, CipherTrust monitors encrypted telemetry and evaluates risk profiles entirely under encryption. The protocol allows third-party smart contracts (e.g. marketplaces, lending platforms, or DAOs) to verify that an autonomous agent is sufficiently bonded and reputable without ever exposing raw server logs, coordinates, or proprietary trade secrets.

---

## 🔬 Scientific FHE Innovations

### 1. Encrypted Bayesian Filter (EBF)
To prevent competitive data leakage, CipherTrust tracks the drone/agent's reputation using a fixed-point Bayesian state estimator. The core trust score mean ($\mu_t$) is kept encrypted as a Zama `euint64` handle, while the estimation uncertainty variance ($\sigma^2_t$) is tracked publicly:
$$\sigma^2_{t+1} = \frac{\sigma^2_t \cdot \sigma^2_{obs}}{\sigma^2_t + \sigma^2_{obs}}$$
$$\alpha = \frac{\sigma^2_{obs}}{\sigma^2_t + \sigma^2_{obs}}, \quad \beta = \frac{\sigma^2_t}{\sigma^2_t + \sigma^2_{obs}}$$
$$\mu_{t+1} = \alpha \cdot \mu_t + \beta \cdot x_{obs}$$
As the confidence increases (variance decays), the **Uncertainty Premium** dynamically reduces, lowering the agent's required collateral bond.

### 2. Encrypted Sensor Outlier Filter (FST)
To protect the system against sensor spoofing attacks or malicious oracle collusion, the protocol ingests redundant sensor readings ($X_A, X_B$) and calculates their absolute difference entirely under FHE:
$$\text{compDiff} = |X_A - X_B| = \text{FHE.select}(X_A < X_B, X_B - X_A, X_A - X_B)$$
If $\text{compDiff} > 2$ (exceeding maximum allowable drift), the filter discards the reading as anomalous, sets the round score to 0, and triggers an SLA hardware penalty.

### 3. Confidential Parametric Claims & Auto-Liquidation
If an agent's trust score falls below its custom encrypted threshold:
$$\text{isBreached} = \mu_t < \text{liquidationThreshold}$$
CipherTrust initiates a single-step async decryption check with Zama's KMS. Rather than using nested decryption callbacks, the contract evaluates the breach flag and calculates the client's pro-rata claim payout simultaneously:
$$\text{severity} = 1000 - \mu_t$$
$$\text{payoutAmount} = \frac{\text{coverageLimit} \cdot \text{severity}}{1000}$$
Upon KMS fulfillment, the callback deactivates the agent, pays out the `payoutAmount` directly to the client, and routes the remainder to the `InsurancePool` LPs to recover underwritten capital.

### 4. Reputation-Based Credit Delegation & Yield curves
Operators can borrow bond capital from the `InsurancePool` (Credit Delegation). The pool dynamically prices the loan's interest rate (APR) in basis points based on the agent's public reputation tier:
- **High Trust (Tier 3):** 1% APR
- **Medium Trust (Tier 2):** 5% APR
- **Low Trust (Tier 1):** 25% APR

---

## 🛠️ Repository Structure

*   [contracts/CipherTrust.sol](file:///C:/Users/salma/.gemini/antigravity/scratch/cipherpool-fhevm/contracts/CipherTrust.sol): Core FHE risk pricing engine, Bayesian scoring math, sensor drift filter, and interest/delegation interfaces.
*   [contracts/InsurancePool.sol](file:///C:/Users/salma/.gemini/antigravity/scratch/cipherpool-fhevm/contracts/InsurancePool.sol): Capital delegation and yield distribution vault for LPs.
*   [contracts/ReputationBadge.sol](file:///C:/Users/salma/.gemini/antigravity/scratch/cipherpool-fhevm/contracts/ReputationBadge.sol): Soulbound ERC-721 badge showing revealed trust tiers.
*   [contracts/AgentIdentityRegistry.sol](file:///C:/Users/salma/.gemini/antigravity/scratch/cipherpool-fhevm/contracts/AgentIdentityRegistry.sol): ERC-8004 portable robotic identity registry.
*   [test/CipherTrust.test.ts](file:///C:/Users/salma/.gemini/antigravity/scratch/cipherpool-fhevm/test/CipherTrust.test.ts): Unit test suite running 11 complex FHE operations (100% pass).
*   [test/SimulateAgent.test.ts](file:///C:/Users/salma/.gemini/antigravity/scratch/cipherpool-fhevm/test/SimulateAgent.test.ts): Live end-to-end flight, attack, and auto-liquidation simulator with parametric payouts.
*   [frontend/app/dashboard/page.tsx](file:///C:/Users/salma/.gemini/antigravity/scratch/cipherpool-fhevm/frontend/app/dashboard/page.tsx): Interactive dashboard visualizing all FHE states, sensor drifts, and live credit delegation logs.

---

## 💻 Quickstart

### 1. Hardhat Setup & Verification
Install dependencies:
```bash
npm install
```

Compile contracts (configured with `evmVersion: "cancun"` and `viaIR: true` to support `@fhevm/solidity` version `0.8.0` compilation optimization):
```bash
npx hardhat compile
```

Run unit tests and FHE mock test cases:
```bash
npx hardhat test
```

### 2. Live Flight & Attack Simulator Demo
Run the end-to-end flight, sensor spoofing attack, and auto-liquidation simulator:
```bash
npx hardhat test test/SimulateAgent.test.ts
```

### 3. Frontend App
Run the interactive Next.js dashboard locally:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:3000/dashboard` to view the control center.

---

## 📄 License
MIT
