# Invoice Chain - Blockchain Invoicing System

## 🚀 Complete Setup Guide

A complete blockchain-based invoicing system with React frontend, Node.js backend, Solidity smart contracts, and IPFS integration.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **MetaMask** browser extension - [Install here](https://metamask.io/)

## 🛠️ Installation

### Option 1: Automatic Setup (Recommended)

1. **Run the setup script:**
   ```bash
   # For Command Prompt
   setup.bat
   
   # For PowerShell (may need execution policy change)
   .\setup.ps1
   ```

### Option 2: Manual Setup

1. **Install root dependencies:**
   ```bash
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd client
   npm install
   cd ..
   ```

3. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   cd ..
   ```

## ⚙️ Configuration

1. **Copy environment file:**
   ```bash
   copy .env.example .env
   ```

2. **Edit `.env` file with your configuration:**
   ```env
   # Required for IPFS uploads
   PINATA_API_KEY=your_pinata_api_key
   PINATA_SECRET_KEY=your_pinata_secret_key
   
   # Optional: Alternative IPFS service
   WEB3_STORAGE_TOKEN=your_web3_storage_token
   
   # For testnet deployment
   PRIVATE_KEY=your_ethereum_private_key
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_project_id
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

### Getting IPFS API Keys

#### Pinata (Recommended)
1. Go to [Pinata](https://pinata.cloud/)
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key with pinning permissions
5. Copy API Key and Secret Key to your `.env` file

#### Web3.Storage (Alternative)
1. Go to [Web3.Storage](https://web3.storage/)
2. Sign up for a free account
3. Create an API token
4. Copy the token to your `.env` file

## 🚀 Running the Application

### Step 1: Start Hardhat Network
```bash
npm run node
```
This starts a local Ethereum network on `http://localhost:8545`

### Step 2: Deploy Smart Contracts
```bash
npm run deploy:local
```
This deploys the InvoiceManager contract to your local network.

### Step 3: Start Backend Server
```bash
npm run dev:server
```
Backend runs on `http://localhost:3001`

### Step 4: Start Frontend
```bash
npm run dev:client
```
Frontend runs on `http://localhost:3000`

## 🦊 MetaMask Setup

1. **Install MetaMask** browser extension
2. **Add Local Network:**
   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

3. **Import Test Account:**
   - Copy a private key from the Hardhat node output
   - Import it into MetaMask for testing

## 📱 Using the Application

### Creating Your First Invoice

1. **Connect Wallet:** Click "Connect Wallet" in the top right
2. **Create Invoice:** 
   - Go to "Create Invoice"
   - Fill in recipient address, amount, and details
   - Upload a PDF file
   - Submit the transaction

3. **View Invoices:** Check the "Invoices" page to see all your invoices

### Paying an Invoice

1. **Find Invoice:** Go to the invoice details page
2. **Pay:** Click "Pay Invoice" (if you're the recipient)
3. **Confirm:** Approve the MetaMask transaction

## 🧪 Testing

### Run Smart Contract Tests
```bash
npm test
```

### Run Frontend Tests
```bash
cd client
npm test
```

### Run Backend Tests
```bash
cd server
npm test
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile smart contracts |
| `npm run deploy:local` | Deploy to local network |
| `npm run deploy:sepolia` | Deploy to Sepolia testnet |
| `npm run node` | Start Hardhat local network |
| `npm run dev:client` | Start React frontend |
| `npm run dev:server` | Start Node.js backend |
| `npm start` | Start all services concurrently |
| `npm test` | Run smart contract tests |

## 🌐 Deployment to Testnet

### 1. Get Test ETH
- Visit [Sepolia Faucet](https://sepoliafaucet.com/)
- Request test ETH for your wallet address

### 2. Configure Environment
```env
PRIVATE_KEY=your_wallet_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_project_id
```

### 3. Deploy Contract
```bash
npm run deploy:sepolia
```

### 4. Update Frontend
The deployment script automatically updates the contract address in the frontend.

## 🔧 Troubleshooting

### Common Issues

#### "Scripts disabled" error on Windows
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### MetaMask connection issues
- Make sure you're on the correct network (Hardhat Local)
- Try refreshing the page
- Check that MetaMask is unlocked

#### IPFS upload failures
- Verify your Pinata API keys are correct
- Check your internet connection
- Try using Web3.Storage as an alternative

#### Transaction failures
- Ensure you have enough ETH for gas fees
- Check that contract addresses are correct
- Verify the network is running

### Getting Help

1. Check the browser console for error messages
2. Look at the terminal output for backend errors
3. Verify all environment variables are set correctly
4. Make sure all services are running

## 📁 Project Structure

```
invoice-chain/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── services/       # API services
│   └── package.json
├── contracts/              # Solidity smart contracts
│   └── InvoiceManager.sol
├── server/                 # Node.js backend
│   ├── routes/             # API routes
│   └── package.json
├── scripts/                # Deployment scripts
├── test/                   # Smart contract tests
├── hardhat.config.js       # Hardhat configuration
└── package.json            # Root package.json
```

## 🔐 Security Considerations

- Never commit private keys to version control
- Use environment variables for sensitive data
- Test thoroughly on testnets before mainnet deployment
- Consider multi-signature wallets for high-value transactions
- Implement proper access controls

## 🎯 Features Implemented

### ✅ Core Features
- ✅ Smart contract-based invoice management
- ✅ IPFS integration for PDF storage
- ✅ MetaMask wallet connectivity
- ✅ Invoice creation and payment
- ✅ Dispute resolution system
- ✅ Real-time status updates

### ✅ Frontend Features
- ✅ Modern React UI with Material-UI
- ✅ Responsive design
- ✅ Invoice dashboard
- ✅ File upload with drag & drop
- ✅ QR code generation
- ✅ Transaction history

### ✅ Backend Features
- ✅ RESTful API
- ✅ IPFS file management
- ✅ Contract interaction helpers
- ✅ Metadata storage
- ✅ Search and filtering

## 🚀 Future Enhancements

- [ ] Multi-chain support (Polygon, BSC)
- [ ] Invoice templates
- [ ] Automated tax calculations
- [ ] Email notifications
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Invoice financing
- [ ] Recurring invoices

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For questions or support:
- Open an issue on GitHub
- Check the troubleshooting section
- Review the documentation

---

**Happy invoicing! 🎉**
