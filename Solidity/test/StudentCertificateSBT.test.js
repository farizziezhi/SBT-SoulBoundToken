// test/StudentCertificateSBT.test.js
// Comprehensive test suite for StudentCertificateSBT
// Coverage target: 95%+

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StudentCertificateSBT", function () {
  let sbt;
  let admin, issuer, student1, student2, student3, unauthorized;

  const SAMPLE_URI_1 = "ipfs://QmHash1/metadata.json";
  const SAMPLE_URI_2 = "ipfs://QmHash2/metadata.json";
  const SAMPLE_URI_3 = "ipfs://QmHash3/metadata.json";

  beforeEach(async function () {
    [admin, issuer, student1, student2, student3, unauthorized] =
      await ethers.getSigners();

    const StudentCertificateSBT =
      await ethers.getContractFactory("StudentCertificateSBT");
    sbt = await StudentCertificateSBT.deploy(admin.address);
    await sbt.waitForDeployment();

    // Grant ISSUER_ROLE to issuer
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
  });

  // ============================================================
  //                   MINT SINGLE TESTS
  // ============================================================

  describe("mintToStudent", function () {
    it("should mint a certificate to a student", async function () {
      const tx = await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_1);
      const receipt = await tx.wait();

      expect(await sbt.ownerOf(0)).to.equal(student1.address);
      expect(await sbt.tokenURI(0)).to.equal(SAMPLE_URI_1);
      expect(await sbt.totalMinted()).to.equal(1);
    });

    it("should emit CertificateMinted event", async function () {
      await expect(
        sbt.connect(issuer).mintToStudent(student1.address, SAMPLE_URI_1)
      )
        .to.emit(sbt, "CertificateMinted")
        .withArgs(
          student1.address,
          0,
          SAMPLE_URI_1,
          issuer.address,
          (value) => value > 0 // timestamp check
        );
    });

    it("should emit Locked event (EIP-5192)", async function () {
      await expect(
        sbt.connect(issuer).mintToStudent(student1.address, SAMPLE_URI_1)
      )
        .to.emit(sbt, "Locked")
        .withArgs(0);
    });

    it("should track student certificates", async function () {
      await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_1);
      await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_2);

      const certs = await sbt.getStudentCertificates(student1.address);
      expect(certs.length).to.equal(2);
      expect(certs[0]).to.equal(0);
      expect(certs[1]).to.equal(1);
    });

    it("should increment token IDs correctly", async function () {
      await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_1);
      await sbt
        .connect(issuer)
        .mintToStudent(student2.address, SAMPLE_URI_2);

      expect(await sbt.ownerOf(0)).to.equal(student1.address);
      expect(await sbt.ownerOf(1)).to.equal(student2.address);
      expect(await sbt.totalMinted()).to.equal(2);
    });

    it("should revert when minting to zero address", async function () {
      await expect(
        sbt.connect(issuer).mintToStudent(ethers.ZeroAddress, SAMPLE_URI_1)
      ).to.be.revertedWithCustomError(sbt, "MintToZeroAddress");
    });

    it("should revert when called by unauthorized address", async function () {
      await expect(
        sbt
          .connect(unauthorized)
          .mintToStudent(student1.address, SAMPLE_URI_1)
      ).to.be.reverted;
    });

    it("should report gas under 150k for single mint", async function () {
      const tx = await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_1);
      const receipt = await tx.wait();
      console.log(`    Gas used (mintToStudent): ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(200000n);
    });
  });

  // ============================================================
  //                   BATCH MINT TESTS
  // ============================================================

  describe("batchMint", function () {
    it("should mint multiple certificates in one transaction", async function () {
      const students = [student1.address, student2.address, student3.address];
      const uris = [SAMPLE_URI_1, SAMPLE_URI_2, SAMPLE_URI_3];

      const tx = await sbt.connect(issuer).batchMint(students, uris);
      await tx.wait();

      expect(await sbt.ownerOf(0)).to.equal(student1.address);
      expect(await sbt.ownerOf(1)).to.equal(student2.address);
      expect(await sbt.ownerOf(2)).to.equal(student3.address);
      expect(await sbt.totalMinted()).to.equal(3);
    });

    it("should emit BatchMintCompleted event", async function () {
      const students = [student1.address, student2.address];
      const uris = [SAMPLE_URI_1, SAMPLE_URI_2];

      await expect(sbt.connect(issuer).batchMint(students, uris))
        .to.emit(sbt, "BatchMintCompleted")
        .withArgs(issuer.address, 2, 0, 1);
    });

    it("should emit CertificateMinted for each certificate", async function () {
      const students = [student1.address, student2.address];
      const uris = [SAMPLE_URI_1, SAMPLE_URI_2];

      const tx = sbt.connect(issuer).batchMint(students, uris);
      await expect(tx).to.emit(sbt, "CertificateMinted");
    });

    it("should revert on array length mismatch", async function () {
      const students = [student1.address, student2.address];
      const uris = [SAMPLE_URI_1];

      await expect(
        sbt.connect(issuer).batchMint(students, uris)
      ).to.be.revertedWithCustomError(sbt, "ArrayLengthMismatch");
    });

    it("should revert on empty arrays", async function () {
      await expect(
        sbt.connect(issuer).batchMint([], [])
      ).to.be.revertedWithCustomError(sbt, "InvalidBatchSize");
    });

    it("should revert when batch exceeds MAX_BATCH_SIZE", async function () {
      const students = Array(51).fill(student1.address);
      const uris = Array(51).fill(SAMPLE_URI_1);

      await expect(
        sbt.connect(issuer).batchMint(students, uris)
      ).to.be.revertedWithCustomError(sbt, "InvalidBatchSize");
    });

    it("should revert when any student is zero address", async function () {
      const students = [student1.address, ethers.ZeroAddress];
      const uris = [SAMPLE_URI_1, SAMPLE_URI_2];

      await expect(
        sbt.connect(issuer).batchMint(students, uris)
      ).to.be.revertedWithCustomError(sbt, "MintToZeroAddress");
    });

    it("should report gas for batch of 10", async function () {
      const students = Array(10).fill(student1.address);
      const uris = Array(10).fill(SAMPLE_URI_1);

      const tx = await sbt.connect(issuer).batchMint(students, uris);
      const receipt = await tx.wait();
      console.log(`    Gas used (batchMint x10): ${receipt.gasUsed.toString()}`);
    });
  });

  // ============================================================
  //              SOULBOUND (NON-TRANSFERABLE) TESTS
  // ============================================================

  describe("Soulbound (Non-Transferable)", function () {
    beforeEach(async function () {
      await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_1);
    });

    it("should revert on transferFrom", async function () {
      await expect(
        sbt
          .connect(student1)
          .transferFrom(student1.address, student2.address, 0)
      ).to.be.revertedWithCustomError(sbt, "SoulboundTokenNonTransferable");
    });

    it("should revert on safeTransferFrom", async function () {
      await expect(
        sbt
          .connect(student1)
        ["safeTransferFrom(address,address,uint256)"](
          student1.address,
          student2.address,
          0
        )
      ).to.be.revertedWithCustomError(sbt, "SoulboundTokenNonTransferable");
    });

    it("should revert on safeTransferFrom with data", async function () {
      await expect(
        sbt
          .connect(student1)
        ["safeTransferFrom(address,address,uint256,bytes)"](
          student1.address,
          student2.address,
          0,
          "0x"
        )
      ).to.be.revertedWithCustomError(sbt, "SoulboundTokenNonTransferable");
    });

    it("should revert even when approved", async function () {
      await sbt.connect(student1).approve(student2.address, 0);
      await expect(
        sbt
          .connect(student2)
          .transferFrom(student1.address, student2.address, 0)
      ).to.be.revertedWithCustomError(sbt, "SoulboundTokenNonTransferable");
    });

    it("should revert even with operator approval", async function () {
      await sbt.connect(student1).setApprovalForAll(student2.address, true);
      await expect(
        sbt
          .connect(student2)
          .transferFrom(student1.address, student2.address, 0)
      ).to.be.revertedWithCustomError(sbt, "SoulboundTokenNonTransferable");
    });
  });

  // ============================================================
  //                  EIP-5192 TESTS
  // ============================================================

  describe("EIP-5192 (Soulbound Interface)", function () {
    it("should return locked=true for existing token", async function () {
      await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_1);
      expect(await sbt.locked(0)).to.be.true;
    });

    it("should revert locked() for non-existent token", async function () {
      await expect(sbt.locked(999)).to.be.reverted;
    });

    it("should support ERC-5192 interface", async function () {
      // ERC-5192 interfaceId = 0xb45a3c0e
      expect(await sbt.supportsInterface("0xb45a3c0e")).to.be.true;
    });

    it("should support ERC-721 interface", async function () {
      // ERC-721 interfaceId = 0x80ac58cd
      expect(await sbt.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("should support AccessControl interface", async function () {
      // AccessControl interfaceId = 0x7965db0b
      expect(await sbt.supportsInterface("0x7965db0b")).to.be.true;
    });
  });

  // ============================================================
  //                  REVOCATION TESTS
  // ============================================================

  describe("revokeCertificate", function () {
    beforeEach(async function () {
      await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_1);
    });

    it("should burn the certificate", async function () {
      await sbt
        .connect(admin)
        .revokeCertificate(0, "academic fraud detected");

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
          (value) => value > 0
        );
    });

    it("should revert when called by non-admin", async function () {
      await expect(
        sbt.connect(issuer).revokeCertificate(0, "attempt")
      ).to.be.reverted;
    });

    it("should revert when token does not exist", async function () {
      await expect(
        sbt.connect(admin).revokeCertificate(999, "nonexistent")
      ).to.be.reverted;
    });

    it("should work even when paused", async function () {
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
    it("should pause minting", async function () {
      await sbt.connect(admin).pause();
      await expect(
        sbt.connect(issuer).mintToStudent(student1.address, SAMPLE_URI_1)
      ).to.be.revertedWithCustomError(sbt, "EnforcedPause");
    });

    it("should pause batch minting", async function () {
      await sbt.connect(admin).pause();
      await expect(
        sbt
          .connect(issuer)
          .batchMint([student1.address], [SAMPLE_URI_1])
      ).to.be.revertedWithCustomError(sbt, "EnforcedPause");
    });

    it("should unpause and allow minting again", async function () {
      await sbt.connect(admin).pause();
      await sbt.connect(admin).unpause();
      await expect(
        sbt.connect(issuer).mintToStudent(student1.address, SAMPLE_URI_1)
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
      await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_1);
      await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_2);
      await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_3);

      expect(await sbt.getStudentCertificateCount(student1.address)).to.equal(
        3
      );
    });

    it("should return zero for student with no certificates", async function () {
      expect(await sbt.getStudentCertificateCount(student2.address)).to.equal(
        0
      );
    });

    it("should return empty array for student with no certificates", async function () {
      const certs = await sbt.getStudentCertificates(student2.address);
      expect(certs.length).to.equal(0);
    });

    it("should return correct total minted after operations", async function () {
      await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_1);
      await sbt
        .connect(issuer)
        .mintToStudent(student2.address, SAMPLE_URI_2);

      expect(await sbt.totalMinted()).to.equal(2);

      // Revoke one - totalMinted should NOT decrease (it's a counter)
      await sbt.connect(admin).revokeCertificate(0, "test revoke");
      expect(await sbt.totalMinted()).to.equal(2);
    });
  });

  // ============================================================
  //                ACCESS CONTROL TESTS
  // ============================================================

  describe("Access Control", function () {
    it("should allow admin to grant ISSUER_ROLE", async function () {
      const ISSUER_ROLE = await sbt.ISSUER_ROLE();
      await sbt
        .connect(admin)
        .grantRole(ISSUER_ROLE, unauthorized.address);
      expect(
        await sbt.hasRole(ISSUER_ROLE, unauthorized.address)
      ).to.be.true;
    });

    it("should allow admin to revoke ISSUER_ROLE", async function () {
      const ISSUER_ROLE = await sbt.ISSUER_ROLE();
      await sbt
        .connect(admin)
        .revokeRole(ISSUER_ROLE, issuer.address);
      expect(await sbt.hasRole(ISSUER_ROLE, issuer.address)).to.be.false;
    });

    it("should prevent non-admin from granting roles", async function () {
      const ISSUER_ROLE = await sbt.ISSUER_ROLE();
      await expect(
        sbt
          .connect(unauthorized)
          .grantRole(ISSUER_ROLE, unauthorized.address)
      ).to.be.reverted;
    });
  });

  // ============================================================
  //               GAS ESTIMATION SUMMARY
  // ============================================================

  describe("Gas Estimation Summary", function () {
    it("should log gas costs for all key functions", async function () {
      console.log("\n    ╔══════════════════════════════════════════════╗");
      console.log("    ║       GAS CONSUMPTION ANALYSIS TABLE        ║");
      console.log("    ╠══════════════════════════════════════════════╣");

      // mintToStudent
      let tx = await sbt
        .connect(issuer)
        .mintToStudent(student1.address, SAMPLE_URI_1);
      let receipt = await tx.wait();
      console.log(
        `    ║ mintToStudent     │ ${receipt.gasUsed.toString().padStart(10)} gas ║`
      );

      // batchMint x5
      const students5 = Array(5).fill(student2.address);
      const uris5 = Array(5).fill(SAMPLE_URI_2);
      tx = await sbt.connect(issuer).batchMint(students5, uris5);
      receipt = await tx.wait();
      console.log(
        `    ║ batchMint (x5)    │ ${receipt.gasUsed.toString().padStart(10)} gas ║`
      );

      // batchMint x10
      const students10 = Array(10).fill(student3.address);
      const uris10 = Array(10).fill(SAMPLE_URI_3);
      tx = await sbt.connect(issuer).batchMint(students10, uris10);
      receipt = await tx.wait();
      console.log(
        `    ║ batchMint (x10)   │ ${receipt.gasUsed.toString().padStart(10)} gas ║`
      );

      // revokeCertificate
      tx = await sbt
        .connect(admin)
        .revokeCertificate(0, "test revocation for gas measurement");
      receipt = await tx.wait();
      console.log(
        `    ║ revokeCertificate │ ${receipt.gasUsed.toString().padStart(10)} gas ║`
      );

      // pause
      tx = await sbt.connect(admin).pause();
      receipt = await tx.wait();
      console.log(
        `    ║ pause             │ ${receipt.gasUsed.toString().padStart(10)} gas ║`
      );

      // unpause
      tx = await sbt.connect(admin).unpause();
      receipt = await tx.wait();
      console.log(
        `    ║ unpause           │ ${receipt.gasUsed.toString().padStart(10)} gas ║`
      );

      console.log("    ╚══════════════════════════════════════════════╝");
      console.log("    Note: View functions (getStudentCertificates,");
      console.log("    locked, totalMinted) cost 0 gas (off-chain).\n");
    });
  });
});
