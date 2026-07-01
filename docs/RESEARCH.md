# Novelty research log

This document records the diligence performed before committing to the CipherTrust idea, so judges can verify the "nobody has built this" claim was actually checked rather than assumed.

## Ideas rejected after finding prior art

### 1. FHE-native dark pool DEX ("CipherPool")
Rejected after finding:
- `omurovec/fhe-darkpools` — ETHCC6 Fhenix & Zama hackathon project, Foundry-based, `src/DarkPool.sol`.
- `YASH-ai-bit/quantum-safe-pools` — has `contracts/`, `frontend/`, a pitch deck explicitly describing "Encrypted orderbook" / "Dark pool limit orders" using `euint64`/`TFHE.add`/`TFHE.mul`.
- Course material referencing "Fhenix-based prototypes — encrypted-orderbook DEX" as an already-known pattern.

### 2. Confidential on-chain credit scoring + undercollateralized lending
Rejected as a saturated space: multiple existing FHE-based confidential credit-scoring/lending repos and projects already exist in the Zama/Fhenix ecosystem, and Zama's own "Confidential Lending" call-for-builders post already frames the standard collateralized-lending pattern (wrap ERC-20 → confidential collateral → FHE-computed LTV → mint loan) as a known blueprint, not an open niche.

## Idea validated: CipherTrust — confidential underwriting for autonomous agents/robots

Searches run (via GitHub code/repo search and web search), all returning no matching prior art:

- GitHub repos: `fhevm agent bonding insurance robot autonomous` → 0 results
- GitHub repos: `fhevm ai model marketplace inference encrypted weights` → 0 results
- GitHub repos: `fhevm robotics drone swarm` → 0 results
- GitHub code search across the above terms → only tangential mentions (docs, aggregator lists, unrelated agent-*payment* repos); nothing that scores autonomous agents/robots for collateral/insurance purposes
- Web search confirmed existing "confidential AI agent" work is about payment rails (COTI, MARC Protocol) or human/wallet credit scoring — not agent/robot *underwriting*

## Zama Season 3 alignment

- Official rules confirmed via https://www.zama.org/post/zama-developer-program-mainnet-season-3-composable-privacy-is-the-key: Builder Track is open-scope, theme is "Composable Privacy," rewards in cUSDT, submissions close July 07, 2026 23:59 AOE.
- CipherTrust is explicitly designed as a *composable* primitive (other confidential DeFi/task-marketplace contracts can plug into its encrypted trust score / bond sufficiency outputs via ACL grants), matching the season's stated theme.

## Honesty note

No search process can prove a negative with 100% certainty across all of GitHub, all private repos, and every hackathon submission worldwide. This document records the actual diligence performed; if you discover prior art we missed, revisit this document and the idea before final submission.
