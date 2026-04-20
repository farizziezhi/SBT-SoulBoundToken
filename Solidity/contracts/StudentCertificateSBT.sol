// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IERC5192.sol";

/**
 * @title StudentCertificateSBT
 * @author Jurnal Blockchain Research Team
 * @notice Soulbound Token (SBT) untuk autentikasi digital sertifikat akademik
 *         mahasiswa berbasis Blockchain Ethereum. Token bersifat non-transferable
 *         sesuai konsep Soulbound Token (Weyl, Ohlhaver & Buterin, 2022).
 * @dev Inherits ERC-721 with non-transferable enforcement via _update() override.
 *      Implements EIP-5192 (Minimal Soulbound NFTs) for standard compliance.
 *
 *      Key Design Decisions:
 *      - SBT enforcement: _update() override blocks all transfers except mint/burn
 *      - Access control: ISSUER_ROLE for minting, DEFAULT_ADMIN_ROLE for revocation
 *      - Gas optimization: calldata params, simple counter, optimizer runs=200
 *      - Pausable: Applied to mint functions only; admin can revoke during emergency
 *
 *      Network: Sepolia Testnet (chainId: 11155111)
 *      Solidity: ^0.8.20 | OpenZeppelin: v5.1.0+
 */
contract StudentCertificateSBT is
    ERC721,
    ERC721URIStorage,
    AccessControl,
    Pausable,
    IERC5192
{
    // ============================================================
    //                        CONSTANTS
    // ============================================================

    /// @notice Role identifier for certificate issuers (university admin/faculty)
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    /// @notice Maximum number of certificates per batch mint transaction
    uint256 public constant MAX_BATCH_SIZE = 50;

    // ============================================================
    //                     STATE VARIABLES
    // ============================================================

    /// @notice Auto-incrementing token ID counter
    uint256 private _nextTokenId;

    /// @notice Mapping from student address to their certificate token IDs
    mapping(address => uint256[]) private _studentCertificates;

    // ============================================================
    //                         EVENTS
    // ============================================================

    /**
     * @notice Emitted when a new certificate is minted to a student.
     * @param student The student's wallet address receiving the certificate.
     * @param tokenId The unique token ID of the minted certificate.
     * @param uri The IPFS URI containing certificate metadata.
     * @param issuer The address of the issuer who minted the certificate.
     * @param timestamp The block timestamp when the certificate was minted.
     */
    event CertificateMinted(
        address indexed student,
        uint256 indexed tokenId,
        string uri,
        address indexed issuer,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a certificate is revoked (burned) by admin.
     * @param student The student's wallet address whose certificate was revoked.
     * @param tokenId The token ID of the revoked certificate.
     * @param reason The reason for revocation (e.g., "academic fraud").
     * @param revokedBy The admin address who performed the revocation.
     * @param timestamp The block timestamp when the revocation occurred.
     */
    event CertificateRevoked(
        address indexed student,
        uint256 indexed tokenId,
        string reason,
        address indexed revokedBy,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a batch minting operation completes.
     * @param issuer The issuer who performed the batch mint.
     * @param count The number of certificates minted in the batch.
     * @param startTokenId The first token ID in the batch.
     * @param endTokenId The last token ID in the batch.
     */
    event BatchMintCompleted(
        address indexed issuer,
        uint256 count,
        uint256 startTokenId,
        uint256 endTokenId
    );

    // ============================================================
    //                        ERRORS
    // ============================================================

    /// @notice Thrown when attempting to transfer a soulbound token.
    error SoulboundTokenNonTransferable();

    /// @notice Thrown when minting to the zero address.
    error MintToZeroAddress();

    /// @notice Thrown when batch arrays have mismatched lengths.
    error ArrayLengthMismatch();

    /// @notice Thrown when batch size is zero or exceeds MAX_BATCH_SIZE.
    error InvalidBatchSize(uint256 size, uint256 maxSize);

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    /**
     * @notice Initializes the SBT contract with the deployer as admin and issuer.
     * @param defaultAdmin The address that receives DEFAULT_ADMIN_ROLE and ISSUER_ROLE.
     */
    constructor(
        address defaultAdmin
    ) ERC721("StudentCertificateSBT", "SCSBT") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ISSUER_ROLE, defaultAdmin);
    }

    // ============================================================
    //                   SBT ENFORCEMENT
    // ============================================================

    /**
     * @notice Overrides ERC-721 _update to enforce soulbound (non-transferable) behavior.
     * @dev Only allows minting (from == address(0)) and burning (to == address(0)).
     *      All other transfers are blocked with SoulboundTokenNonTransferable error.
     *      This is the core mechanism that makes tokens non-transferable per
     *      the Soulbound Token concept (Weyl, Ohlhaver & Buterin, 2022).
     * @param to The destination address.
     * @param tokenId The token ID being transferred.
     * @param auth The address authorized for the transfer.
     * @return The previous owner of the token.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);

        // Allow: minting (from == 0) and burning (to == 0)
        // Block: all other transfers (from != 0 AND to != 0)
        if (from != address(0) && to != address(0)) {
            revert SoulboundTokenNonTransferable();
        }

        return super._update(to, tokenId, auth);
    }

    // ============================================================
    //                   CORE FUNCTIONS
    // ============================================================

    /**
     * @notice Mints a single certificate SBT to a student.
     * @dev Only callable by addresses with ISSUER_ROLE. Paused state blocks this.
     *      Follows Checks-Effects-Interactions pattern.
     * @param student The student's wallet address to receive the certificate.
     * @param tokenURI_ The IPFS URI pointing to the certificate metadata JSON.
     * @return tokenId The unique token ID of the newly minted certificate.
     *
     * Requirements:
     * - Caller must have ISSUER_ROLE
     * - Contract must not be paused
     * - `student` must not be the zero address
     *
     * Emits:
     * - {CertificateMinted} with student, tokenId, URI, issuer, and timestamp
     * - {Locked} per EIP-5192 indicating the token is soulbound
     */
    function mintToStudent(
        address student,
        string memory tokenURI_
    ) external onlyRole(ISSUER_ROLE) whenNotPaused returns (uint256) {
        // Checks
        if (student == address(0)) revert MintToZeroAddress();

        // Effects
        uint256 tokenId = _nextTokenId++;
        _safeMint(student, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        _studentCertificates[student].push(tokenId);

        // Emit events
        emit CertificateMinted(
            student,
            tokenId,
            tokenURI_,
            msg.sender,
            block.timestamp
        );
        emit Locked(tokenId);

        return tokenId;
    }

    /**
     * @notice Mints certificates to multiple students in a single transaction.
     * @dev Optimized for gas with calldata parameters. Hard cap at MAX_BATCH_SIZE
     *      to prevent exceeding block gas limits.
     * @param students Array of student wallet addresses.
     * @param tokenURIs Array of IPFS URIs for each certificate's metadata.
     * @return tokenIds Array of newly minted token IDs.
     *
     * Requirements:
     * - Caller must have ISSUER_ROLE
     * - Contract must not be paused
     * - Arrays must have equal length
     * - Arrays must not be empty and length <= MAX_BATCH_SIZE
     * - No student address can be the zero address
     *
     * Emits:
     * - {CertificateMinted} for each certificate
     * - {Locked} for each certificate (EIP-5192)
     * - {BatchMintCompleted} with batch summary
     */
    function batchMint(
        address[] calldata students,
        string[] calldata tokenURIs
    ) external onlyRole(ISSUER_ROLE) whenNotPaused returns (uint256[] memory) {
        // Checks
        if (students.length != tokenURIs.length) revert ArrayLengthMismatch();
        if (students.length == 0 || students.length > MAX_BATCH_SIZE) {
            revert InvalidBatchSize(students.length, MAX_BATCH_SIZE);
        }

        // Effects
        uint256[] memory tokenIds = new uint256[](students.length);
        uint256 startTokenId = _nextTokenId;

        for (uint256 i = 0; i < students.length; i++) {
            if (students[i] == address(0)) revert MintToZeroAddress();

            uint256 tokenId = _nextTokenId++;
            _safeMint(students[i], tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            _studentCertificates[students[i]].push(tokenId);
            tokenIds[i] = tokenId;

            emit CertificateMinted(
                students[i],
                tokenId,
                tokenURIs[i],
                msg.sender,
                block.timestamp
            );
            emit Locked(tokenId);
        }

        emit BatchMintCompleted(
            msg.sender,
            students.length,
            startTokenId,
            _nextTokenId - 1
        );

        return tokenIds;
    }

    // ============================================================
    //                  REVOCATION (ADMIN ONLY)
    // ============================================================

    /**
     * @notice Revokes (burns) a student's certificate.
     * @dev Only callable by DEFAULT_ADMIN_ROLE. Intentionally NOT gated by
     *      whenNotPaused so admin can revoke during emergencies.
     * @param tokenId The token ID of the certificate to revoke.
     * @param reason The reason for revocation (stored in event log).
     *
     * Requirements:
     * - Caller must have DEFAULT_ADMIN_ROLE
     * - Token must exist
     *
     * Emits:
     * - {CertificateRevoked} with student, tokenId, reason, admin, and timestamp
     */
    function revokeCertificate(
        uint256 tokenId,
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address student = ownerOf(tokenId); // Reverts if token doesn't exist
        _burn(tokenId);

        emit CertificateRevoked(
            student,
            tokenId,
            reason,
            msg.sender,
            block.timestamp
        );
    }

    // ============================================================
    //                    VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Returns all certificate token IDs owned by a student.
     * @dev Note: Revoked certificates will still appear in this array but
     *      ownerOf() will revert for them. Frontend should handle this.
     * @param student The student's wallet address.
     * @return Array of token IDs associated with the student.
     */
    function getStudentCertificates(
        address student
    ) external view returns (uint256[] memory) {
        return _studentCertificates[student];
    }

    /**
     * @notice Returns the number of certificates ever issued to a student.
     * @param student The student's wallet address.
     * @return The count of certificates (including revoked ones).
     */
    function getStudentCertificateCount(
        address student
    ) external view returns (uint256) {
        return _studentCertificates[student].length;
    }

    /**
     * @notice Returns the total number of certificates ever minted.
     * @return The total count (includes burned/revoked tokens).
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // ============================================================
    //               EIP-5192 IMPLEMENTATION
    // ============================================================

    /**
     * @notice Returns whether a token is locked (soulbound).
     * @dev Always returns true for existing tokens, as all SBTs are permanently locked.
     *      Reverts for non-existent tokens per EIP-5192 specification.
     * @param tokenId The token ID to query.
     * @return True (always, for existing tokens).
     */
    function locked(uint256 tokenId) external view override returns (bool) {
        // ownerOf reverts for non-existent tokens (EIP-5192 requirement)
        ownerOf(tokenId);
        return true;
    }

    // ============================================================
    //                   ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Pauses all minting operations.
     * @dev Only callable by DEFAULT_ADMIN_ROLE. Does NOT affect revocation.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses minting operations.
     * @dev Only callable by DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ============================================================
    //                  REQUIRED OVERRIDES
    // ============================================================

    /**
     * @notice Returns the token URI for a given token ID.
     * @dev Override required by Solidity for ERC721 + ERC721URIStorage.
     * @param tokenId The token ID to query.
     * @return The IPFS URI string containing certificate metadata.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Checks interface support for ERC-721, ERC-5192, and AccessControl.
     * @dev Override required by Solidity for multiple inheritance.
     *      Includes EIP-5192 interface ID (0xb45a3c0e) for standard compliance.
     * @param interfaceId The interface identifier to check.
     * @return True if the interface is supported.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
