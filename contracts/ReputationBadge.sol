// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title ReputationBadge
/// @notice Soulbound (non-transferable) ERC-721 badge representing an autonomous agent's
/// *publicly revealed* trust tier -- never the exact encrypted score. CipherTrust's core
/// contract calls mintOrUpgrade only after the operator opts in to a confidential tier
/// reveal, so the badge is a public, composable attestation that other protocols
/// (insurers, marketplaces, DAOs) can check with a single view call, with zero on-chain
/// exposure of the underlying telemetry or exact score.
contract ReputationBadge is ERC721 {
    enum Tier {
        Unrated,
        Low,
        Medium,
        High
    }

    address public admin;
    address public cipherTrust;
    mapping(uint256 => Tier) public tierOf; // agentId => tier
    mapping(uint256 => bool) private _minted;

    event CipherTrustSet(address indexed cipherTrust);
    event BadgeUpgraded(uint256 indexed agentId, Tier tier);

    modifier onlyAdmin() {
        require(msg.sender == admin, "ReputationBadge: not admin");
        _;
    }

    modifier onlyCipherTrust() {
        require(msg.sender == cipherTrust, "ReputationBadge: not CipherTrust");
        _;
    }

    constructor() ERC721("CipherTrust Reputation Badge", "CTRUST") {
        admin = msg.sender;
    }

    function setCipherTrust(address cipherTrust_) external onlyAdmin {
        require(cipherTrust == address(0), "ReputationBadge: already set");
        cipherTrust = cipherTrust_;
        emit CipherTrustSet(cipherTrust_);
    }

    function mintOrUpgrade(uint256 agentId, address operator, uint8 tier) external onlyCipherTrust {
        if (!_minted[agentId]) {
            _minted[agentId] = true;
            _safeMint(operator, agentId);
        }
        tierOf[agentId] = Tier(tier);
        emit BadgeUpgraded(agentId, Tier(tier));
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Tier tier = tierOf[tokenId];
        string memory tierName = tier == Tier.High ? "High" : tier == Tier.Medium ? "Medium" : tier == Tier.Low
            ? "Low"
            : "Unrated";
        return
            string(
                abi.encodePacked(
                    "data:application/json;utf8,{\"name\":\"CipherTrust Agent #",
                    _toString(tokenId),
                    "\",\"attributes\":[{\"trait_type\":\"Trust Tier\",\"value\":\"",
                    tierName,
                    "\"}]}"
                )
            );
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "ReputationBadge: soulbound, non-transferable");
        return super._update(to, tokenId, auth);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
