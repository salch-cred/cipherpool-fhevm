// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IReputationBadge {
    function mintOrUpgrade(uint256 agentId, address operator, uint8 tier) external;
}

interface IInsurancePool {
    function receivePenalty(uint256 agentId) external payable;
}

/**
 * @title CipherTrust
 * @notice Confidential underwriting protocol for autonomous agents & robots.
 *
 * Autonomous AI trading bots, delivery robots, drone fleets, and DePIN devices
 * increasingly hold funds and execute tasks without human supervision. There is
 * no confidential way today to score their reliability and price the
 * collateral/insurance they must post -- any naive on-chain reputation system
 * leaks competitively sensitive operational data (uptime, error rates, routes,
 * strategy performance) to rivals, because blockchains are public by default.
 *
 * CipherTrust computes a rolling trust score and a required collateral bond
 * entirely under Fully Homomorphic Encryption. Operators, insurers, and task
 * marketplaces can rely on the *outcome* (bond tier, sufficiency check)
 * without ever seeing the raw encrypted telemetry that produced it.
 *
 * v0.2 additions (see docs/COMPETITIVE_ANALYSIS.md for why these were added):
 *  - Multi-oracle quorum: telemetry only affects the score once N independent
 *    oracles agree within a round, reducing single-oracle trust assumptions.
 *  - Async confidential slashing: an oracle can request a confidential SLA
 *    breach check; the breach flag is decrypted via Zama's public-decrypt +
 *    signature-verification flow before any penalty is applied on-chain.
 *  - Optional composability hooks into a soulbound ReputationBadge (public,
 *    selectively-revealed trust tier) and an InsurancePool (LP yield funded
 *    by slashing penalties), so other protocols can build on CipherTrust's
 *    output without ever touching an agent's raw telemetry.
 *
 * NOTE: this is an MVP scaffold. Verify every FHE.* call (especially the
 * makePubliclyDecryptable / checkSignatures async-decrypt flow) against the
 * exact current version of @fhevm/solidity pinned in package.json before
 * deploying to a live network -- the FHE Solidity API surface evolves
 * between releases, and this flow has not yet been compiled/tested.
 */
