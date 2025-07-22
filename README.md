# Blockchain-Based Invoicing System

A decentralized invoicing platform built on Ethereum with IPFS for document storage.

## Features

- 📝 Create and manage invoices on blockchain
- 🔗 IPFS integration for secure PDF storage
- 💰 Crypto payment tracking with stablecoin support
- 🔐 MetaMask wallet integration
- 🛡️ Dispute resolution mechanism
- 📊 Real-time invoice tracking and analytics

## Tech Stack

- **Smart Contracts**: Solidity, Hardhat
- **Frontend**: React, Ethers.js, Material-UI
- **Backend**: Node.js, Express
- **Storage**: IPFS (Pinata/Web3.Storage)
- **Blockchain**: Ethereum (Sepolia testnet)

## Project Structure

```
/invoice-chain
├── /client       # React frontend
├── /contracts    # Solidity smart contracts
├── /server       # Node.js backend
├── /scripts      # Deployment scripts
└── README.md
```

## Quick Start

### Prerequisites

- Node.js v16+
- MetaMask browser extension
- Git

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd invoice-chain
```

2. Install dependencies for all components
```bash
# Install contract dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Compile and deploy contracts
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

5. Start the development servers
```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Start backend server
cd server && npm start

# Terminal 3: Start React frontend
cd client && npm start
```

## Environment Variables

Create a `.env` file in the root directory:

```env
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_key
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Usage

1. **Connect Wallet**: Click "Connect Wallet" to link your MetaMask
2. **Create Invoice**: Fill in recipient, amount, and upload PDF
3. **Track Status**: View all invoices and their payment status
4. **Mark as Paid**: Recipients can confirm payment completion
5. **Dispute Resolution**: Initiate disputes if needed

## Smart Contract Addresses

- **Mainnet**: TBD
- **Sepolia**: TBD
- **Local**: Updated after deployment

## Testing

```bash
# Run contract tests
npx hardhat test

# Run frontend tests
cd client && npm test

# Run backend tests
cd server && npm test
```

## Deployment

### Testnet Deployment
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Mainnet Deployment
```bash
npx hardhat run scripts/deploy.js --network mainnet
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email your-email@example.com or open an issue on GitHub.

## Roadmap

- [ ] Multi-chain support (Polygon, BSC)
- [ ] Invoice templates
- [ ] Automated tax calculations
- [ ] Invoice financing features
- [ ] Mobile app development
- [ ] API for third-party integrations
