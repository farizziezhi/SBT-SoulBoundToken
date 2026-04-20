// scripts/extract-abi.js
// Extracts the ABI from compiled artifacts for paper inclusion
// Usage: pnpm hardhat compile && node scripts/extract-abi.js

const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/StudentCertificateSBT.sol/StudentCertificateSBT.json"
);

if (!fs.existsSync(artifactPath)) {
  console.error("Artifact not found. Run 'pnpm hardhat compile' first.");
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
const abi = artifact.abi;

// Create abi directory
const abiDir = path.join(__dirname, "../abi");
if (!fs.existsSync(abiDir)) {
  fs.mkdirSync(abiDir, { recursive: true });
}

// Write full ABI
const abiPath = path.join(abiDir, "StudentCertificateSBT.json");
fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
console.log(`Full ABI written to: ${abiPath}`);
console.log(`Total ABI entries: ${abi.length}`);

// Write human-readable summary
const summary = abi
  .filter((item) => item.type === "function" || item.type === "event")
  .map((item) => {
    if (item.type === "function") {
      const inputs = item.inputs
        .map((i) => `${i.type} ${i.name}`)
        .join(", ");
      const outputs = item.outputs
        .map((o) => `${o.type}`)
        .join(", ");
      return `function ${item.name}(${inputs})${outputs ? ` → (${outputs})` : ""} [${item.stateMutability}]`;
    } else {
      const inputs = item.inputs
        .map((i) => `${i.indexed ? "indexed " : ""}${i.type} ${i.name}`)
        .join(", ");
      return `event ${item.name}(${inputs})`;
    }
  });

console.log("\n--- Contract Interface Summary ---");
summary.forEach((s) => console.log(`  ${s}`));
