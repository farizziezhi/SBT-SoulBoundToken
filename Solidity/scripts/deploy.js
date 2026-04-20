// scripts/deploy.js
// Deployment script for StudentCertificateSBT on Sepolia Testnet
// Usage: pnpm hardhat run scripts/deploy.js --network sepolia

const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("StudentCertificateSBT — Deployment Script");
  console.log("=".repeat(60));

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`\nNetwork:   ${hre.network.name}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${hre.ethers.formatEther(balance)} ETH\n`);

  // Deploy contract
  console.log("Deploying StudentCertificateSBT...");
  const StudentCertificateSBT = await hre.ethers.getContractFactory(
    "StudentCertificateSBT"
  );
  const sbt = await StudentCertificateSBT.deploy(deployer.address);
  await sbt.waitForDeployment();

  const contractAddress = await sbt.getAddress();
  const deployTx = sbt.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUCCESSFUL");
  console.log("=".repeat(60));
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Transaction Hash: ${receipt.hash}`);
  console.log(`Block Number:     ${receipt.blockNumber}`);
  console.log(`Gas Used:         ${receipt.gasUsed.toString()}`);
  console.log("=".repeat(60));

  // Verify roles
  const DEFAULT_ADMIN_ROLE = await sbt.DEFAULT_ADMIN_ROLE();
  const ISSUER_ROLE = await sbt.ISSUER_ROLE();

  const hasAdmin = await sbt.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const hasIssuer = await sbt.hasRole(ISSUER_ROLE, deployer.address);

  console.log("\nRole Verification:");
  console.log(`  DEFAULT_ADMIN_ROLE: ${hasAdmin ? "✓" : "✗"}`);
  console.log(`  ISSUER_ROLE:        ${hasIssuer ? "✓" : "✗"}`);

  // Contract info
  const name = await sbt.name();
  const symbol = await sbt.symbol();
  console.log(`\nToken Name:   ${name}`);
  console.log(`Token Symbol: ${symbol}`);

  // Etherscan verification command
  if (hre.network.name === "sepolia") {
    console.log("\n" + "-".repeat(60));
    console.log("To verify on Etherscan, run:");
    console.log(
      `  pnpm hardhat verify --network sepolia ${contractAddress} "${deployer.address}"`
    );
    console.log("-".repeat(60));
  }

  // Save deployment info to file
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    timestamp: new Date().toISOString(),
    tokenName: name,
    tokenSymbol: symbol,
  };

  const deployDir = "./deployments";
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  const filename = `${deployDir}/${hre.network.name}-deployment.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
