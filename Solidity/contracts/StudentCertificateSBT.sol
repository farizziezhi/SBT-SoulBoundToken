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
 *      - On-chain metadata: CertificateData struct stores certType, issuedAt, score
 *      - Access control: ISSUER_ROLE for minting, DEFAULT_ADMIN_ROLE for revocation
 *      - Gas optimization: calldata params, packed struct, unchecked increment
 *      - Pausable: Applied to mint functions only; admin can revoke during emergency
 *
 *      Network: Sepolia Testnet (chainId: 11155111)
 *      Solidity: ^0.8.24 | OpenZeppelin: v5.1.0+
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
    //                         STRUCTS
    // ============================================================

    /**
     * @notice On-chain metadata for each certificate (packed for gas optimization).
     * @dev Slot layout (256-bit):
     *      [0..63]   issuedAt  — Unix timestamp (uint64 ~= 584 billion years)
     *      [64..95]  certType  — Certificate category code (uint32)
     *      [96..127] score     — Achievement score 0-100 (uint32)
     *      [128]     isRevoked — Revocation flag (bool, 8-bit)
     *      ipfsCID stored separately (dynamic string, always its own slot)
     */
    struct CertificateData {
        uint64 issuedAt;   // Unix timestamp when certificate was issued
        uint32 certType;   // Category: 001=Organisasi, 002=Kompetisi, 003=Pelatihan, etc.
        uint32 score;      // Achievement score (0-100, 0 if not applicable)
        bool   isRevoked;  // True if certificate has been revoked by admin
        string ipfsCID;    // IPFS Content Identifier for full metadata JSON
    }

    // ============================================================
    //                     STATE VARIABLES
    // ============================================================

    /// @notice Auto-incrementing token ID counter
    uint256 private _nextTokenId;

    /// @notice On-chain certificate data per token ID
    mapping(uint256 => CertificateData) private _certificates;

    /// @notice Mapping from student address to their certificate token IDs
    mapping(address => uint256[]) private _studentCertificates;

    // ============================================================
    //                         EVENTS
    // ============================================================

    /**
     * @notice Emitted when a new certificate is minted to a student.
     * @param student   The student's wallet address receiving the certificate.
     * @param tokenId   The unique token ID of the minted certificate.
     * @param uri       The IPFS URI containing certificate metadata.
     * @param issuer    The address of the issuer who minted the certificate.
     * @param timestamp The block timestamp when the certificate was minted.
     */
    event CertificateMinted(
        address indexed student,
        uint256 indexed tokenId,
        string  uri,
        address indexed issuer,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a certificate is revoked (burned) by admin.
     * @param student   The student's wallet address whose certificate was revoked.
     * @param tokenId   The token ID of the revoked certificate.
     * @param reason    The reason for revocation (e.g., "academic fraud").
     * @param revokedBy The admin address who performed the revocation.
     * @param timestamp The block timestamp when the revocation occurred.
     */
    event CertificateRevoked(
        address indexed student,
        uint256 indexed tokenId,
        string  reason,
        address indexed revokedBy,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a batch minting operation completes.
     * @param issuer      The issuer who performed the batch mint.
     * @param count       The number of certificates minted in the batch.
     * @param startTokenId The first token ID in the batch.
     * @param endTokenId   The last token ID in the batch.
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

    /// @notice Thrown when querying a non-existent token.
    error TokenDoesNotExist(uint256 tokenId);

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    /**
     * @notice Initializes the SBT contract with the deployer as admin and issuer.
     * @param defaultAdmin The address that receives DEFAULT_ADMIN_ROLE and ISSUER_ROLE.
     */
    constructor(address defaultAdmin) ERC721("StudentCertificateSBT", "SCSBT") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ISSUER_ROLE, defaultAdmin);
    }

    // ============================================================
    //                   SBT ENFORCEMENT (OZ v5)
    // ============================================================

    /**
     * @notice Overrides ERC-721 _update() to enforce soulbound behavior (OZ v5 pattern).
     * @dev Only allows minting (from == address(0)) and burning (to == address(0)).
     *      All other transfers are blocked with SoulboundTokenNonTransferable error.
     *      This is the canonical OZ v5 approach — replaces the v4 pattern of
     *      overriding transferFrom/safeTransferFrom directly.
     * @param to     The destination address.
     * @param tokenId The token ID being transferred.
     * @param auth   The address authorized for the transfer.
     * @return The previous owner of the token.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);
        // Allow: mint (from == 0) and burn (to == 0)
        // Block: all peer-to-peer transfers
        if (from != address(0) && to != address(0)) {
            revert SoulboundTokenNonTransferable();
        }
        return super._update(to, tokenId, auth);
    }

    // ============================================================
    //                   CORE MINT FUNCTIONS
    // ============================================================

    /**
     * @notice Mints a single certificate SBT to a student with on-chain metadata.
     * @dev Follows Checks-Effects-Interactions pattern.
     *      Uses calldata for tokenURI_ and ipfsCID_ to save gas.
     * @param student    The student's wallet address to receive the certificate.
     * @param tokenURI_  The IPFS URI pointing to the certificate metadata JSON.
     * @param certType_  Certificate category code (e.g. 1=Organisasi, 2=Kompetisi).
     * @param score_     Achievement score 0-100 (use 0 if not applicable).
     * @param ipfsCID_   Raw IPFS Content Identifier (e.g. "QmXoypiz...").
     * @return tokenId   The unique token ID of the newly minted certificate.
     *
     * Emits: {CertificateMinted}, {Locked}
     */
    function mintToStudent(
        address        student,
        string calldata tokenURI_,
        uint32         certType_,
        uint32         score_,
        string calldata ipfsCID_
    ) external onlyRole(ISSUER_ROLE) whenNotPaused returns (uint256) {
        // Checks
        if (student == address(0)) revert MintToZeroAddress();

        // Effects
        uint256 tokenId = _nextTokenId;
        unchecked { _nextTokenId++; } // safe: overflow at 2^256 tokens

        _certificates[tokenId] = CertificateData({
            issuedAt:  uint64(block.timestamp),
            certType:  certType_,
            score:     score_,
            isRevoked: false,
            ipfsCID:   ipfsCID_
        });
        _studentCertificates[student].push(tokenId);

        _safeMint(student, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        emit CertificateMinted(student, tokenId, tokenURI_, msg.sender, block.timestamp);
        emit Locked(tokenId);

        return tokenId;
    }

    /**
     * @notice Mints certificates to multiple students in a single transaction.
     * @dev Hard cap at MAX_BATCH_SIZE (50) to prevent exceeding block gas limits.
     *      All arrays must have equal length.
     * @param students   Array of student wallet addresses.
     * @param tokenURIs  Array of IPFS URIs for each certificate's metadata.
     * @param certTypes  Array of certificate category codes.
     * @param scores     Array of achievement scores (0-100).
     * @param ipfsCIDs   Array of raw IPFS Content Identifiers.
     * @return tokenIds  Array of newly minted token IDs.
     *
     * Emits: {CertificateMinted} per token, {Locked} per token, {BatchMintCompleted}
     */
    function batchMint(
        address[]  calldata students,
        string[]   calldata tokenURIs,
        uint32[]   calldata certTypes,
        uint32[]   calldata scores,
        string[]   calldata ipfsCIDs
    ) external onlyRole(ISSUER_ROLE) whenNotPaused returns (uint256[] memory) {
        uint256 len = students.length;

        // Checks
        if (
            len != tokenURIs.length ||
            len != certTypes.length ||
            len != scores.length   ||
            len != ipfsCIDs.length
        ) revert ArrayLengthMismatch();

        if (len == 0 || len > MAX_BATCH_SIZE)
            revert InvalidBatchSize(len, MAX_BATCH_SIZE);

        // Effects
        uint256[] memory tokenIds = new uint256[](len);
        uint256 startTokenId = _nextTokenId;

        for (uint256 i = 0; i < len;) {
            if (students[i] == address(0)) revert MintToZeroAddress();

            uint256 tokenId = _nextTokenId;
            unchecked { _nextTokenId++; }

            _certificates[tokenId] = CertificateData({
                issuedAt:  uint64(block.timestamp),
                certType:  certTypes[i],
                score:     scores[i],
                isRevoked: false,
                ipfsCID:   ipfsCIDs[i]
            });
            _studentCertificates[students[i]].push(tokenId);

            _safeMint(students[i], tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            tokenIds[i] = tokenId;

            emit CertificateMinted(students[i], tokenId, tokenURIs[i], msg.sender, block.timestamp);
            emit Locked(tokenId);

            unchecked { i++; }
        }

        emit BatchMintCompleted(msg.sender, len, startTokenId, _nextTokenId - 1);
        return tokenIds;
    }

    // ============================================================
    //                  REVOCATION (ADMIN ONLY)
    // ============================================================

    /**
     * @notice Revokes (burns) a student's certificate.
     * @dev Intentionally NOT gated by whenNotPaused so admin can revoke
     *      during emergencies. Sets isRevoked=true before burning for
     *      event log completeness.
     * @param tokenId The token ID of the certificate to revoke.
     * @param reason  The reason for revocation (stored in event log).
     *
     * Emits: {CertificateRevoked}
     */
    function revokeCertificate(
        uint256        tokenId,
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address student = ownerOf(tokenId); // Reverts if token doesn't exist

        // Mark revoked before burn (for completeness)
        _certificates[tokenId].isRevoked = true;
        _burn(tokenId);

        emit CertificateRevoked(student, tokenId, reason, msg.sender, block.timestamp);
    }

    // ============================================================
    //                    VIEW / VERIFY FUNCTIONS
    // ============================================================

    /**
     * @notice Verifies and returns full on-chain data for a certificate.
     * @dev This is the primary verification function — zero gas cost for callers
     *      (view function). Used by employers, LPDP, and other verifiers.
     * @param tokenId The token ID to verify.
     * @return owner      Current owner (student) wallet address.
     * @return certType   Certificate category code.
     * @return issuedAt   Unix timestamp of issuance.
     * @return score      Achievement score (0-100).
     * @return isRevoked  Whether the certificate has been revoked.
     * @return ipfsCID    IPFS Content Identifier for full metadata.
     */
    function verifyCertificate(uint256 tokenId)
        external
        view
        returns (
            address owner,
            uint32  certType,
            uint64  issuedAt,
            uint32  score,
            bool    isRevoked,
            string  memory ipfsCID
        )
    {
        // ownerOf reverts for non-existent tokens
        owner = ownerOf(tokenId);
        CertificateData storage cert = _certificates[tokenId];
        return (
            owner,
            cert.certType,
            cert.issuedAt,
            cert.score,
            cert.isRevoked,
            cert.ipfsCID
        );
    }

    /**
     * @notice Returns all certificate token IDs ever issued to a student.
     * @dev Note: Revoked (burned) tokens still appear in this array but
     *      ownerOf() will revert for them. Frontend should handle gracefully.
     * @param student The student's wallet address.
     * @return Array of token IDs associated with the student.
     */
    function getStudentCertificates(address student)
        external
        view
        returns (uint256[] memory)
    {
        return _studentCertificates[student];
    }

    /**
     * @notice Returns the number of certificates ever issued to a student.
     * @param student The student's wallet address.
     * @return Count (includes revoked/burned tokens).
     */
    function getStudentCertificateCount(address student)
        external
        view
        returns (uint256)
    {
        return _studentCertificates[student].length;
    }

    /**
     * @notice Returns the total number of certificates ever minted.
     * @return Counter value (includes burned/revoked tokens).
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // ============================================================
    //               EIP-5192 IMPLEMENTATION
    // ============================================================

    /**
     * @notice Returns whether a token is locked (soulbound).
     * @dev Always returns true for existing tokens per EIP-5192.
     *      Reverts for non-existent tokens per EIP-5192 specification.
     * @param tokenId The token ID to query.
     * @return True always, for existing tokens.
     */
    function locked(uint256 tokenId) external view override returns (bool) {
        ownerOf(tokenId); // Reverts if non-existent
        return true;
    }

    // ============================================================
    //                   ADMIN FUNCTIONS
    // ============================================================

    /// @notice Pauses all minting. Does NOT affect revocation.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses minting.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ============================================================
    //                  REQUIRED OVERRIDES
    // ============================================================

    /**
     * @notice Returns the token URI for a given token ID.
     * @dev Override required by Solidity for ERC721 + ERC721URIStorage.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Checks interface support (ERC-721, EIP-5192, AccessControl).
     * @dev EIP-5192 interface ID = 0xb45a3c0e
     */
    function supportsInterface(bytes4 interfaceId)
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
