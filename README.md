# 🛡️ CipherTrust: Private Risk Underwriting for the Autonomous Machine Economy

CipherTrust is the first **decentralized, privacy-preserving risk underwriting, authentication, and collateral pricing protocol** designed for the machine economy (AI trading bots, drone fleets, DePIN nodes, and delivery robots). 

By leveraging **Fully Homomorphic Encryption (FHE)** via secure `fhEVM` pipelines, CipherTrust evaluates real-time operational telemetry, checks physical location coordinate signatures, and manages insurance pools entirely under encryption. The protocol allows third-party smart contracts (e.g. marketplaces, lending platforms, or DAOs) to verify that an autonomous agent is authenticated, unique, sufficiently bonded, and operating safely without ever exposing raw logs, coordinates, biometrics, or proprietary trade secrets.

---

## 🔬 The Problem & FHE Solution

### The Underwriting Dilemma for Autonomous Agents
As autonomous agents manage physical assets and financial capital, they must purchase insurance and post collateral bonds. However, pricing risk requires inspecting telemetry logs (uptime, location, errors, or biometrics). Exposing this telemetry publicly introduces critical vulnerabilities:
*   **Location Leakage:** Exposing coordinates of delivery drones compromises logistics security and operator privacy.
*   **Proprietary Leakage:** Exposing error and performance logs of AI trading bots leaks secret trading strategies to competitors.
*   **Sybil Vulnerability:** Without biometric uniqueness checks, malicious actors can clone robot IDs to sybil-attack collateral delegation pools.

### The CipherTrust Solution
CipherTrust solves this by performing all logic **directly on ciphertexts** under Zama's `fhEVM`:
1.  **Computation on Encrypted Data:** Bayesian trust scores and behavioral anomalies are evaluated using encrypted handles, keeping individual data points private.
2.  **Confidential Triangulation:** Location validation occurs by calculating distance squares to anchors under FHE, confirming boundaries without revealing the exact coordinate position.
3.  **Encrypted Slashing & Claims:** KMS decryption callbacks are used only to evaluate binary threshold conditions (e.g. `isBreached`) or decrypt payout claims, preventing plaintext leakage.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client / User Interface
        User[Operator Browser] -->|1. Register Agent Identity| Dashboard[Next.js Frontend / Vercel]
    end

    subgraph Decentralized Oracle Layer
        HF[Hugging Face Space: Telemetry Daemon] -->|2. Push Encrypted Coordinates & Telemetry| Core
    end

    subgraph On-Chain FHE Consensus (fhEVM)
        Core[CipherTrust.sol Core Engine] -->|3. Triangulate location & update Bayesian score| Core
        Core -->|4. Request Decryption| KMS[Zama KMS Decryption Nodes]
        KMS -->|5. Fulfill Decryption Callback| Core
        Core -->|6. Slash Rogue Bond| Pool[InsurancePool.sol ERC-4626]
        Core -->|7. Mint soulbound badge| SB[ReputationBadge.sol]
    end

    subgraph Database Audit Log
        Dashboard -->|Sync metrics| Supabase[(Supabase / PostgreSQL)]
        HF -->|Log telemetry rounds| Supabase
    end
