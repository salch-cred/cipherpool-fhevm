# CipherTrust — Confidential Underwriting Protocol for Autonomous Agents & Robots

**Built for the Zama Developer Program — Mainnet Season 3 ("Composable Privacy Is the Key"), Builder Track.**

> Submission deadline: July 07, 2026, 23:59 AOE

## The problem

Autonomous AI trading bots, delivery robots, drone fleets, and DePIN devices increasingly hold funds and execute tasks with no human in the loop. As this "machine economy" grows, someone has to answer: *how much should this autonomous agent be trusted with, and how much collateral should it be required to post before it is?*

Every existing on-chain reputation or credit-scoring system (including Zama-ecosystem confidential lending/credit-scoring projects) scores **humans and wallets**. None of them score **non-human autonomous actors** — and any naive on-chain scoring system for a robot or bot fleet would leak commercially sensitive telemetry (uptime, error rates, routes, strategy performance) straight to competitors, because blockchains are public by default.

## The idea

CipherTrust computes a rolling **trust score** for autonomous agents/robots and a matching **required collateral bond**, entirely under Fully Homomorphic Encryption (FHE) using Zama's fhEVM:

1. Authorized oracles (operator-run attestors, task marketplaces, hardware-attested telemetry feeds) submit **fully encrypted** performance metrics per completed task: completion rate, uptime, latency, error rate.
2. The contract computes an encrypted weighted trust score directly on ciphertexts (`FHE.add`, `FHE.mul`, `FHE.select`) — a lightweight, on-chain-feasible "confidential scoring model."
3. The contract derives a confidential bond tier from the encrypted score using an FHE decision-tree (`FHE.select` cascades), so the thresholds an agent crossed are never revealed on-chain.
4. Operators post public collateral; the contract computes an **encrypted sufficiency flag** (posted >= required) without ever revealing the exact required bond publicly.
5. Authorized underwriters/insurers/task-marketplaces can be granted ACL read access (`FHE.allow`) to an agent's encrypted score/bond/sufficiency — enabling confidential underwriting and composability with other confidential DeFi primitives — without ever seeing the raw telemetry.

This is a **confidential risk/underwriting primitive for the agentic and robotic economy** — distinct from human-focused confidential credit scoring, and distinct from agent *payment* rails (which move money but don't price risk).

See `docs/RESEARCH.md` for the novelty-validation process and `docs/ARCHITECTURE.md` for the full technical design.

## Status

This repository is an active work-in-progress MVP scaffold. See `docs/SUBMISSION.md` for the outstanding checklist before final Season 3 submission.

## Stack

- Solidity + `@fhevm/solidity` (FHE / euint64 / ebool / externalEuint64) on Zama's fhEVM (Sepolia)
- Hardhat + TypeScript, scaffolded from `zama-ai/fhevm-hardhat-template` conventions
- Frontend (planned): Next.js + wagmi + Zama Relayer SDK for client-side encryption/decryption

## Setup

```bash
npm install
cp .env.example .env   # fill in PRIVATE_KEY and an RPC URL
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network sepolia
```

> Before deploying, verify contract syntax against the exact current version of `@fhevm/solidity` / `@fhevm/hardhat-plugin` in `package.json` — the FHE Solidity API evolves between releases.

## License

MIT
