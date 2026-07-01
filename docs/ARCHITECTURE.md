# CipherTrust architecture

## Actors

- **Admin** — registers agents, authorizes oracles and underwriters.
- **Agent operator** — the human/entity responsible for an autonomous agent or robot; deposits/withdraws collateral, grants underwriter access.
- **Oracle** — an authorized telemetry attestor (could be the task marketplace itself, a hardware-attestation service, or the operator's own monitoring stack) that submits encrypted performance metrics per completed task.
- **Underwriter** — an insurer, lender, or task marketplace granted ACL read-access to an agent's encrypted score/bond outputs to price risk, without ever seeing raw telemetry.

## Data flow

1. `registerAgent(operator)` — admin onboards an agent, initializes an encrypted neutral trust score (500/1000) and a medium-tier encrypted required bond.
2. `submitTelemetry(agentId, completionScore, uptimeScore, latencyScore, errorScore, inputProof)` — oracle submits four encrypted metrics (as `externalEuint64` + a relayer-generated `inputProof`). The contract:
   - Decrypts nothing; computes a weighted sum under FHE (`FHE.add`, `FHE.mul`).
   - Blends it into a rolling score via encrypted exponential smoothing.
   - Re-derives the required bond via an FHE decision-tree (`FHE.select` cascades over two thresholds — 750 and 400 out of 1000).
   - Re-checks bond sufficiency (`FHE.ge`) against the operator's currently posted public collateral.
3. `depositBond` / `withdrawBond` — operator manages public collateral; sufficiency flag is recomputed confidentially on every change.
4. `grantUnderwriterAccess(agentId, underwriter)` — operator opts an authorized underwriter into ACL read-access on that agent's encrypted trust score, required bond, and sufficiency flag.
5. Off-chain: operators and underwriters use the **Zama Relayer SDK** (`userDecrypt`) from a frontend to view plaintext values they've been granted ACL access to — the contract itself never performs on-chain decryption of these values, keeping the design simple and avoiding an on-chain decryption-oracle round trip in v1.

## Why this is technically feasible on fhEVM today

Everything above uses only operations natively supported by current fhEVM Solidity: `add`, `sub`, `mul`, `div` (by a plaintext divisor), comparisons (`ge`, `lt`), and `select` (the FHE multiplexer / cmux). No off-chain ML and no on-chain neural network is required — the "scoring model" is a transparent, auditable weighted-sum-plus-decision-tree, which is a legitimate (if simple) ML technique, deliberately chosen to stay within what FHE can compute efficiently on-chain today.

## Composability with Season 3's "Composable Privacy" theme

Because the trust score, required bond, and sufficiency flag are all encrypted contract state with a documented ACL surface, other confidential contracts (a lending pool, an insurance pool, a task-marketplace escrow) can be granted read access and build on top of CipherTrust's output without needing to re-derive it or trust a centralized oracle for the *interpretation* of an agent's history — only for the raw telemetry inputs, which are already minimized and can themselves be diversified across multiple independent oracle sources in a future iteration.

## Roadmap / known gaps (MVP → submission-ready)

- [ ] Wire up `@fhevm/hardhat-plugin` mock testing utilities for real encrypted-input test coverage (current test file only covers public-state behavior).
- [ ] Add multi-oracle aggregation (median/quorum of several oracles' encrypted submissions) to reduce single-oracle trust assumptions.
- [ ] Add slashing flow for confirmed SLA breaches (encrypted breach flag → encrypted bond reduction → selective decryption for dispute resolution).
- [ ] Frontend: Next.js + wagmi + Zama Relayer SDK for encrypting telemetry submissions and decrypting ACL-granted values client-side.
- [ ] Deploy to Sepolia, verify contract, wire up a demo task marketplace or lending pool that consumes CipherTrust's encrypted outputs to demonstrate composability end-to-end.
