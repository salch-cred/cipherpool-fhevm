# CipherTrust — Confidential Underwriting Protocol for Autonomous Agents & Robots

**Built for the Zama Developer Program — Mainnet Season 3 ("Composable Privacy Is the Key"), Builder Track.**

> Submission deadline: July 07, 2026, 23:59 AOE

## The problem

Autonomous AI trading bots, delivery robots, drone fleets, and DePIN devices increasingly hold funds and execute tasks with no human in the loop. As this "machine economy" grows, someone has to answer: *how much should this autonomous agent be trusted with, and how much collateral should it be required to post before it is?*

Every reviewed Zama Developer Program winner scores or hides **human-directed financial positions or payments** — dark pools, derivatives, payroll/UBI, legal contracts, agent payments. None price collateral for the **operational reliability of autonomous agents and robots**. See [docs/COMPETITIVE_ANALYSIS.md](docs/COMPETITIVE_ANALYSIS.md) for the full research log comparing CipherTrust against Pendex, Confidential Derivatives, MARC Protocol, CipherMint, BlindPay, and Zama's own x402fhe reference app.

## The idea

CipherTrust computes a rolling **trust score** for autonomous agents/robots and a matching **required collateral bond**, entirely under Fully Homomorphic Encryption (FHE) using Zama's fhEVM.

### Core features

- **Encrypted trust scoring** — completion rate, uptime, latency, and error rate are submitted as ciphertexts and blended into a rolling score entirely under FHE.
- **Multi-oracle quorum** — telemetry only affects the score once N independent oracles agree within a round, reducing single-oracle trust assumptions.
- **Confidential bond tiers** — an `FHE.select` decision-tree derives the required collateral bond from the encrypted score; the thresholds an agent crossed are never public.
- **Async confidential slashing** — SLA breaches are checked as an encrypted flag, revealed only through Zama's public-decrypt + signature-verification flow, before any penalty is applied.
- **Selective tier disclosure** — operators can opt in to reveal only a coarse trust tier (Low / Medium / High) via `requestTierReveal`, while the exact score stays encrypted forever.
- **Soulbound reputation badges** — a non-transferable ERC-721 (`ReputationBadge.sol`) lets any protocol check an agent's public tier with one view call, with zero exposure of raw telemetry.
- **Composable insurance pool** — `InsurancePool.sol` lets liquidity providers earn a share of every slashing penalty, a transparent DeFi primitive composed on top of the confidential core.
- **Portable agent identity** — `AgentIdentityRegistry.sol`, an ERC-8004-inspired registry, gives every agent a shared, app-agnostic identity other confidential protocols can build on.

See `docs/RESEARCH.md` for the original novelty-validation process, `docs/COMPETITIVE_ANALYSIS.md` for the winning-project comparison, and `docs/ARCHITECTURE.md` for the full technical design.

## Status

Active work-in-progress. The Solidity contracts and frontend below have **not yet been compiled, tested against a live `@fhevm/solidity` install, or deployed** — see `docs/SUBMISSION.md` for the outstanding checklist before final Season 3 submission. Treat this repository as a detailed, coherent scaffold, not a verified production build.

## Repository structure

```
contracts/
  CipherTrust.sol            core FHE risk engine (score, bond tiers, quorum, slashing, tier reveal)
  AgentIdentityRegistry.sol  ERC-8004-inspired portable identity for agents/robots
  ReputationBadge.sol        soulbound ERC-721 badge for publicly revealed trust tiers
  InsurancePool.sol          LP vault funded by confidential slashing penalties
test/                        Hardhat test scaffold (FHE-mock tests still needed, see roadmap)
scripts/deploy.ts            Sepolia deploy script
frontend/                    Next.js + Tailwind marketing site
docs/                        RESEARCH.md, COMPETITIVE_ANALYSIS.md, ARCHITECTURE.md, SUBMISSION.md
```

## Stack

- Solidity + `@fhevm/solidity` (FHE / euint64 / ebool / externalEuint64) + OpenZeppelin Contracts, on Zama's fhEVM (Sepolia)
- Hardhat + TypeScript, scaffolded from `zama-ai/fhevm-hardhat-template` conventions
- Frontend: Next.js 14 (App Router) + Tailwind CSS marketing/landing page in `frontend/`; the interactive dApp dashboard (wagmi + Zama Relayer SDK encrypt/decrypt flow) is still on the roadmap.

## Setup

### Contracts

```bash
npm install
cp .env.example .env   # fill in PRIVATE_KEY and an RPC URL
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network sepolia
```

### Frontend (landing page)

```bash
cd frontend
npm install
npm run dev
```

> Before deploying, verify contract syntax against the exact current version of `@fhevm/solidity` / `@fhevm/hardhat-plugin` in `package.json` — the FHE Solidity API evolves between releases, and the async public-decrypt flow (`FHE.makePubliclyDecryptable` / `FHE.checkSignatures`) in particular has not yet been compiled or tested.

## License

MIT
