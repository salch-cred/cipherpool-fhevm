// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentIdentityRegistry
/// @notice Lightweight, ERC-8004-inspired identity registry for autonomous agents and
/// robots. This is NOT a claim of full ERC-8004 compliance -- it borrows the standard's
/// core idea (a portable, on-chain identity record for an autonomous agent, decoupled
/// from any single application) so CipherTrust's underwriting data, and any other
/// confidential protocol, can be composed against the same agent identity instead of
/// re-deriving one per app.
contract AgentIdentityRegistry {
    struct Identity {
        address operator;
        string agentType; // e.g. "trading-bot", "delivery-robot", "drone", "depin-device"
        string metadataURI; // off-chain JSON: hardware attestation, manufacturer, firmware hash, etc.
        uint256 registeredAt;
        bool active;
    }

    address public admin;
    uint256 public nextIdentityId;
    mapping(uint256 => Identity) public identities;
    mapping(uint256 => mapping(address => bool)) public delegatedOperators;

    event IdentityRegistered(uint256 indexed identityId, address indexed operator, string agentType);
    event IdentityDeactivated(uint256 indexed identityId);
    event OperatorDelegated(uint256 indexed identityId, address indexed delegate);

    modifier onlyOperator(uint256 identityId) {
        require(
            identities[identityId].operator == msg.sender || delegatedOperators[identityId][msg.sender],
            "AgentIdentityRegistry: not operator"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerIdentity(
        address operator,
        string calldata agentType,
        string calldata metadataURI
    ) external returns (uint256 identityId) {
        identityId = nextIdentityId++;
        identities[identityId] = Identity({
            operator: operator,
            agentType: agentType,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            active: true
        });
        emit IdentityRegistered(identityId, operator, agentType);
    }

    function delegateOperator(uint256 identityId, address delegate) external onlyOperator(identityId) {
        delegatedOperators[identityId][delegate] = true;
        emit OperatorDelegated(identityId, delegate);
    }

    function deactivate(uint256 identityId) external onlyOperator(identityId) {
        identities[identityId].active = false;
        emit IdentityDeactivated(identityId);
    }

    function isActiveOperator(uint256 identityId, address who) external view returns (bool) {
        Identity storage id_ = identities[identityId];
        return id_.active && (id_.operator == who || delegatedOperators[identityId][who]);
    }
}
