const { ethers } = require('hardhat');

async function getAccountKeys() {
  console.log('\n🔑 Hardhat Test Account Private Keys\n');
  console.log('=' * 60);
  
  // Get the signers (these are the accounts with known private keys)
  const signers = await ethers.getSigners();
  
  // Hardhat's default private keys for local development
  const privateKeys = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
  ];
  
  for (let i = 0; i < Math.min(5, signers.length); i++) {
    const balance = await ethers.provider.getBalance(signers[i].address);
    console.log(`\n📋 Account ${i}:`);
    console.log(`Address:     ${signers[i].address}`);
    console.log(`Private Key: ${privateKeys[i]}`);
    console.log(`Balance:     ${ethers.formatEther(balance)} ETH`);
    console.log('-'.repeat(70));
  }
  
  console.log('\n💡 RECOMMENDED FOR TESTING:');
  console.log('='.repeat(35));
  console.log(`🎯 Main Account (Your Wallet):`);
  console.log(`   Address: ${signers[0].address}`);
  console.log(`   Private: ${privateKeys[0]}`);
  console.log('');
  console.log(`💳 Invoice Recipient:`);
  console.log(`   Address: ${signers[1].address}`);
  console.log(`   Private: ${privateKeys[1]}`);
  
  console.log('\n🔧 TO IMPORT IN METAMASK:');
  console.log('1. Click Import Account');
  console.log('2. Select "Private Key"');
  console.log(`3. Paste: ${privateKeys[0]}`);
  console.log('4. Click Import');
}

getAccountKeys().catch(console.error);