contract CipherTrust is SepoliaConfig {
    address public admin;
    uint256 public nextAgentId;

    struct Agent {
        address operator;
        bool registered;
        bool active;
        uint256 identityId; // optional link into AgentIdentityRegistry, 0 if unset
        euint64 trustScore; // encrypted, 0-1000 scale
        euint64 requiredBond; // encrypted, wei
        uint256 postedBond; // public collateral currently deposited (wei)
        ebool bondSufficient; // encrypted boolean: postedBond >= requiredBond
        uint256 breachCount; // public count of confirmed SLA breaches
    }

    struct PendingRound {
        uint32 count;
        bool initialized;
        euint64 sumCompletion;
        euint64 sumUptime;
        euint64 sumLatency;
        euint64 sumError;
    }

    mapping(uint256 => Agent) private _agents;
    mapping(address => bool) public authorizedOracles;
    mapping(address => bool) public authorizedUnderwriters;

    mapping(uint256 => PendingRound) private _pendingRounds; // agentId => in-flight quorum round
    mapping(uint256 => uint256) public currentRoundId; // agentId => round id
    mapping(uint256 => mapping(address => uint256)) private _oracleLastRound; // agentId => oracle => last round id + 1 submitted
    uint32 public quorumThreshold = 1; // number of independent oracles required per round

    uint256 public nextTierRequestId = 1;
    mapping(uint256 => uint256) public tierRequestAgent;
    mapping(uint256 => bytes32) public tierRequestHandle;

    uint256 public nextSlashRequestId = 1;
    mapping(uint256 => uint256) public slashRequestAgent;
    mapping(uint256 => bytes32) public slashRequestHandle;

    IReputationBadge public reputationBadge;
    IInsurancePool public insurancePool;

    uint64 private constant W_COMPLETION = 40;
    uint64 private constant W_UPTIME = 30;
    uint64 private constant W_LATENCY = 15;
    uint64 private constant W_ERROR = 15;

    uint64 private constant HIGH_TRUST_THRESHOLD = 750;
    uint64 private constant MED_TRUST_THRESHOLD = 400;

    uint64 private constant HIGH_TRUST_BOND = uint64(0.1 ether);
    uint64 private constant MED_TRUST_BOND = uint64(1 ether);
    uint64 private constant LOW_TRUST_BOND = uint64(5 ether);

    uint256 private constant SLASH_BPS = 1000; // 10% of posted bond

    event AgentRegistered(uint256 indexed agentId, address indexed operator, uint256 identityId);
    event OracleAuthorized(address indexed oracle);
    event UnderwriterAuthorized(address indexed underwriter);
    event TelemetrySubmitted(uint256 indexed agentId, address indexed oracle, uint256 roundId);
    event ScoreUpdated(uint256 indexed agentId, uint256 roundId);
    event BondDeposited(uint256 indexed agentId, uint256 amount, uint256 totalPosted);
    event BondWithdrawn(uint256 indexed agentId, uint256 amount);
    event TierRevealRequested(uint256 indexed agentId, uint256 indexed requestId);
    event TierRevealed(uint256 indexed agentId, uint64 tierCode);
    event SlashCheckRequested(uint256 indexed agentId, uint256 indexed requestId);
    event SlashCheckFulfilled(uint256 indexed agentId, bool breached);
    event AgentSlashed(uint256 indexed agentId, uint256 penalty);
    event ReputationBadgeSet(address indexed badge);
    event InsurancePoolSet(address indexed pool);

    modifier onlyAdmin() {
        require(msg.sender == admin, "CipherTrust: not admin");
        _;
    }

    modifier onlyOracle() {
        require(authorizedOracles[msg.sender], "CipherTrust: not an authorized oracle");
        _;
    }

    modifier onlyAgentOperator(uint256 agentId) {
        require(_agents[agentId].operator == msg.sender, "CipherTrust: not agent operator");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setQuorumThreshold(uint32 threshold) external onlyAdmin {
        require(threshold >= 1, "CipherTrust: invalid threshold");
        quorumThreshold = threshold;
    }

    function setReputationBadge(address badge) external onlyAdmin {
        require(address(reputationBadge) == address(0), "CipherTrust: badge already set");
        reputationBadge = IReputationBadge(badge);
        emit ReputationBadgeSet(badge);
    }

    function setInsurancePool(address pool) external onlyAdmin {
        require(address(insurancePool) == address(0), "CipherTrust: pool already set");
        insurancePool = IInsurancePool(pool);
        emit InsurancePoolSet(pool);
    }

    function authorizeOracle(address oracle) external onlyAdmin {
        authorizedOracles[oracle] = true;
        emit OracleAuthorized(oracle);
    }

    function authorizeUnderwriter(address underwriter) external onlyAdmin {
        authorizedUnderwriters[underwriter] = true;
        emit UnderwriterAuthorized(underwriter);
    }

    /// @notice Register a new autonomous agent/robot under a given operator.
    /// @param identityId optional AgentIdentityRegistry id (0 if not using the registry).
    function registerAgent(address operator, uint256 identityId) external onlyAdmin returns (uint256 agentId) {
        agentId = nextAgentId++;
        Agent storage a = _agents[agentId];
        a.operator = operator;
        a.registered = true;
        a.active = true;
        a.identityId = identityId;
        a.trustScore = FHE.asEuint64(500); // neutral starting score
        a.requiredBond = FHE.asEuint64(MED_TRUST_BOND);

        FHE.allowThis(a.trustScore);
        FHE.allowThis(a.requiredBond);
        FHE.allow(a.trustScore, operator);
        FHE.allow(a.requiredBond, operator);

        emit AgentRegistered(agentId, operator, identityId);
    }

    /// @notice Submit fully-encrypted telemetry for a completed task. Only
    /// authorized oracles may call this. The submission only affects the
    /// agent's score once `quorumThreshold` independent oracles have
    /// submitted within the current round.
    function submitTelemetry(
        uint256 agentId,
        externalEuint64 completionScore,
        externalEuint64 uptimeScore,
        externalEuint64 latencyScore,
        externalEuint64 errorScore,
        bytes calldata inputProof
    ) external onlyOracle {
        Agent storage a = _agents[agentId];
        require(a.registered && a.active, "CipherTrust: unknown or inactive agent");

        uint256 roundId = currentRoundId[agentId];
        require(_oracleLastRound[agentId][msg.sender] != roundId + 1, "CipherTrust: already submitted this round");
        _oracleLastRound[agentId][msg.sender] = roundId + 1;

        euint64 completion = FHE.fromExternal(completionScore, inputProof);
        euint64 uptime = FHE.fromExternal(uptimeScore, inputProof);
        euint64 latency = FHE.fromExternal(latencyScore, inputProof);
        euint64 errorP = FHE.fromExternal(errorScore, inputProof);

        PendingRound storage round = _pendingRounds[agentId];
        if (!round.initialized) {
            round.sumCompletion = completion;
            round.sumUptime = uptime;
            round.sumLatency = latency;
            round.sumError = errorP;
            round.initialized = true;
        } else {
            round.sumCompletion = FHE.add(round.sumCompletion, completion);
            round.sumUptime = FHE.add(round.sumUptime, uptime);
            round.sumLatency = FHE.add(round.sumLatency, latency);
            round.sumError = FHE.add(round.sumError, errorP);
        }
        round.count += 1;
        FHE.allowThis(round.sumCompletion);
        FHE.allowThis(round.sumUptime);
        FHE.allowThis(round.sumLatency);
        FHE.allowThis(round.sumError);

        emit TelemetrySubmitted(agentId, msg.sender, roundId);

        if (round.count >= quorumThreshold) {
            euint64 avgCompletion = FHE.div(round.sumCompletion, quorumThreshold);
            euint64 avgUptime = FHE.div(round.sumUptime, quorumThreshold);
            euint64 avgLatency = FHE.div(round.sumLatency, quorumThreshold);
            euint64 avgError = FHE.div(round.sumError, quorumThreshold);

            _applyScoreUpdate(agentId, avgCompletion, avgUptime, avgLatency, avgError);

            delete _pendingRounds[agentId];
            currentRoundId[agentId] = roundId + 1;
            emit ScoreUpdated(agentId, roundId);
        }
    }

    function _applyScoreUpdate(
        uint256 agentId,
        euint64 completion,
        euint64 uptime,
        euint64 latency,
        euint64 errorP
    ) private {
        Agent storage a = _agents[agentId];

        euint64 weighted = FHE.add(
            FHE.add(FHE.mul(completion, W_COMPLETION), FHE.mul(uptime, W_UPTIME)),
            FHE.mul(latency, W_LATENCY)
        );
        euint64 penalty = FHE.mul(errorP, W_ERROR);

        // exponential smoothing under FHE: newScore = (3*old + weighted - penalty) / 4
        euint64 blended = FHE.add(FHE.mul(a.trustScore, 3), weighted);
        ebool underflows = FHE.lt(blended, penalty);
        euint64 safeBlended = FHE.select(underflows, FHE.asEuint64(0), FHE.sub(blended, penalty));
        euint64 newScore = FHE.div(safeBlended, 4);

        a.trustScore = newScore;
        a.requiredBond = _deriveBond(newScore);
        a.bondSufficient = FHE.ge(FHE.asEuint64(uint64(_clampToU64(a.postedBond))), a.requiredBond);

        FHE.allowThis(a.trustScore);
        FHE.allowThis(a.requiredBond);
        FHE.allowThis(a.bondSufficient);
        FHE.allow(a.trustScore, a.operator);
        FHE.allow(a.requiredBond, a.operator);
        FHE.allow(a.bondSufficient, a.operator);
    }

    /// @dev Confidential decision-tree: three bond tiers selected entirely
    /// under encryption via FHE.select, so the thresholds an agent crossed
    /// are never revealed on-chain.
    function _deriveBond(euint64 score) private returns (euint64) {
        ebool highTrust = FHE.ge(score, FHE.asEuint64(HIGH_TRUST_THRESHOLD));
        ebool medTrust = FHE.ge(score, FHE.asEuint64(MED_TRUST_THRESHOLD));

        euint64 tier = FHE.select(medTrust, FHE.asEuint64(MED_TRUST_BOND), FHE.asEuint64(LOW_TRUST_BOND));
        return FHE.select(highTrust, FHE.asEuint64(HIGH_TRUST_BOND), tier);
    }

    function _clampToU64(uint256 value) private pure returns (uint256) {
        uint256 maxU64 = type(uint64).max;
        return value > maxU64 ? maxU64 : value;
    }

    /// @notice Operator posts native-token collateral for an agent.
    function depositBond(uint256 agentId) external payable onlyAgentOperator(agentId) {
        require(msg.value > 0, "CipherTrust: zero deposit");
        Agent storage a = _agents[agentId];
        a.postedBond += msg.value;
        a.bondSufficient = FHE.ge(FHE.asEuint64(uint64(_clampToU64(a.postedBond))), a.requiredBond);
        FHE.allowThis(a.bondSufficient);
        FHE.allow(a.bondSufficient, a.operator);
        emit BondDeposited(agentId, msg.value, a.postedBond);
    }

    /// @notice Operator withdraws excess collateral. Confidential sufficiency
    /// should be re-checked off-chain via the relayer SDK before withdrawing,
    /// since the exact required bond stays encrypted on-chain.
    function withdrawBond(uint256 agentId, uint256 amount) external onlyAgentOperator(agentId) {
        Agent storage a = _agents[agentId];
        require(amount <= a.postedBond, "CipherTrust: exceeds posted bond");
        a.postedBond -= amount;
        a.bondSufficient = FHE.ge(FHE.asEuint64(uint64(_clampToU64(a.postedBond))), a.requiredBond);
        FHE.allowThis(a.bondSufficient);
        FHE.allow(a.bondSufficient, a.operator);
        payable(msg.sender).transfer(amount);
        emit BondWithdrawn(agentId, amount);
    }

    /// @notice Grant an authorized underwriter/insurer read access to an
    /// agent's encrypted trust score, required bond, and sufficiency flag --
    /// without exposing the raw telemetry that produced them.
    function grantUnderwriterAccess(uint256 agentId, address underwriter) external onlyAgentOperator(agentId) {
        require(authorizedUnderwriters[underwriter], "CipherTrust: underwriter not authorized");
        Agent storage a = _agents[agentId];
        FHE.allow(a.trustScore, underwriter);
        FHE.allow(a.requiredBond, underwriter);
        FHE.allow(a.bondSufficient, underwriter);
    }

    /// @notice Operator opts in to publicly reveal only the *tier* (Low/Medium/High)
    /// of their agent's trust score -- never the exact score -- so a soulbound
    /// ReputationBadge can be minted/upgraded. This is a selective disclosure,
    /// not a default: the raw score stays encrypted unless the operator calls this.
    function requestTierReveal(uint256 agentId) external onlyAgentOperator(agentId) returns (uint256 requestId) {
        Agent storage a = _agents[agentId];
        ebool highTrust = FHE.ge(a.trustScore, FHE.asEuint64(HIGH_TRUST_THRESHOLD));
        ebool medTrust = FHE.ge(a.trustScore, FHE.asEuint64(MED_TRUST_THRESHOLD));
        euint64 tierCode = FHE.select(highTrust, FHE.asEuint64(3), FHE.select(medTrust, FHE.asEuint64(2), FHE.asEuint64(1)));
        FHE.allowThis(tierCode);
        FHE.makePubliclyDecryptable(tierCode);

        requestId = nextTierRequestId++;
        tierRequestAgent[requestId] = agentId;
        tierRequestHandle[requestId] = euint64.unwrap(tierCode);
        emit TierRevealRequested(agentId, requestId);
    }

    /// @notice Called with the Zama KMS's decrypted cleartext + proof (via the
    /// relayer SDK's public-decrypt flow) to finalize a tier reveal.
    function fulfillTierReveal(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external {
        bytes32 handle = tierRequestHandle[requestId];
        require(handle != bytes32(0), "CipherTrust: unknown request");
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = handle;
        FHE.checkSignatures(handles, cleartexts, decryptionProof);

        uint64 tierCode = abi.decode(cleartexts, (uint64));
        uint256 agentId = tierRequestAgent[requestId];
        delete tierRequestHandle[requestId];
        delete tierRequestAgent[requestId];

        if (address(reputationBadge) != address(0)) {
            reputationBadge.mintOrUpgrade(agentId, _agents[agentId].operator, uint8(tierCode));
        }
        emit TierRevealed(agentId, tierCode);
    }

    /// @notice An authorized oracle flags a possible SLA breach with an
    /// encrypted 0/1 signal. Nothing happens on-chain until the flag is
    /// confidentially checked and revealed via fulfillSlashCheck.
    function requestSlashCheck(
        uint256 agentId,
        externalEuint64 breachSignal,
        bytes calldata inputProof
    ) external onlyOracle returns (uint256 requestId) {
        Agent storage a = _agents[agentId];
        require(a.registered, "CipherTrust: unknown agent");

        euint64 signal = FHE.fromExternal(breachSignal, inputProof);
        ebool breached = FHE.eq(signal, FHE.asEuint64(1));
        FHE.allowThis(breached);
        FHE.makePubliclyDecryptable(breached);

        requestId = nextSlashRequestId++;
        slashRequestAgent[requestId] = agentId;
        slashRequestHandle[requestId] = ebool.unwrap(breached);
        emit SlashCheckRequested(agentId, requestId);
    }

    /// @notice Finalizes a slash check using the Zama KMS's decrypted
    /// cleartext + proof. If breached, 10% of the posted bond is slashed and
    /// forwarded to the InsurancePool (if configured) as LP yield.
    function fulfillSlashCheck(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external {
        bytes32 handle = slashRequestHandle[requestId];
        require(handle != bytes32(0), "CipherTrust: unknown request");
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = handle;
        FHE.checkSignatures(handles, cleartexts, decryptionProof);

        bool breached = abi.decode(cleartexts, (bool));
        uint256 agentId = slashRequestAgent[requestId];
        delete slashRequestHandle[requestId];
        delete slashRequestAgent[requestId];

        if (breached) {
            Agent storage a = _agents[agentId];
            uint256 penalty = (a.postedBond * SLASH_BPS) / 10000;
            if (penalty > 0) {
                a.postedBond -= penalty;
                a.breachCount += 1;
                a.bondSufficient = FHE.ge(FHE.asEuint64(uint64(_clampToU64(a.postedBond))), a.requiredBond);
                FHE.allowThis(a.bondSufficient);
                FHE.allow(a.bondSufficient, a.operator);

                if (address(insurancePool) != address(0)) {
                    insurancePool.receivePenalty{value: penalty}(agentId);
                }
                emit AgentSlashed(agentId, penalty);
            }
        }
        emit SlashCheckFulfilled(agentId, breached);
    }

    function getAgent(uint256 agentId)
        external
        view
        returns (address operator, bool registered, bool active, uint256 postedBond, uint256 breachCount, uint256 identityId)
    {
        Agent storage a = _agents[agentId];
        return (a.operator, a.registered, a.active, a.postedBond, a.breachCount, a.identityId);
    }

    function getEncryptedTrustScore(uint256 agentId) external view returns (euint64) {
        return _agents[agentId].trustScore;
    }

    function getEncryptedRequiredBond(uint256 agentId) external view returns (euint64) {
        return _agents[agentId].requiredBond;
    }

    function getEncryptedBondSufficiency(uint256 agentId) external view returns (ebool) {
        return _agents[agentId].bondSufficient;
    }

    function deactivateAgent(uint256 agentId) external onlyAdmin {
        _agents[agentId].active = false;
    }
}
