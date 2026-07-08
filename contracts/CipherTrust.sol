// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IReputationBadge {
    function mintOrUpgrade(uint256 agentId, address operator, uint8 tier) external;
    function tierOf(uint256 agentId) external view returns (uint8);
}

interface IInsurancePool {
    function receivePenalty(uint256 agentId) external payable;
    function delegateCredit(uint256 agentId, uint256 amount) external;
    function repayCredit(uint256 agentId) external payable;
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
 * exact current version of fhevm-solidity pinned in package.json before
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
        uint256 trustScoreVar; // estimation uncertainty variance, initialized to 100 (public)
        euint64 liquidationThreshold; // encrypted minimum trust score before liquidation
        uint256 delegatedBond; // public delegated bond amount borrowed from the pool (wei)
        uint256 interestAccumulated; // public interest accumulated (wei)
        uint256 lastInterestUpdateTime; // timestamp of the last yield accrual
    }

    struct Task {
        uint256 agentId;
        address client;
        uint256 coverageLimit; // maximum ETH coverage (wei)
        bool active;
    }

    struct Lease {
        address lessee;
        uint256 agentId;
        uint256 hardwareId;
        uint256 requiredBond; // underwriting bond (wei)
        uint256 startTimestamp;
        bool active;
    }

    uint256 public nextTaskId = 1;
    mapping(uint256 => Task) public tasks;

    uint256 public nextLeaseId = 1;
    mapping(uint256 => Lease) public leases;
    mapping(address => uint256) public userActiveLeaseId;
    mapping(uint256 => uint256) public claimRequestTask; // decryption requestId => taskId
    mapping(uint256 => uint256) public agentActiveTaskId; // agentId => active taskId (0 if none)

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

    // FHE-MFA Biometric Authentication State
    mapping(address => euint64[3]) private _registeredBiometrics;
    mapping(address => bool) private _hasBiometrics;
    uint32 public maxBiometricDrift = 15; // Manhattan distance tolerance
    mapping(address => bool) public biometricAuthPassed;
    mapping(uint256 => address) public biometricRequestUser;

    // FHE-Guard: Spam Filtering State
    mapping(address => uint32) public spamThreshold;
    mapping(address => uint256) public inboxCount;
    mapping(address => uint256) public spamInboxCount;
    mapping(uint256 => address) public spamCheckRequestUser;

    // FHE-Guard: Passwordless Auth State
    mapping(address => euint64) private _masterSecret;
    mapping(address => bool) private _hasSecret;
    mapping(address => uint64) public activeAuthChallenge;
    mapping(address => bool) public authPassed;
    mapping(uint256 => address) public authRequests;

    // FHE-Passport: Biometric Uniqueness State
    uint256 public passportCount;
    mapping(uint256 => euint64[3]) private _passportDatabase;
    mapping(address => bool) public hasPassport;
    mapping(uint256 => address) public passportRequests;
    mapping(address => bool) public passportUnique;
    mapping(uint256 => euint64[3]) private _pendingPassportTemplates;

    // FHE-Aegis: AI Agent Behavior Drift State
    mapping(uint256 => euint64[3]) private _agentBaselines;
    mapping(uint256 => bool) private _hasBaseline;
    uint32 public maxBehaviorDrift = 1000; // squared Euclidean distance threshold
    mapping(uint256 => bool) public agentBehaviorCompromised;
    mapping(uint256 => uint256) public behaviorRequests;

    // FHE-Stream: Confidential Staking Yields & Payroll Streams
    struct SalaryStream {
        euint64 flowRate;
        uint256 lastClaimBlock;
        bool active;
    }
    mapping(address => SalaryStream) private _salaryStreams;
    mapping(uint256 => address) public streamRequests;

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

    uint256 public nextLiquidationRequestId = 1;
    mapping(uint256 => uint256) public liquidationRequestAgent;

    IReputationBadge public reputationBadge;
    IInsurancePool public insurancePool;

    // FHE-ML Neural Perceptron Weights (Underwriter Configurable)
    uint32 public weightCompletion = 40;
    uint32 public weightUptime = 30;
    uint32 public weightLatency = 15;
    uint32 public weightError = 80;
    uint32 public neuronBias = 200;
    uint32 public maxNeuralRiskThreshold = 1200; // ReLU risk limit

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
    uint256 private constant ORACLE_VAR = 50;
    uint256 private constant PREMIUM_PER_VAR_WEI = 0.04 ether; // 0.04 ETH per unit of variance

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
    event AgentLiquidated(uint256 indexed agentId, uint256 slashedAmount);
    event LiquidationCheckRequested(uint256 indexed agentId, uint256 indexed requestId);
    event TaskRegistered(uint256 indexed taskId, uint256 indexed agentId, address indexed client, uint256 coverageLimit);
    event ClaimPaid(uint256 indexed taskId, uint256 indexed agentId, address indexed client, uint256 payoutAmount);
    event NeuronWeightsUpdated(uint32 wComp, uint32 wUpt, uint32 wLat, uint32 wErr, uint32 bias, uint32 threshold);
    event ReputationBadgeSet(address indexed badge);
    event InsurancePoolSet(address indexed pool);
    event LeaseRequested(uint256 indexed leaseId, address indexed lessee, uint256 hardwareId, uint256 requiredBond);
    event LeaseSettled(uint256 indexed leaseId, address indexed lessee, uint256 hardwareId, bool success, uint256 payout);
    event BiometricsRegistered(address indexed user);
    event BiometricsVerified(address indexed user, bool success);
    event MessageSpamChecked(address indexed recipient, bool isSpam);
    event AuthSecretRegistered(address indexed user);
    event AuthChallengeGenerated(address indexed user, uint64 challenge);
    event AuthVerified(address indexed user, bool success);
    event PassportCheckRequested(address indexed user, uint256 indexed requestId);
    event PassportRegistered(address indexed user, bool success, uint256 passportId);
    event AgentBaselineRegistered(uint256 indexed agentId);
    event BehaviorCheckRequested(uint256 indexed agentId, uint256 indexed requestId);
    event BehaviorChecked(uint256 indexed agentId, bool compromised);
    event SalaryStreamCreated(address indexed recipient);
    event StreamClaimRequested(address indexed recipient, uint256 indexed requestId);
    event StreamClaimed(address indexed recipient, uint256 amount);

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
        a.trustScoreVar = 100;
        a.liquidationThreshold = FHE.asEuint64(300);
        a.requiredBond = _deriveBond(a.trustScore, 100);
        a.delegatedBond = 0;
        a.interestAccumulated = 0;
        a.lastInterestUpdateTime = block.timestamp;

        FHE.allowThis(a.trustScore);
        FHE.allowThis(a.requiredBond);
        FHE.allowThis(a.liquidationThreshold);
        FHE.allow(a.trustScore, operator);
        FHE.allow(a.requiredBond, operator);
        FHE.allow(a.liquidationThreshold, operator);

        emit AgentRegistered(agentId, operator, identityId);
    }

    /// @notice Submit fully-encrypted telemetry for a completed task. Only
    /// authorized oracles may call this. The submission only affects the
    /// agent's score once `quorumThreshold` independent oracles have
    /// submitted within the current round.
    function submitTelemetry(
        uint256 agentId,
        externalEuint64 completionScoreA,
        externalEuint64 completionScoreB,
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

        euint64 compA = FHE.fromExternal(completionScoreA, inputProof);
        euint64 compB = FHE.fromExternal(completionScoreB, inputProof);
        euint64 uptime = FHE.fromExternal(uptimeScore, inputProof);
        euint64 latency = FHE.fromExternal(latencyScore, inputProof);
        euint64 errorP = FHE.fromExternal(errorScore, inputProof);

        // Compute absolute differences for anomaly detection (Completion only)
        ebool compAltB = FHE.lt(compA, compB);
        euint64 compDiff = FHE.select(compAltB, FHE.sub(compB, compA), FHE.sub(compA, compB));
        ebool compAnomaly = FHE.gt(compDiff, FHE.asEuint64(2));

        // Apply sensor fusion outlier filter
        euint64 completion = FHE.select(compAnomaly, FHE.asEuint64(0), FHE.div(FHE.add(compA, compB), 2));
        uptime = FHE.select(compAnomaly, FHE.asEuint64(0), uptime);
        latency = FHE.select(compAnomaly, FHE.asEuint64(0), latency);
        errorP = FHE.select(compAnomaly, FHE.asEuint64(10), errorP);

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

        euint64 weightedObs = FHE.add(
            FHE.add(FHE.mul(completion, W_COMPLETION), FHE.mul(uptime, W_UPTIME)),
            FHE.mul(latency, W_LATENCY)
        );
        euint64 penalty = FHE.mul(errorP, W_ERROR);

        ebool obsUnderflow = FHE.lt(weightedObs, penalty);
        euint64 x_obs = FHE.select(obsUnderflow, FHE.asEuint64(0), FHE.sub(weightedObs, penalty));

        // Bayesian Update for variance and weights
        uint256 oldVar = a.trustScoreVar;
        uint256 newVar = (oldVar * ORACLE_VAR) / (oldVar + ORACLE_VAR);
        if (newVar < 10) {
            newVar = 10;
        }
        a.trustScoreVar = newVar;

        uint256 alpha = (ORACLE_VAR * 100) / (oldVar + ORACLE_VAR);
        uint256 beta = (oldVar * 100) / (oldVar + ORACLE_VAR);

        // Weighted FHE score update
        euint64 term1 = FHE.mul(a.trustScore, uint64(alpha));
        euint64 term2 = FHE.mul(x_obs, uint64(beta));
        euint64 newScore = FHE.div(FHE.add(term1, term2), 100);

        a.trustScore = newScore;
        a.requiredBond = _deriveBond(newScore, newVar);

        uint256 dt = block.timestamp - a.lastInterestUpdateTime;
        a.lastInterestUpdateTime = block.timestamp;
        if (dt > 0 && a.delegatedBond > 0) {
            uint256 apr = 500; // default 5% APR
            if (address(reputationBadge) != address(0)) {
                uint8 tier = reputationBadge.tierOf(agentId);
                if (tier == 3) apr = 100;
                else if (tier == 2) apr = 500;
                else if (tier == 1) apr = 2500;
            }
            uint256 interestAcc = (a.delegatedBond * apr * dt) / 8640000000;
            a.interestAccumulated += interestAcc;
        }

        euint64 totalCollateral = FHE.add(FHE.asEuint64(uint64(_clampToU64(a.postedBond))), FHE.asEuint64(uint64(_clampToU64(a.delegatedBond))));
        a.bondSufficient = FHE.ge(totalCollateral, a.requiredBond);

        FHE.allowThis(a.trustScore);
        FHE.allowThis(a.requiredBond);
        FHE.allowThis(a.bondSufficient);
        FHE.allow(a.trustScore, a.operator);
        FHE.allow(a.requiredBond, a.operator);
        // On-chain FHE Perceptron (Confidential AI Model Inference)
        euint64 positiveRisk = FHE.add(
            FHE.add(FHE.mul(latency, weightLatency), FHE.mul(errorP, weightError)),
            FHE.asEuint64(neuronBias)
        );
        euint64 negativeRisk = FHE.add(
            FHE.mul(completion, weightCompletion),
            FHE.mul(uptime, weightUptime)
        );
        
        ebool riskUnderflow = FHE.lt(positiveRisk, negativeRisk);
        euint64 neuralRisk = FHE.select(riskUnderflow, FHE.asEuint64(0), FHE.sub(positiveRisk, negativeRisk));
        ebool isNeuralBreach = FHE.gt(neuralRisk, FHE.asEuint64(maxNeuralRiskThreshold));

        ebool breachedLimit = FHE.or(FHE.lt(newScore, a.liquidationThreshold), isNeuralBreach);
        euint64 severity = FHE.sub(FHE.asEuint64(1000), newScore);

        bytes32[] memory cts = new bytes32[](2);
        cts[0] = ebool.unwrap(breachedLimit);
        cts[1] = euint64.unwrap(severity);
        
        uint256 reqId = FHE.requestDecryption(cts, this.fulfillLiquidation.selector);
        liquidationRequestAgent[reqId] = agentId;
        emit LiquidationCheckRequested(agentId, reqId);
    }

    /// @dev Confidential decision-tree: three bond tiers selected entirely
    /// under encryption via FHE.select, plus a dynamic uncertainty premium.
    function _deriveBond(euint64 score, uint256 variance) private returns (euint64) {
        ebool highTrust = FHE.ge(score, FHE.asEuint64(HIGH_TRUST_THRESHOLD));
        ebool medTrust = FHE.ge(score, FHE.asEuint64(MED_TRUST_THRESHOLD));

        euint64 baseBond = FHE.select(medTrust, FHE.asEuint64(MED_TRUST_BOND), FHE.asEuint64(LOW_TRUST_BOND));
        baseBond = FHE.select(highTrust, FHE.asEuint64(HIGH_TRUST_BOND), baseBond);

        uint256 premium = variance * PREMIUM_PER_VAR_WEI;
        return FHE.add(baseBond, FHE.asEuint64(uint64(premium)));
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

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = euint64.unwrap(tierCode);
        requestId = FHE.requestDecryption(cts, this.fulfillTierReveal.selector);

        tierRequestAgent[requestId] = agentId;
        emit TierRevealRequested(agentId, requestId);
    }

    /// @notice Called with the Zama KMS's decrypted cleartext + proof (via the
    /// relayer SDK's public-decrypt flow) to finalize a tier reveal.
    function fulfillTierReveal(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint64 tierCode = abi.decode(cleartexts, (uint64));
        uint256 agentId = tierRequestAgent[requestId];
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

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = ebool.unwrap(breached);
        requestId = FHE.requestDecryption(cts, this.fulfillSlashCheck.selector);

        slashRequestAgent[requestId] = agentId;
        emit SlashCheckRequested(agentId, requestId);
    }

    /// @notice Finalizes a slash check using the Zama KMS's decrypted
    /// cleartext + proof. If breached, 10% of the posted bond is slashed and
    /// forwarded to the InsurancePool (if configured) as LP yield.
    function fulfillSlashCheck(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        bool breached = abi.decode(cleartexts, (bool));
        uint256 agentId = slashRequestAgent[requestId];
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

    /// @notice Finalizes a liquidation check using the Zama KMS's decrypted
    /// cleartext + proof. If breached, the agent is deactivated and its remaining
    /// posted bond is fully slashed to the InsurancePool.
    function fulfillLiquidation(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        (bool breached, uint256 severity) = abi.decode(cleartexts, (bool, uint256));
        uint256 agentId = liquidationRequestAgent[requestId];
        delete liquidationRequestAgent[requestId];

        if (breached) {
            Agent storage a = _agents[agentId];
            a.active = false;

            uint256 selfBond = a.postedBond;
            uint256 borrowedBond = a.delegatedBond;

            a.postedBond = 0;
            a.delegatedBond = 0;
            a.bondSufficient = FHE.asEbool(false);
            FHE.allowThis(a.bondSufficient);
            FHE.allow(a.bondSufficient, a.operator);

            uint256 totalBond = selfBond + borrowedBond;
            uint256 payoutAmount = 0;
            uint256 taskId = agentActiveTaskId[agentId];

            if (taskId > 0 && tasks[taskId].active) {
                payoutAmount = (tasks[taskId].coverageLimit * severity) / 1000;
                if (payoutAmount > totalBond) {
                    payoutAmount = totalBond;
                }
                
                Task storage t = tasks[taskId];
                t.active = false;
                agentActiveTaskId[agentId] = 0;
                
                if (payoutAmount > 0) {
                    payable(t.client).transfer(payoutAmount);
                    emit ClaimPaid(taskId, agentId, t.client, payoutAmount);
                }
            }

            uint256 remainder = totalBond - payoutAmount;
            if (remainder > 0) {
                if (address(insurancePool) != address(0)) {
                    insurancePool.receivePenalty{value: remainder}(agentId);
                }
                emit AgentLiquidated(agentId, remainder);
            }
        }
    }

    function getAgent(uint256 agentId)
        external
        view
        returns (address operator, bool registered, bool active, uint256 postedBond, uint256 breachCount, uint256 identityId, uint256 trustScoreVar)
    {
        Agent storage a = _agents[agentId];
        return (a.operator, a.registered, a.active, a.postedBond, a.breachCount, a.identityId, a.trustScoreVar);
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

    function getDelegatedBond(uint256 agentId) external view returns (uint256) {
        return _agents[agentId].delegatedBond;
    }

    function getInterestAccumulated(uint256 agentId) external view returns (uint256) {
        return _agents[agentId].interestAccumulated;
    }

    event CreditDelegated(uint256 indexed agentId, uint256 amount);
    event InterestRepaid(uint256 indexed agentId, uint256 amount);

    function requestCreditDelegation(uint256 agentId, uint256 amount) external {
        Agent storage a = _agents[agentId];
        require(msg.sender == a.operator, "CipherTrust: not operator");
        require(a.registered && a.active, "CipherTrust: inactive agent");
        require(address(insurancePool) != address(0), "CipherTrust: insurance pool not set");

        insurancePool.delegateCredit(agentId, amount);

        a.delegatedBond += amount;
        euint64 totalCollateral = FHE.add(FHE.asEuint64(uint64(_clampToU64(a.postedBond))), FHE.asEuint64(uint64(_clampToU64(a.delegatedBond))));
        a.bondSufficient = FHE.ge(totalCollateral, a.requiredBond);

        FHE.allowThis(a.bondSufficient);
        FHE.allow(a.bondSufficient, a.operator);

        emit CreditDelegated(agentId, amount);
    }

    function repayInterest(uint256 agentId) external payable {
        Agent storage a = _agents[agentId];
        require(a.registered && a.active, "CipherTrust: inactive agent");
        require(msg.value > 0, "CipherTrust: zero value repayment");

        if (msg.value >= a.interestAccumulated) {
            a.interestAccumulated = 0;
        } else {
            a.interestAccumulated -= msg.value;
        }

        insurancePool.repayCredit{value: msg.value}(agentId);

        emit InterestRepaid(agentId, msg.value);
    }

    function registerUnderwrittenTask(uint256 agentId, address client, uint256 coverageLimit) external returns (uint256 taskId) {
        Agent storage a = _agents[agentId];
        require(msg.sender == a.operator || msg.sender == admin, "CipherTrust: unauthorized task creator");
        require(a.registered && a.active, "CipherTrust: inactive agent");
        require(agentActiveTaskId[agentId] == 0, "CipherTrust: agent already has an active task");

        uint256 totalCollateral = a.postedBond + a.delegatedBond;
        require(totalCollateral >= coverageLimit, "CipherTrust: insufficient collateral to underwrite task");

        taskId = nextTaskId++;
        Task storage t = tasks[taskId];
        t.agentId = agentId;
        t.client = client;
        t.coverageLimit = coverageLimit;
        t.active = true;

        agentActiveTaskId[agentId] = taskId;

        emit TaskRegistered(taskId, agentId, client, coverageLimit);
    }

    function deactivateAgent(uint256 agentId) external onlyAdmin {
        _agents[agentId].active = false;
    }

    function updateNeuronWeights(
        uint32 wComp,
        uint32 wUpt,
        uint32 wLat,
        uint32 wErr,
        uint32 bias,
        uint32 threshold
    ) external onlyAdmin {
        weightCompletion = wComp;
        weightUptime = wUpt;
        weightLatency = wLat;
        weightError = wErr;
        neuronBias = bias;
        maxNeuralRiskThreshold = threshold;

        emit NeuronWeightsUpdated(wComp, wUpt, wLat, wErr, bias, threshold);
    }

    function requestLeaseHardware(
        uint256 agentId,
        uint256 hardwareId,
        uint256 leaseBond
    ) external returns (uint256 leaseId) {
        Agent storage a = _agents[agentId];
        require(msg.sender == a.operator, "CipherTrust: not operator");
        require(a.registered && a.active, "CipherTrust: inactive agent");
        require(address(reputationBadge) != address(0), "CipherTrust: reputation badge not set");
        require(address(insurancePool) != address(0), "CipherTrust: insurance pool not set");
        require(userActiveLeaseId[msg.sender] == 0, "CipherTrust: lessee already has an active lease");
        
        uint8 tier = reputationBadge.tierOf(agentId);
        require(tier >= 2, "CipherTrust: insufficient reputation tier for lease underwriting");

        insurancePool.delegateCredit(agentId, leaseBond);

        leaseId = nextLeaseId++;
        Lease storage l = leases[leaseId];
        l.lessee = msg.sender;
        l.agentId = agentId;
        l.hardwareId = hardwareId;
        l.requiredBond = leaseBond;
        l.startTimestamp = block.timestamp;
        l.active = true;

        userActiveLeaseId[msg.sender] = leaseId;

        emit LeaseRequested(leaseId, msg.sender, hardwareId, leaseBond);
    }

    function settleLeaseHardware(uint256 leaseId, bool success) external onlyAdmin {
        Lease storage l = leases[leaseId];
        require(l.active, "CipherTrust: lease not active");

        l.active = false;
        userActiveLeaseId[l.lessee] = 0;

        uint256 payout = 0;
        if (!success) {
            payout = l.requiredBond;
            payable(admin).transfer(payout);
        } else {
            insurancePool.repayCredit{value: l.requiredBond}(l.agentId);
        }

        emit LeaseSettled(leaseId, l.lessee, l.hardwareId, success, payout);
    }

    function registerBiometricSignature(
        externalEuint64 hX,
        externalEuint64 hY,
        externalEuint64 hZ,
        bytes calldata inputProof
    ) external {
        euint64 x = FHE.fromExternal(hX, inputProof);
        euint64 y = FHE.fromExternal(hY, inputProof);
        euint64 z = FHE.fromExternal(hZ, inputProof);

        _registeredBiometrics[msg.sender][0] = x;
        _registeredBiometrics[msg.sender][1] = y;
        _registeredBiometrics[msg.sender][2] = z;
        _hasBiometrics[msg.sender] = true;

        FHE.allowThis(_registeredBiometrics[msg.sender][0]);
        FHE.allowThis(_registeredBiometrics[msg.sender][1]);
        FHE.allowThis(_registeredBiometrics[msg.sender][2]);
        FHE.allow(_registeredBiometrics[msg.sender][0], msg.sender);
        FHE.allow(_registeredBiometrics[msg.sender][1], msg.sender);
        FHE.allow(_registeredBiometrics[msg.sender][2], msg.sender);

        emit BiometricsRegistered(msg.sender);
    }

    function requestBiometricAuth(
        externalEuint64 hX,
        externalEuint64 hY,
        externalEuint64 hZ,
        bytes calldata inputProof
    ) external returns (uint256 requestId) {
        address user = msg.sender;
        require(_hasBiometrics[user], "CipherTrust: biometrics not registered");

        euint64 x_f = FHE.fromExternal(hX, inputProof);
        euint64 y_f = FHE.fromExternal(hY, inputProof);
        euint64 z_f = FHE.fromExternal(hZ, inputProof);

        euint64 x = _registeredBiometrics[user][0];
        euint64 y = _registeredBiometrics[user][1];
        euint64 z = _registeredBiometrics[user][2];

        ebool xAlt = FHE.lt(x, x_f);
        euint64 diffX = FHE.select(xAlt, FHE.sub(x_f, x), FHE.sub(x, x_f));

        ebool yAlt = FHE.lt(y, y_f);
        euint64 diffY = FHE.select(yAlt, FHE.sub(y_f, y), FHE.sub(y, y_f));

        ebool zAlt = FHE.lt(z, z_f);
        euint64 diffZ = FHE.select(zAlt, FHE.sub(z_f, z), FHE.sub(z, z_f));

        euint64 totalDist = FHE.add(FHE.add(diffX, diffY), diffZ);
        ebool verified = FHE.le(totalDist, FHE.asEuint64(maxBiometricDrift));

        FHE.allowThis(verified);

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = ebool.unwrap(verified);

        requestId = FHE.requestDecryption(cts, this.fulfillBiometricAuth.selector);
        biometricRequestUser[requestId] = user;

        biometricAuthPassed[user] = false; // reset status until callback executes
        emit BiometricsVerified(user, false);
    }

    function fulfillBiometricAuth(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        bool success = abi.decode(cleartexts, (bool));
        address user = biometricRequestUser[requestId];
        delete biometricRequestUser[requestId];

        biometricAuthPassed[user] = success;
        emit BiometricsVerified(user, success);
    }

    // FHE-Shield: Spam Filter Implementation
    function setSpamThreshold(uint32 threshold) external {
        spamThreshold[msg.sender] = threshold;
    }

    function sendConfidentialMessage(
        address recipient,
        externalEuint64 wA,
        externalEuint64 wB,
        externalEuint64 wC,
        bytes calldata inputProof
    ) external returns (uint256 requestId) {
        if (spamThreshold[recipient] == 0) {
            spamThreshold[recipient] = 15; // default threshold
        }

        euint64 scoreA = FHE.fromExternal(wA, inputProof);
        euint64 scoreB = FHE.fromExternal(wB, inputProof);
        euint64 scoreC = FHE.fromExternal(wC, inputProof);

        euint64 totalScore = FHE.add(FHE.add(scoreA, scoreB), scoreC);
        ebool isSpam = FHE.gt(totalScore, FHE.asEuint64(spamThreshold[recipient]));

        FHE.allowThis(isSpam);

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = ebool.unwrap(isSpam);

        requestId = FHE.requestDecryption(cts, this.fulfillSpamCheck.selector);
        spamCheckRequestUser[requestId] = recipient;
    }

    function fulfillSpamCheck(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        bool isSpam = abi.decode(cleartexts, (bool));
        address recipient = spamCheckRequestUser[requestId];
        delete spamCheckRequestUser[requestId];

        if (isSpam) {
            spamInboxCount[recipient]++;
        } else {
            inboxCount[recipient]++;
        }

        emit MessageSpamChecked(recipient, isSpam);
    }

    // FHE-Pass: Challenge-Response Implementation
    function registerAuthSecret(
        externalEuint64 hSecret,
        bytes calldata inputProof
    ) external {
        _masterSecret[msg.sender] = FHE.fromExternal(hSecret, inputProof);
        _hasSecret[msg.sender] = true;

        FHE.allowThis(_masterSecret[msg.sender]);
        FHE.allow(_masterSecret[msg.sender], msg.sender);

        emit AuthSecretRegistered(msg.sender);
    }

    function generateAuthChallenge(uint64 seedChallenge) external returns (uint64) {
        require(_hasSecret[msg.sender], "CipherTrust: user has no registered secret");
        activeAuthChallenge[msg.sender] = seedChallenge;
        emit AuthChallengeGenerated(msg.sender, seedChallenge);
        return seedChallenge;
    }

    function verifyAuthChallenge(
        externalEuint64 hResponse,
        bytes calldata inputProof
    ) external returns (uint256 requestId) {
        address user = msg.sender;
        require(_hasSecret[user], "CipherTrust: credentials not registered");
        require(activeAuthChallenge[user] != 0, "CipherTrust: no active challenge generated");

        euint64 response = FHE.fromExternal(hResponse, inputProof);
        euint64 challengeVal = FHE.asEuint64(activeAuthChallenge[user]);
        euint64 expected = FHE.add(_masterSecret[user], challengeVal);

        ebool isValid = FHE.eq(response, expected);
        FHE.allowThis(isValid);

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = ebool.unwrap(isValid);

        requestId = FHE.requestDecryption(cts, this.fulfillAuthCheck.selector);
        authRequests[requestId] = user;

        authPassed[user] = false;
        emit AuthVerified(user, false);
    }

    function fulfillAuthCheck(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        bool success = abi.decode(cleartexts, (bool));
        address user = authRequests[requestId];
        delete authRequests[requestId];

        authPassed[user] = success;
        emit AuthVerified(user, success);
    }

    // FHE-Passport: Biometric Uniqueness Check Implementation
    function requestPassportRegistration(
        externalEuint64 hX,
        externalEuint64 hY,
        externalEuint64 hZ,
        bytes calldata inputProof
    ) external returns (uint256 requestId) {
        address user = msg.sender;
        require(!hasPassport[user], "CipherTrust: user already registered a passport");

        euint64 x = FHE.fromExternal(hX, inputProof);
        euint64 y = FHE.fromExternal(hY, inputProof);
        euint64 z = FHE.fromExternal(hZ, inputProof);

        uint256 nextReqId = nextTierRequestId++; // reuse standard request sequence generator
        _pendingPassportTemplates[nextReqId][0] = x;
        _pendingPassportTemplates[nextReqId][1] = y;
        _pendingPassportTemplates[nextReqId][2] = z;

        FHE.allowThis(_pendingPassportTemplates[nextReqId][0]);
        FHE.allowThis(_pendingPassportTemplates[nextReqId][1]);
        FHE.allowThis(_pendingPassportTemplates[nextReqId][2]);

        ebool isUnique = FHE.asEbool(true);

        uint256 startIdx = 0;
        if (passportCount > 5) {
            startIdx = passportCount - 5;
        }

        for (uint256 i = startIdx; i < passportCount; i++) {
            euint64 dbX = _passportDatabase[i][0];
            euint64 dbY = _passportDatabase[i][1];
            euint64 dbZ = _passportDatabase[i][2];

            ebool xAlt = FHE.lt(dbX, x);
            euint64 diffX = FHE.select(xAlt, FHE.sub(x, dbX), FHE.sub(dbX, x));

            ebool yAlt = FHE.lt(dbY, y);
            euint64 diffY = FHE.select(yAlt, FHE.sub(y, dbY), FHE.sub(dbY, y));

            ebool zAlt = FHE.lt(dbZ, z);
            euint64 diffZ = FHE.select(zAlt, FHE.sub(z, dbZ), FHE.sub(dbZ, z));

            euint64 dist = FHE.add(FHE.add(diffX, diffY), diffZ);
            ebool tooClose = FHE.le(dist, FHE.asEuint64(10));
            isUnique = FHE.and(isUnique, FHE.not(tooClose));
        }

        FHE.allowThis(isUnique);

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = ebool.unwrap(isUnique);

        requestId = FHE.requestDecryption(cts, this.fulfillPassportCheck.selector);
        passportRequests[requestId] = user;
        claimRequestTask[requestId] = nextReqId;

        emit PassportCheckRequested(user, requestId);
    }

    function fulfillPassportCheck(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        bool isUnique = abi.decode(cleartexts, (bool));
        address user = passportRequests[requestId];
        uint256 reqId = claimRequestTask[requestId];
        
        delete passportRequests[requestId];
        delete claimRequestTask[requestId];

        passportUnique[user] = isUnique;
        
        if (isUnique) {
            uint256 id = passportCount++;
            _passportDatabase[id][0] = _pendingPassportTemplates[reqId][0];
            _passportDatabase[id][1] = _pendingPassportTemplates[reqId][1];
            _passportDatabase[id][2] = _pendingPassportTemplates[reqId][2];
            
            FHE.allowThis(_passportDatabase[id][0]);
            FHE.allowThis(_passportDatabase[id][1]);
            FHE.allowThis(_passportDatabase[id][2]);
            
            hasPassport[user] = true;
            emit PassportRegistered(user, true, id);
        } else {
            emit PassportRegistered(user, false, 9999);
        }
    }

    // FHE-Aegis: Behavioral Anomaly Detector Implementation
    function registerAgentBaseline(
        uint256 agentId,
        externalEuint64 hT,
        externalEuint64 hF,
        externalEuint64 hC,
        bytes calldata inputProof
    ) external {
        Agent storage a = _agents[agentId];
        require(a.registered, "CipherTrust: unknown agent");
        require(a.operator == msg.sender, "CipherTrust: not operator");

        _agentBaselines[agentId][0] = FHE.fromExternal(hT, inputProof);
        _agentBaselines[agentId][1] = FHE.fromExternal(hF, inputProof);
        _agentBaselines[agentId][2] = FHE.fromExternal(hC, inputProof);
        _hasBaseline[agentId] = true;

        FHE.allowThis(_agentBaselines[agentId][0]);
        FHE.allowThis(_agentBaselines[agentId][1]);
        FHE.allowThis(_agentBaselines[agentId][2]);

        emit AgentBaselineRegistered(agentId);
    }

    function evaluateAgentBehavior(
        uint256 agentId,
        externalEuint64 hT,
        externalEuint64 hF,
        externalEuint64 hC,
        bytes calldata inputProof
    ) external returns (uint256 requestId) {
        Agent storage a = _agents[agentId];
        require(a.registered && a.active, "CipherTrust: unknown or inactive agent");
        require(_hasBaseline[agentId], "CipherTrust: agent has no behavior baseline");

        euint64 oT = FHE.fromExternal(hT, inputProof);
        euint64 oF = FHE.fromExternal(hF, inputProof);
        euint64 oC = FHE.fromExternal(hC, inputProof);

        euint64 bT = _agentBaselines[agentId][0];
        euint64 bF = _agentBaselines[agentId][1];
        euint64 bC = _agentBaselines[agentId][2];

        euint64 diffT = FHE.select(FHE.lt(oT, bT), FHE.sub(bT, oT), FHE.sub(oT, bT));
        euint64 diffF = FHE.select(FHE.lt(oF, bF), FHE.sub(bF, oF), FHE.sub(oF, bF));
        euint64 diffC = FHE.select(FHE.lt(oC, bC), FHE.sub(bC, oC), FHE.sub(oC, bC));

        euint64 drift = FHE.add(
            FHE.add(FHE.mul(diffT, diffT), FHE.mul(diffF, diffF)),
            FHE.mul(diffC, diffC)
        );

        ebool isCompromised = FHE.gt(drift, FHE.asEuint64(maxBehaviorDrift));
        FHE.allowThis(isCompromised);

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = ebool.unwrap(isCompromised);

        requestId = FHE.requestDecryption(cts, this.fulfillBehaviorCheck.selector);
        behaviorRequests[requestId] = agentId;

        emit BehaviorCheckRequested(agentId, requestId);
    }

    function fulfillBehaviorCheck(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        bool isCompromised = abi.decode(cleartexts, (bool));
        uint256 agentId = behaviorRequests[requestId];
        delete behaviorRequests[requestId];

        agentBehaviorCompromised[agentId] = isCompromised;

        if (isCompromised) {
            Agent storage a = _agents[agentId];
            a.active = false;
            
            uint256 totalBond = a.postedBond + a.delegatedBond;
            a.postedBond = 0;
            a.delegatedBond = 0;
            a.interestAccumulated = 0;

            if (totalBond > 0) {
                insurancePool.receivePenalty{value: totalBond}(agentId);
            }
            emit AgentLiquidated(agentId, totalBond);
        }

        emit BehaviorChecked(agentId, isCompromised);
    }

    // FHE-Stream: Confidential Salary & Yield Streaming Implementation
    function createSalaryStream(
        address recipient,
        externalEuint64 hRate,
        bytes calldata inputProof
    ) external onlyAdmin {
        require(!_salaryStreams[recipient].active, "CipherTrust: stream already active");
        
        _salaryStreams[recipient].flowRate = FHE.fromExternal(hRate, inputProof);
        _salaryStreams[recipient].lastClaimBlock = block.number;
        _salaryStreams[recipient].active = true;

        FHE.allow(_salaryStreams[recipient].flowRate, recipient);
        FHE.allowThis(_salaryStreams[recipient].flowRate);

        emit SalaryStreamCreated(recipient);
    }

    function claimSalaryStream() external returns (uint256 requestId) {
        address recipient = msg.sender;
        SalaryStream storage stream = _salaryStreams[recipient];
        require(stream.active, "CipherTrust: no active stream");
        require(block.number > stream.lastClaimBlock, "CipherTrust: claim too early");

        uint256 blocksAccrued = block.number - stream.lastClaimBlock;
        stream.lastClaimBlock = block.number;

        euint64 accrued = FHE.mul(stream.flowRate, uint64(blocksAccrued));
        FHE.allowThis(accrued);

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = euint64.unwrap(accrued);

        requestId = FHE.requestDecryption(cts, this.fulfillStreamClaim.selector);
        streamRequests[requestId] = recipient;

        emit StreamClaimRequested(recipient, requestId);
    }

    function fulfillStreamClaim(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint256 amount = abi.decode(cleartexts, (uint256));
        address recipient = streamRequests[requestId];
        delete streamRequests[requestId];

        if (amount > 0) {
            payable(recipient).transfer(amount);
        }

        emit StreamClaimed(recipient, amount);
    }

    // FHE-Triangulation: Proof of physical location
    mapping(uint256 => address) public triangulationRequests;
    mapping(address => bool) public locationVerified;

    event TriangulationRequested(address indexed operator, uint256 requestId);
    event TriangulationResult(address indexed operator, bool success);

    function requestTriangulation(
        externalEuint64 encryptedX,
        externalEuint64 encryptedY,
        externalEuint64 encryptedDistSqA,
        externalEuint64 encryptedDistSqB,
        externalEuint64 encryptedDistSqC,
        bytes calldata inputProof
    ) external returns (uint256 requestId) {
        euint64 x = FHE.fromExternal(encryptedX, inputProof);
        euint64 y = FHE.fromExternal(encryptedY, inputProof);
        euint64 distSqA = FHE.fromExternal(encryptedDistSqA, inputProof);
        euint64 distSqB = FHE.fromExternal(encryptedDistSqB, inputProof);
        euint64 distSqC = FHE.fromExternal(encryptedDistSqC, inputProof);

        // Anchor A (10, 10)
        euint64 dxA = FHE.select(FHE.lt(x, 10), FHE.sub(10, x), FHE.sub(x, 10));
        euint64 dyA = FHE.select(FHE.lt(y, 10), FHE.sub(10, y), FHE.sub(y, 10));
        euint64 calcDistSqA = FHE.add(FHE.mul(dxA, dxA), FHE.mul(dyA, dyA));
        euint64 errA = FHE.select(FHE.lt(calcDistSqA, distSqA), FHE.sub(distSqA, calcDistSqA), FHE.sub(calcDistSqA, distSqA));

        // Anchor B (90, 10)
        euint64 dxB = FHE.select(FHE.lt(x, 90), FHE.sub(90, x), FHE.sub(x, 90));
        euint64 dyB = FHE.select(FHE.lt(y, 10), FHE.sub(10, y), FHE.sub(y, 10));
        euint64 calcDistSqB = FHE.add(FHE.mul(dxB, dxB), FHE.mul(dyB, dyB));
        euint64 errB = FHE.select(FHE.lt(calcDistSqB, distSqB), FHE.sub(distSqB, calcDistSqB), FHE.sub(calcDistSqB, distSqB));

        // Anchor C (50, 80)
        euint64 dxC = FHE.select(FHE.lt(x, 50), FHE.sub(50, x), FHE.sub(x, 50));
        euint64 dyC = FHE.select(FHE.lt(y, 80), FHE.sub(80, y), FHE.sub(y, 80));
        euint64 calcDistSqC = FHE.add(FHE.mul(dxC, dxC), FHE.mul(dyC, dyC));
        euint64 errC = FHE.select(FHE.lt(calcDistSqC, distSqC), FHE.sub(distSqC, calcDistSqC), FHE.sub(calcDistSqC, calcDistSqC));

        euint64 totalError = FHE.add(FHE.add(errA, errB), errC);
        ebool verified = FHE.le(totalError, 100);
        FHE.allowThis(verified);

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = ebool.unwrap(verified);

        requestId = FHE.requestDecryption(cts, this.fulfillTriangulation.selector);
        triangulationRequests[requestId] = msg.sender;

        emit TriangulationRequested(msg.sender, requestId);
    }

    function fulfillTriangulation(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        bool success = abi.decode(cleartexts, (bool));
        address operator = triangulationRequests[requestId];
        delete triangulationRequests[requestId];

        locationVerified[operator] = success;
        emit TriangulationResult(operator, success);
    }

    receive() external payable {}
}
