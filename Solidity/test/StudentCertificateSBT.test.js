// test/StudentCertificateSBT.test.js
// Comprehensive test suite for StudentCertificateSBT v2
// Coverage target: 95%+

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StudentCertificateSBT", function () {
  let sbt;
  let admin, issuer, student1, student2, student3, unauthorized;

  // Sample URIs
  const SAMPLE_URI_1 = "ipfs://QmHash1/metadata.json";
  const SAMPLE_URI_2 = "ipfs://QmHash2/metadata.json";
  const SAMPLE_URI_3 = "ipfs://QmHash3/metadata.json";

  // Sample IPFS CIDs (raw, without ipfs:// prefix)
  const CID_1 = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
  const CID_2 = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
  const CID_3 = "QmZoiJNAvCBRopePLCFjPDYsGMWGo2VHCJ8E4pTCGBQnWE";

  // Certificate type codes (matching SKPI categories)
  const CERT_TYPE_ORGANISASI  = 1; // Organisasi Kemahasiswaan
  const CERT_TYPE_KOMPETISI   = 2; // Kompetisi Akademik
  const CERT_TYPE_PELATIHAN   = 3; // Pelatihan & Workshop
  const CERT_TYPE_PENGABDIAN  = 4; // Pengabdian Masyarakat
  const CERT_TYPE_PRESTASI    = 5; // Prestasi Olahraga/Seni
  const CERT_TYPE_SERTIFIKASI = 6; // Sertifikasi Profesi

  beforeEach(async function () {
    [admin, issuer, student1, student2, student3, unauthorized] =
      await ethers.getSigners();

    const StudentCertificateSBT =
      await ethers.getContractFactory("StudentCertificateSBT");
    sbt = await StudentCertificateSBT.deploy(admin.address);
    await sbt.waitForDeployment();

    // Grant ISSUER_ROLE to issuer account
    const ISSUER_ROLE = await sbt.ISSUER_ROLE();
    await sbt.connect(admin).grantRole(ISSUER_ROLE, issuer.address);
  });

  // ============================================================
  //                    DEPLOYMENT TESTS
  // ============================================================

  describe("Deployment", function () {
    it("should set correct token name and symbol", async function () {
      expect(await sbt.name()).to.equal("StudentCertificateSBT");
      expect(await sbt.symbol()).to.equal("SCSBT");
    });

    it("should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await sbt.DEFAULT_ADMIN_ROLE();
      expect(await sbt.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should grant ISSUER_ROLE to deployer", async function () {
      const ISSUER_ROLE = await sbt.ISSUER_ROLE();
      expect(await sbt.hasRole(ISSUER_ROLE, admin.address)).to.be.true;
    });

    it("should start with zero total minted", async function () {
      expect(await sbt.totalMinted()).to.equal(0);
    });

    it("should have correct MAX_BATCH_SIZE", async function () {
      expect(await sbt.MAX_BATCH_SIZE()).to.equal(50);
    });
  });

  // ============================================================
  //                   MINT SINGLE TESTS
  // ============================================================

  describe("mintToStudent", function () {
    it("should mint a certificate with on-chain metadata", async function () {
      await sbt.connect(issuer).mintToStudent(
        student1.address,
        SAMPLE_URI_1,
        CERT_TYPE_ORGANISASI,
        85,
        CID_1
      );

      expect(await sbt.ownerOf(0)).to.equal(student1.address);
      expect(await sbt.tokenURI(0)).to.equal(SAMPLE_URI_1);
      expect(await sbt.totalMinted()).to.equal(1);
    });

    it("should store correct on-chain CertificateData", async function () {
      await sbt.connect(issuer).mintToStudent(
        student1.address,
        SAMPLE_URI_1,
        CERT_TYPE_KOMPETISI,
        92,
        CID_1
      );

      const [owner, certType, issuedAt, score, isRevoked, ipfsCID] =
        await sbt.verifyCertificate(0);

      expect(owner).to.equal(student1.address);
      expect(certType).to.equal(CERT_TYPE_KOMPETISI);
      expect(issuedAt).to.be.greaterThan(0n);
      expect(score).to.equal(92);
      expect(isRevoked).to.be.false;
      expect(ipfsCID).to.equal(CID_1);
    });

    it("should emit CertificateMinted event", async function () {
      await expect(
        sbt.connect(issuer).mintToStudent(
          student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 80, CID_1
        )
      )
        .to.emit(sbt, "CertificateMinted")
        .withArgs(
          student1.address,
          0,
          SAMPLE_URI_1,
          issuer.address,
          (value) => value > 0n
        );
    });

    it("should emit Locked event (EIP-5192)", async function () {
      await expect(
        sbt.connect(issuer).mintToStudent(
          student1.address, SAMPLE_URI_1, CERT_TYPE_PELATIHAN, 75, CID_1
        )
      )
        .to.emit(sbt, "Locked")
        .withArgs(0);
    });

    it("should track student certificates", async function () {
      await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 85, CID_1
      );
      await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_2, CERT_TYPE_KOMPETISI, 90, CID_2
      );

      const certs = await sbt.getStudentCertificates(student1.address);
      expect(certs.length).to.equal(2);
      expect(certs[0]).to.equal(0);
      expect(certs[1]).to.equal(1);
    });

    it("should support score=0 for non-scored certificates", async function () {
      await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_1, CERT_TYPE_PENGABDIAN, 0, CID_1
      );

      const [, , , score] = await sbt.verifyCertificate(0);
      expect(score).to.equal(0);
    });

    it("should revert when minting to zero address", async function () {
      await expect(
        sbt.connect(issuer).mintToStudent(
          ethers.ZeroAddress, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 80, CID_1
        )
      ).to.be.revertedWithCustomError(sbt, "MintToZeroAddress");
    });

    it("should revert when called by unauthorized address", async function () {
      await expect(
        sbt.connect(unauthorized).mintToStudent(
          student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 80, CID_1
        )
      ).to.be.reverted;
    });

    it("should report gas for single mint", async function () {
      const tx = await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 85, CID_1
      );
      const receipt = await tx.wait();
      console.log(`    Gas used (mintToStudent): ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(300000n);
    });
  });

  // ============================================================
  //                   BATCH MINT TESTS
  // ============================================================

  describe("batchMint", function () {
    it("should mint multiple certificates with on-chain metadata", async function () {
      const students   = [student1.address, student2.address, student3.address];
      const uris       = [SAMPLE_URI_1, SAMPLE_URI_2, SAMPLE_URI_3];
      const certTypes  = [CERT_TYPE_ORGANISASI, CERT_TYPE_KOMPETISI, CERT_TYPE_PELATIHAN];
      const scores     = [85, 92, 78];
      const cids       = [CID_1, CID_2, CID_3];

      await sbt.connect(issuer).batchMint(students, uris, certTypes, scores, cids);

      expect(await sbt.ownerOf(0)).to.equal(student1.address);
      expect(await sbt.ownerOf(1)).to.equal(student2.address);
      expect(await sbt.ownerOf(2)).to.equal(student3.address);
      expect(await sbt.totalMinted()).to.equal(3);
    });

    it("should store correct CertificateData for each token in batch", async function () {
      const students   = [student1.address, student2.address];
      const uris       = [SAMPLE_URI_1, SAMPLE_URI_2];
      const certTypes  = [CERT_TYPE_PRESTASI, CERT_TYPE_SERTIFIKASI];
      const scores     = [95, 0];
      const cids       = [CID_1, CID_2];

      await sbt.connect(issuer).batchMint(students, uris, certTypes, scores, cids);

      const [, ct1, , sc1, rev1, cid1] = await sbt.verifyCertificate(0);
      const [, ct2, , sc2, rev2, cid2] = await sbt.verifyCertificate(1);

      expect(ct1).to.equal(CERT_TYPE_PRESTASI);
      expect(sc1).to.equal(95);
      expect(rev1).to.be.false;
      expect(cid1).to.equal(CID_1);

      expect(ct2).to.equal(CERT_TYPE_SERTIFIKASI);
      expect(sc2).to.equal(0);
      expect(rev2).to.be.false;
      expect(cid2).to.equal(CID_2);
    });

    it("should emit BatchMintCompleted event", async function () {
      const students  = [student1.address, student2.address];
      const uris      = [SAMPLE_URI_1, SAMPLE_URI_2];
      const certTypes = [CERT_TYPE_ORGANISASI, CERT_TYPE_KOMPETISI];
      const scores    = [85, 90];
      const cids      = [CID_1, CID_2];

      await expect(
        sbt.connect(issuer).batchMint(students, uris, certTypes, scores, cids)
      )
        .to.emit(sbt, "BatchMintCompleted")
        .withArgs(issuer.address, 2, 0, 1);
    });

    it("should revert on array length mismatch (students vs uris)", async function () {
      await expect(
        sbt.connect(issuer).batchMint(
          [student1.address, student2.address],
          [SAMPLE_URI_1],          // length mismatch
          [CERT_TYPE_ORGANISASI, CERT_TYPE_KOMPETISI],
          [85, 90],
          [CID_1, CID_2]
        )
      ).to.be.revertedWithCustomError(sbt, "ArrayLengthMismatch");
    });

    it("should revert on array length mismatch (certTypes)", async function () {
      await expect(
        sbt.connect(issuer).batchMint(
          [student1.address],
          [SAMPLE_URI_1],
          [],                       // length mismatch
          [85],
          [CID_1]
        )
      ).to.be.revertedWithCustomError(sbt, "ArrayLengthMismatch");
    });

    it("should revert on empty arrays", async function () {
      await expect(
        sbt.connect(issuer).batchMint([], [], [], [], [])
      ).to.be.revertedWithCustomError(sbt, "InvalidBatchSize");
    });

    it("should revert when batch exceeds MAX_BATCH_SIZE", async function () {
      const n         = 51;
      const students  = Array(n).fill(student1.address);
      const uris      = Array(n).fill(SAMPLE_URI_1);
      const certTypes = Array(n).fill(CERT_TYPE_ORGANISASI);
      const scores    = Array(n).fill(80);
      const cids      = Array(n).fill(CID_1);

      await expect(
        sbt.connect(issuer).batchMint(students, uris, certTypes, scores, cids)
      ).to.be.revertedWithCustomError(sbt, "InvalidBatchSize");
    });

    it("should revert when any student is zero address", async function () {
      await expect(
        sbt.connect(issuer).batchMint(
          [student1.address, ethers.ZeroAddress],
          [SAMPLE_URI_1, SAMPLE_URI_2],
          [CERT_TYPE_ORGANISASI, CERT_TYPE_KOMPETISI],
          [85, 90],
          [CID_1, CID_2]
        )
      ).to.be.revertedWithCustomError(sbt, "MintToZeroAddress");
    });

    it("should report gas for batch of 10", async function () {
      const n         = 10;
      const students  = Array(n).fill(student1.address);
      const uris      = Array(n).fill(SAMPLE_URI_1);
      const certTypes = Array(n).fill(CERT_TYPE_PELATIHAN);
      const scores    = Array(n).fill(75);
      const cids      = Array(n).fill(CID_1);

      const tx = await sbt.connect(issuer).batchMint(
        students, uris, certTypes, scores, cids
      );
      const receipt = await tx.wait();
      console.log(`    Gas used (batchMint x10): ${receipt.gasUsed.toString()}`);
    });
  });

  // ============================================================
  //              SOULBOUND (NON-TRANSFERABLE) TESTS
  // ============================================================

  describe("Soulbound (Non-Transferable) — _update() override", function () {
    beforeEach(async function () {
      await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 85, CID_1
      );
    });

    it("should revert on transferFrom", async function () {
      await expect(
        sbt.connect(student1).transferFrom(student1.address, student2.address, 0)
      ).to.be.revertedWithCustomError(sbt, "SoulboundTokenNonTransferable");
    });

    it("should revert on safeTransferFrom", async function () {
      await expect(
        sbt.connect(student1)
          ["safeTransferFrom(address,address,uint256)"](
            student1.address, student2.address, 0
          )
      ).to.be.revertedWithCustomError(sbt, "SoulboundTokenNonTransferable");
    });

    it("should revert on safeTransferFrom with data", async function () {
      await expect(
        sbt.connect(student1)
          ["safeTransferFrom(address,address,uint256,bytes)"](
            student1.address, student2.address, 0, "0x"
          )
      ).to.be.revertedWithCustomError(sbt, "SoulboundTokenNonTransferable");
    });

    it("should revert transfer even when token is approved", async function () {
      await sbt.connect(student1).approve(student2.address, 0);
      await expect(
        sbt.connect(student2).transferFrom(student1.address, student2.address, 0)
      ).to.be.revertedWithCustomError(sbt, "SoulboundTokenNonTransferable");
    });

    it("should revert transfer even with setApprovalForAll", async function () {
      await sbt.connect(student1).setApprovalForAll(student2.address, true);
      await expect(
        sbt.connect(student2).transferFrom(student1.address, student2.address, 0)
      ).to.be.revertedWithCustomError(sbt, "SoulboundTokenNonTransferable");
    });

    it("token should still belong to original student after all transfer attempts", async function () {
      try {
        await sbt.connect(student1).transferFrom(student1.address, student2.address, 0);
      } catch (_) {}
      expect(await sbt.ownerOf(0)).to.equal(student1.address);
    });
  });

  // ============================================================
  //               VERIFY CERTIFICATE TESTS
  // ============================================================

  describe("verifyCertificate", function () {
    it("should return complete on-chain certificate data", async function () {
      await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_1, CERT_TYPE_KOMPETISI, 95, CID_1
      );

      const [owner, certType, issuedAt, score, isRevoked, ipfsCID] =
        await sbt.verifyCertificate(0);

      expect(owner).to.equal(student1.address);
      expect(certType).to.equal(CERT_TYPE_KOMPETISI);
      expect(issuedAt).to.be.greaterThan(0n);
      expect(score).to.equal(95);
      expect(isRevoked).to.be.false;
      expect(ipfsCID).to.equal(CID_1);
    });

    it("should revert for non-existent token", async function () {
      await expect(sbt.verifyCertificate(999)).to.be.reverted;
    });

    it("should return isRevoked=true after admin revokes", async function () {
      await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 80, CID_1
      );

      // Manually check isRevoked before revoke
      const [, , , , beforeRevoke] = await sbt.verifyCertificate(0);
      expect(beforeRevoke).to.be.false;

      // Revoke sets isRevoked=true then burns — ownerOf will revert after burn
      await sbt.connect(admin).revokeCertificate(0, "test");

      // After burn, verifyCertificate should revert (token no longer exists)
      await expect(sbt.verifyCertificate(0)).to.be.reverted;
    });
  });

  // ============================================================
  //                  EIP-5192 TESTS
  // ============================================================

  describe("EIP-5192 (Soulbound Interface)", function () {
    it("should return locked=true for existing token", async function () {
      await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 80, CID_1
      );
      expect(await sbt.locked(0)).to.be.true;
    });

    it("should revert locked() for non-existent token", async function () {
      await expect(sbt.locked(999)).to.be.reverted;
    });

    it("should support ERC-5192 interface (0xb45a3c0e)", async function () {
      expect(await sbt.supportsInterface("0xb45a3c0e")).to.be.true;
    });

    it("should support ERC-721 interface (0x80ac58cd)", async function () {
      expect(await sbt.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("should support AccessControl interface (0x7965db0b)", async function () {
      expect(await sbt.supportsInterface("0x7965db0b")).to.be.true;
    });
  });

  // ============================================================
  //                  REVOCATION TESTS
  // ============================================================

  describe("revokeCertificate", function () {
    beforeEach(async function () {
      await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 85, CID_1
      );
    });

    it("should burn the certificate (ownerOf reverts after burn)", async function () {
      await sbt.connect(admin).revokeCertificate(0, "academic fraud detected");
      await expect(sbt.ownerOf(0)).to.be.reverted;
    });

    it("should emit CertificateRevoked event", async function () {
      await expect(
        sbt.connect(admin).revokeCertificate(0, "academic fraud detected")
      )
        .to.emit(sbt, "CertificateRevoked")
        .withArgs(
          student1.address,
          0,
          "academic fraud detected",
          admin.address,
          (value) => value > 0n
        );
    });

    it("should revert when called by non-admin (issuer)", async function () {
      await expect(
        sbt.connect(issuer).revokeCertificate(0, "attempt by issuer")
      ).to.be.reverted;
    });

    it("should revert when called by unauthorized", async function () {
      await expect(
        sbt.connect(unauthorized).revokeCertificate(0, "attempt")
      ).to.be.reverted;
    });

    it("should revert when token does not exist", async function () {
      await expect(
        sbt.connect(admin).revokeCertificate(999, "nonexistent")
      ).to.be.reverted;
    });

    it("should work even when contract is paused", async function () {
      await sbt.connect(admin).pause();
      await expect(
        sbt.connect(admin).revokeCertificate(0, "revoke during emergency")
      ).to.not.be.reverted;
    });
  });

  // ============================================================
  //                    PAUSABLE TESTS
  // ============================================================

  describe("Pausable", function () {
    it("should pause mintToStudent", async function () {
      await sbt.connect(admin).pause();
      await expect(
        sbt.connect(issuer).mintToStudent(
          student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 80, CID_1
        )
      ).to.be.revertedWithCustomError(sbt, "EnforcedPause");
    });

    it("should pause batchMint", async function () {
      await sbt.connect(admin).pause();
      await expect(
        sbt.connect(issuer).batchMint(
          [student1.address], [SAMPLE_URI_1],
          [CERT_TYPE_ORGANISASI], [80], [CID_1]
        )
      ).to.be.revertedWithCustomError(sbt, "EnforcedPause");
    });

    it("should unpause and allow minting again", async function () {
      await sbt.connect(admin).pause();
      await sbt.connect(admin).unpause();
      await expect(
        sbt.connect(issuer).mintToStudent(
          student1.address, SAMPLE_URI_1, CERT_TYPE_PELATIHAN, 75, CID_1
        )
      ).to.not.be.reverted;
    });

    it("should revert pause from non-admin", async function () {
      await expect(sbt.connect(unauthorized).pause()).to.be.reverted;
    });

    it("should revert unpause from non-admin", async function () {
      await sbt.connect(admin).pause();
      await expect(sbt.connect(unauthorized).unpause()).to.be.reverted;
    });
  });

  // ============================================================
  //                  VIEW FUNCTIONS TESTS
  // ============================================================

  describe("View Functions", function () {
    it("should return correct student certificate count", async function () {
      for (let i = 0; i < 3; i++) {
        await sbt.connect(issuer).mintToStudent(
          student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 80, CID_1
        );
      }
      expect(await sbt.getStudentCertificateCount(student1.address)).to.equal(3);
    });

    it("should return zero for student with no certificates", async function () {
      expect(await sbt.getStudentCertificateCount(student2.address)).to.equal(0);
    });

    it("should return empty array for student with no certificates", async function () {
      const certs = await sbt.getStudentCertificates(student2.address);
      expect(certs.length).to.equal(0);
    });

    it("totalMinted should NOT decrease after revocation", async function () {
      await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 85, CID_1
      );
      await sbt.connect(issuer).mintToStudent(
        student2.address, SAMPLE_URI_2, CERT_TYPE_KOMPETISI, 90, CID_2
      );
      expect(await sbt.totalMinted()).to.equal(2);

      await sbt.connect(admin).revokeCertificate(0, "test");
      expect(await sbt.totalMinted()).to.equal(2); // counter never decrements
    });
  });

  // ============================================================
  //                ACCESS CONTROL TESTS
  // ============================================================

  describe("Access Control", function () {
    it("should allow admin to grant ISSUER_ROLE", async function () {
      const ISSUER_ROLE = await sbt.ISSUER_ROLE();
      await sbt.connect(admin).grantRole(ISSUER_ROLE, unauthorized.address);
      expect(await sbt.hasRole(ISSUER_ROLE, unauthorized.address)).to.be.true;
    });

    it("should allow admin to revoke ISSUER_ROLE", async function () {
      const ISSUER_ROLE = await sbt.ISSUER_ROLE();
      await sbt.connect(admin).revokeRole(ISSUER_ROLE, issuer.address);
      expect(await sbt.hasRole(ISSUER_ROLE, issuer.address)).to.be.false;
    });

    it("should prevent non-admin from granting roles", async function () {
      const ISSUER_ROLE = await sbt.ISSUER_ROLE();
      await expect(
        sbt.connect(unauthorized).grantRole(ISSUER_ROLE, unauthorized.address)
      ).to.be.reverted;
    });

    it("revoked issuer should no longer be able to mint", async function () {
      const ISSUER_ROLE = await sbt.ISSUER_ROLE();
      await sbt.connect(admin).revokeRole(ISSUER_ROLE, issuer.address);
      await expect(
        sbt.connect(issuer).mintToStudent(
          student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 80, CID_1
        )
      ).to.be.reverted;
    });
  });

  // ============================================================
  //               GAS ESTIMATION SUMMARY
  // ============================================================

  describe("Gas Estimation Summary", function () {
    it("should log gas costs for all key functions", async function () {
      console.log("\n    ╔══════════════════════════════════════════════════╗");
      console.log("    ║         GAS CONSUMPTION ANALYSIS TABLE          ║");
      console.log("    ╠══════════════════════════════════════════════════╣");

      // mintToStudent (single)
      let tx = await sbt.connect(issuer).mintToStudent(
        student1.address, SAMPLE_URI_1, CERT_TYPE_ORGANISASI, 85, CID_1
      );
      let receipt = await tx.wait();
      console.log(`    ║ mintToStudent (single)   │ ${receipt.gasUsed.toString().padStart(10)} gas ║`);

      // batchMint x5
      const n5 = 5;
      tx = await sbt.connect(issuer).batchMint(
        Array(n5).fill(student2.address),
        Array(n5).fill(SAMPLE_URI_2),
        Array(n5).fill(CERT_TYPE_KOMPETISI),
        Array(n5).fill(88),
        Array(n5).fill(CID_2)
      );
      receipt = await tx.wait();
      console.log(`    ║ batchMint (x5)           │ ${receipt.gasUsed.toString().padStart(10)} gas ║`);

      // batchMint x10
      const n10 = 10;
      tx = await sbt.connect(issuer).batchMint(
        Array(n10).fill(student3.address),
        Array(n10).fill(SAMPLE_URI_3),
        Array(n10).fill(CERT_TYPE_PELATIHAN),
        Array(n10).fill(75),
        Array(n10).fill(CID_3)
      );
      receipt = await tx.wait();
      console.log(`    ║ batchMint (x10)          │ ${receipt.gasUsed.toString().padStart(10)} gas ║`);

      // batchMint x50
      const n50 = 50;
      tx = await sbt.connect(issuer).batchMint(
        Array(n50).fill(student1.address),
        Array(n50).fill(SAMPLE_URI_1),
        Array(n50).fill(CERT_TYPE_PENGABDIAN),
        Array(n50).fill(70),
        Array(n50).fill(CID_1)
      );
      receipt = await tx.wait();
      console.log(`    ║ batchMint (x50)          │ ${receipt.gasUsed.toString().padStart(10)} gas ║`);

      // verifyCertificate (static call — no gas from user perspective)
      console.log(`    ║ verifyCertificate        │     0 gas (view)        ║`);

      // revokeCertificate
      tx = await sbt.connect(admin).revokeCertificate(0, "test revocation for gas measurement");
      receipt = await tx.wait();
      console.log(`    ║ revokeCertificate        │ ${receipt.gasUsed.toString().padStart(10)} gas ║`);

      // pause / unpause
      tx = await sbt.connect(admin).pause();
      receipt = await tx.wait();
      console.log(`    ║ pause                    │ ${receipt.gasUsed.toString().padStart(10)} gas ║`);

      tx = await sbt.connect(admin).unpause();
      receipt = await tx.wait();
      console.log(`    ║ unpause                  │ ${receipt.gasUsed.toString().padStart(10)} gas ║`);

      console.log("    ╚══════════════════════════════════════════════════╝");
      console.log("    Note: view functions cost 0 gas for external callers.\n");
    });
  });
});
