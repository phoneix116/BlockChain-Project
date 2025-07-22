const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment of InvoiceManager contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  // Deploy InvoiceManager contract
  const InvoiceManager = await ethers.getContractFactory("InvoiceManager");
  console.log("Deploying InvoiceManager...");
  
  const invoiceManager = await InvoiceManager.deploy();
  await invoiceManager.deployed();
  
  console.log("InvoiceManager deployed to:", invoiceManager.address);
  console.log("Transaction hash:", invoiceManager.deployTransaction.hash);
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: invoiceManager.address,
    deployerAddress: deployer.address,
    deploymentTime: new Date().toISOString(),
    transactionHash: invoiceManager.deployTransaction.hash,
    blockNumber: invoiceManager.deployTransaction.blockNumber,
  };
  
  // Create deployment directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  // Save contract ABI for frontend
  const artifactPath = path.join(__dirname, "../artifacts/contracts/InvoiceManager.sol/InvoiceManager.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  const abiDir = path.join(__dirname, "../client/src/contracts");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }
  
  const abiFile = path.join(abiDir, "InvoiceManager.json");
  fs.writeFileSync(abiFile, JSON.stringify({
    address: invoiceManager.address,
    abi: artifact.abi
  }, null, 2));
  
  console.log("✅ Deployment completed successfully!");
  console.log("📄 Contract ABI saved to:", abiFile);
  console.log("📋 Deployment info saved to:", deploymentFile);
  
  // Verify contract on Etherscan (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await invoiceManager.deployTransaction.wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: invoiceManager.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("❌ Error verifying contract:", error.message);
    }
  }
  
  // Display useful information
  console.log("\n🎉 Deployment Summary:");
  console.log("========================");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Contract Address: ${invoiceManager.address}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Gas Used: ${invoiceManager.deployTransaction.gasLimit?.toString() || 'N/A'}`);
  console.log(`Transaction Hash: ${invoiceManager.deployTransaction.hash}`);
  
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("\n🔧 Next Steps for Local Development:");
    console.log("1. Start the backend server: cd server && npm run dev");
    console.log("2. Start the frontend: cd client && npm start");
    console.log("3. Connect MetaMask to localhost:8545");
    console.log("4. Import a test account from Hardhat node");
  } else {
    console.log("\n🔧 Next Steps:");
    console.log("1. Update your .env file with the contract address");
    console.log("2. Configure your frontend to use the deployed contract");
    console.log("3. Test the contract on the network");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
