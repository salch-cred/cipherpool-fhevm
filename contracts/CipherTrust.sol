// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title CipherTrust
 * @notice Confidential underwriting protocol for autonomous agents & robots.
 *
 * Autonomous AI trading bots, delivery robots, drone fleets, and DePIN devices
 * increasingly hold funds and execute tasks without human supervision. There is
 * no confidential way today to score their reliability and price the
 * collateral/insurance they must post — any naive on-chain reputation system
 * leaks competitively sensitive operational data (uptime, error rates, routes,
 * strategy performance) to rivals, because blockchains are public by default.
 *
 * CipherTrust computes a rolling trust score and a required collateral bond
 * entirely under Fully Homomorphic Encryption. Operators, insurers, and task
 * marketplaces can rely on the *outcome* (bond tier, sufficiency check)
 * without ever seeing the raw encrypted telemetry that produced it.
 *
 * NOTE: this is an MVP scaffold. Verify every FHE.* call against the exact
 * current version of @fhevm/solidity pinned in package.json before deploying
 * to a live network — the FHE Solidity API surface evolves between releases.
 */
contract CipherTrust is SepoliaConfig {
    address public admin;
    uint256 public nextAgentId;

    struct Agent {
        address operator;
        bool registered;
        bool active;
        euint64 trustScore;    // encrypted, 0-1000 scale
        euint64 requiredBond;  // encrypted, wei
        uint256 postedBond;    // public collateral currently deposited (wei)
        ebool bondSufficient;  // encrypted boolean: postedBond >= requiredBond
    }

    mapping(uint256 => Agent) private _agents;
    mapping(address => bool) public authorizedOracles;
    mapping(address => bool) public authorizedUnderwriters;

    uint64 private constant W_COMPLETION = 40;
    uint64 private constant W_UPTIME = 30;
    uint64 private constant W_LATENCY = 15;
    uint64 private constant W_ERROR = 15;

    uint64 private constant HIGH_TRUST_THRESHOLD = 750;
    uint64 private constant MED_TRUST_THRESHOLD = 400;

    uint64 private constant HIGH_TRUST_BOND = uint64(0.1 ether);
    uint64 private constant MED_TRUST_BOND = uint64(1 ether);
    uint64 private constant LOW_TRUST_BOND = uint64(5 ether);

    event AgentRegistered(uint256 indexed agentId, address indexed operator);
    event OracleAuthorized(address indexed oracle);
    event UnderwriterAuthorized(address indexed underwriter);
    event TelemetrySubmitted(uint256 indexed agentId, address indexed oracle);
    event BondDeposited(uint256 indexed agentId, uint256 amount, uint256 totalPosted);
    event BondWithdrawn(uint256 indexed agentId, uint256 amount);

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

    function authorizeOracle(address oracle) external onlyAdmin {
        authorizedOracles[oracle] = true;
        emit OracleAuthorized(oracle);
    }

    function authorizeUnderwriter(address underwriter) external onlyAdmin {
        authorizedUnderwriters[underwriter] = true;
        emit UnderwriterAuthorized(underwriter);
    }

    /// @notice Register a new autonomous agent/robot under a given operator.
    function registerAgent(address operator) external onlyAdmin returns (uint256 agentId) {
        agentId = nextAgentId++;
        Agent storage a = _agents[agentId];
        a.operator = operator;
        a.registered = true;
        a.active = true;
        a.trustScore = FHE.asEuint64(500); // neutral starting score
        a.requiredBond = FHE.asEuint64(MED_TRUST_BOND);

        FHE.allowThis(a.trustScore);
        FHE.allowThis(a.requiredBond);
        FHE.allow(a.trustScore, operator);
        FHE.allow(a.requiredBond, operator);

        emit AgentRegistered(agentId, operator);
    }

    /// @notice Submit fully-encrypted telemetry for a completed task. Only
    /// authorized oracles (operator-run attestors, task marketplaces, or
    /// hardware-attested feeds) may call this.
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

        euint64 completion = FHE.fromExternal(completionScore, inputProof);
        euint64 uptime = FHE.fromExternal(uptimeScore, inputProof);
        euint64 latency = FHE.fromExternal(latencyScore, inputProof);
        euint64 errorP = FHE.fromExternal(errorScore, inputProof);

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

        emit TelemetrySubmitted(agentId, msg.sender);
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
    /// agent's encrypted trust score, required bond, and sufficiency flag —
    /// without exposing the raw telemetry that produced them.
    function grantUnderwriterAccess(uint256 agentId, address underwriter) external onlyAgentOperator(agentId) {
        require(authorizedUnderwriters[underwriter], "CipherTrust: underwriter not authorized");
        Agent storage a = _agents[agentId];
        FHE.allow(a.trustScore, underwriter);
        FHE.allow(a.requiredBond, underwriter);
        FHE.allow(a.bondSufficient, underwriter);
    }

    function getAgent(uint256 agentId)
        external
        view
        returns (address operator, bool registered, bool active, uint256 postedBond)
    {
        Agent storage a = _agents[agentId];
        return (a.operator, a.registered, a.active, a.postedBond);
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
