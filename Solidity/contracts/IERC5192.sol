// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC5192 — Minimal Soulbound NFTs
 * @notice Interface for non-transferable (Soulbound) tokens as defined in EIP-5192.
 * @dev See https://eips.ethereum.org/EIPS/eip-5192
 */
interface IERC5192 {
    /// @notice Emitted when the locking status is changed to locked.
    /// @param tokenId The identifier of the token that was locked.
    event Locked(uint256 tokenId);

    /// @notice Emitted when the locking status is changed to unlocked.
    /// @param tokenId The identifier of the token that was unlocked.
    event Unlocked(uint256 tokenId);

    /// @notice Returns the locking status of a Soulbound Token.
    /// @dev SBTs assigned to zero address are considered invalid, and queries
    ///      about them do throw.
    /// @param tokenId The identifier of the token.
    /// @return True if the token is locked (soulbound), false otherwise.
    function locked(uint256 tokenId) external view returns (bool);
}