```

---

## 🧠 Core FHE Capabilities & Mathematical Innovations

### 1. FHE-Triangulation (Confidential Location Verification)
Validates coordinates $(X, Y)$ under FHE against encrypted distance-squared values ($d_A^2, d_B^2, d_C^2$) submitted by three independent anchors:
$$\text{calcDistSq}_i = (X - X_i)^2 + (Y - Y_i)^2$$
$$\text{error}_i = |\text{calcDistSq}_i - d_i^2|$$
$$\text{totalError} = \text{error}_A + \text{error}_B + \text{error}_C \le 100$$
Allows DePIN and robot fleets to verify sector bounds on-chain without revealing coordinates.

### 2. FHE-Passport (Biometric Uniqueness & Sybil Rejection)
Prevents Sybil attacks by computing the Manhattan distance between a new biometric template $(X, Y, Z)$ and registered database templates $(D_X, D_Y, D_Z)$ entirely in ciphertext:
$$\text{dist} = |X - D_X| + |Y - D_Y| + |Z - D_Z|$$
If the distance to any registered template is $\le 10$, the registration fails on-chain.

### 3. FHE-Aegis (AI Behavioral Drift & Rogue Slashing)
Compares real-time telemetry $(O_T, O_F, O_C)$ against their baseline configuration $(B_T, B_F, B_C)$. Aegis calculates the squared Euclidean distance under FHE:
$$\text{drift} = (O_T - B_T)^2 + (O_F - B_F)^2 + (O_C - B_C)^2$$
If the drift exceeds the safety threshold, the agent is deactivated and slashed into the `InsurancePool`.

### 4. FHE-Stream (Confidential Staking & Payroll Streaming)
Streams rewards or yields dynamically using encrypted flow rates per block. The accrued stream yield is calculated under encryption:
$$\text{accrued} = \text{flowRate} \cdot \Delta B$$
Decrypted tokens are claimed and dispatched using secure KMS callbacks.

---

## 🛠️ Repository Structure

*   `contracts/CipherTrust.sol`: Core FHE risk pricing engine, Bayesian scoring, Aegis drift detectors, Triangulation, and FHE-Stream yield processors.
*   `contracts/InsurancePool.sol`: ERC-4626 capital vault funded by slashed rogue agent bonds.
*   `contracts/ReputationBadge.sol`: Soulbound ERC-721 badge showing revealed trust tiers.
*   `contracts/AgentIdentityRegistry.sol`: ERC-8004 portable identity and passport mapping.
*   `test/CipherTrust.test.ts`: Complete unit test suite (20 passing tests covering all FHE edge cases).
*   `scripts/oracle_service.ts`: Background daemon script executing coordinates triangulation updates.
*   `Dockerfile`: Deployment container configuration for Hugging Face Spaces.
*   `frontend/`: Premium Next.js application built with warm cream aesthetics and Framer Motion glassmorphism.

---

## 🚀 Multi-Cloud Deployment Guide

### 1. Frontend Hosting (Vercel)
Vercel is the native platform for Next.js web applications.
1. Add a `vercel.json` in the root of your project:
   ```json
   {
     "version": 2,
     "cleanUrls": true,
     "framework": "nextjs"
   }
   ```
2. Configure **Settings > General > Root Directory** to `frontend`.
3. Add the following project environment variables:
   * `NEXT_PUBLIC_CIPHERTRUST_ADDRESS`: Address of deployed `CipherTrust.sol`.
   * `NEXT_PUBLIC_INSURANCE_POOL_ADDRESS`: Address of deployed `InsurancePool.sol`.
   * `NEXT_PUBLIC_RPC_URL`: fhEVM network JSON-RPC endpoint.

### 2. Telemetry Daemon (Hugging Face Spaces)
To run the autonomous agent simulation or oracle telemetry feed continually, deploy the Docker container to a Hugging Face Space:
1. Create a new Space on Hugging Face and choose **Docker** as the SDK template.
2. Push the codebase including the root `Dockerfile` to the Hugging Face Space repository.
3. Configure the Space's **Variables & Secrets**:
   * `PRIVATE_KEY`: Private key of the oracle account (to sign transactions).
   * `RPC_URL`: JSON-RPC endpoint of the target network.
   * `CIPHERTRUST_ADDRESS`: Address of deployed `CipherTrust.sol`.

### 3. Database (Supabase / PostgreSQL)
Initialize the database tables in your Supabase SQL Editor to log agent states and telemetry:
```sql
CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    agent_id INT UNIQUE NOT NULL,
    operator_address VARCHAR(42) NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    trust_variance INT DEFAULT 100
);

CREATE TABLE telemetry_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id INT REFERENCES agents(agent_id),
    round_id INT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📄 License
MIT
