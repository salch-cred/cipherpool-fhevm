// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title InsurancePool
/// @notice Composable underwriting-yield pool. Liquidity providers stake native token and
/// earn a share of every confidential slashing penalty collected by CipherTrust when an
/// autonomous agent breaches its SLA. This is a deliberately plain, fully transparent DeFi
/// primitive that composes with CipherTrust's confidential risk engine without ever needing
/// to see any agent's encrypted telemetry or trust score -- a concrete demonstration of
/// Season 3's "Composable Privacy" theme.
contract InsurancePool {
    address public admin;
    address public cipherTrust;

    uint256 public totalShares;
    uint256 public totalAssets;
    mapping(address => uint256) public sharesOf;

    event Staked(address indexed provider, uint256 amount, uint256 shares);
    event Withdrawn(address indexed provider, uint256 amount, uint256 shares);
    event PenaltyReceived(uint256 indexed agentId, uint256 amount);
    event CipherTrustSet(address indexed cipherTrust);
    event CreditDelegated(uint256 indexed agentId, uint256 amount);
    event CreditRepaid(uint256 indexed agentId, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "InsurancePool: not admin");
        _;
    }

    modifier onlyCipherTrust() {
        require(msg.sender == cipherTrust, "InsurancePool: not CipherTrust");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setCipherTrust(address cipherTrust_) external onlyAdmin {
        require(cipherTrust == address(0), "InsurancePool: already set");
        cipherTrust = cipherTrust_;
        emit CipherTrustSet(cipherTrust_);
    }

    function stake() external payable returns (uint256 shares) {
        require(msg.value > 0, "InsurancePool: zero stake");
        shares = totalShares == 0 ? msg.value : (msg.value * totalShares) / totalAssets;
        totalShares += shares;
        totalAssets += msg.value;
        sharesOf[msg.sender] += shares;
        emit Staked(msg.sender, msg.value, shares);
    }

    function withdraw(uint256 shares) external {
        require(shares > 0 && shares <= sharesOf[msg.sender], "InsurancePool: bad shares");
        uint256 amount = (shares * totalAssets) / totalShares;
        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount, shares);
    }

    /// @notice Called by CipherTrust when a confidential SLA breach results in a slashing
    /// penalty. The pool grows in value for existing stakers without minting new shares --
    /// this is the pool's yield.
    function receivePenalty(uint256 agentId) external payable onlyCipherTrust {
        totalAssets += msg.value;
        emit PenaltyReceived(agentId, msg.value);
    }

    function pricePerShare() external view returns (uint256) {
        if (totalShares == 0) return 1e18;
        return (totalAssets * 1e18) / totalShares;
    }

    function delegateCredit(uint256 agentId, uint256 amount) external onlyCipherTrust {
        require(totalAssets >= amount, "InsurancePool: insufficient assets for credit delegation");
        totalAssets -= amount;
        payable(cipherTrust).transfer(amount);
        emit CreditDelegated(agentId, amount);
    }

    function repayCredit(uint256 agentId) external payable onlyCipherTrust {
        totalAssets += msg.value;
        emit CreditRepaid(agentId, msg.value);
    }
}
