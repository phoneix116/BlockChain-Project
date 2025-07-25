# 🧾 Blockchain Invoice System

A comprehensive decentralized invoicing platform built on Ethereum with automatic PDF generation and IPFS cloud storage integration.

## ✨ Features

- 📝 **Smart Contract Invoicing** - Create and manage invoices on blockchain
- 🤖 **Automatic PDF Generation** - Professional invoices generated with pdf-lib
- ☁️ **Pinata IPFS Cloud Storage** - Decentralized PDF storage with custom gateway
- 💰 **Crypto Payment Tracking** - ETH payment processing with MetaMask
- 🎨 **Modern Dark Theme UI** - Professional Material-UI interface
- 📊 **Real-time Analytics** - Invoice tracking and payment status
- 🔐 **Secure Web3 Integration** - MetaMask wallet connection
- 📱 **Responsive Design** - Mobile-friendly interface

## 🛠️ Tech Stack

### **Blockchain & Smart Contracts**
- **Solidity** - Smart contract development
- **Hardhat** - Development environment and testing
- **Ethers.js v6** - Ethereum interaction library
- **OpenZeppelin** - Security-audited contract libraries

### **Frontend**
- **React 18** - Modern UI framework
- **Material-UI (MUI)** - Professional component library
- **Web3 Provider** - Blockchain connectivity
- **Axios** - HTTP client for API calls

### **Backend**
- **Node.js & Express** - RESTful API server
- **pdf-lib** - Professional PDF generation
- **Multer** - File upload handling
- **Joi** - Data validation
- **CORS** - Cross-origin resource sharing

### **Cloud Storage**
- **Pinata IPFS** - Decentralized file storage
- **Custom Gateway** - cyan-glamorous-tarsier-110.mypinata.cloud
- **FormData** - File upload processing

## 🏗️ Project Architecture

```
/invoice-chain
├── /client                     # React Frontend Application
│   ├── /src
│   │   ├── /components        # Reusable UI components
│   │   ├── /contexts         # React Context providers
│   │   ├── /pages            # Main application pages
│   │   └── /services         # API service layers
├── /contracts                 # Solidity Smart Contracts
│   └── InvoiceManager.sol    # Main invoice contract
├── /server                   # Node.js Backend API
│   ├── /routes              # Express route handlers
│   ├── /services            # Business logic services
│   └── /uploads             # Local file storage
├── /scripts                 # Blockchain deployment scripts
├── /test                   # Smart contract tests
└── /artifacts              # Compiled contract artifacts
```

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js v16+** - JavaScript runtime
- **MetaMask** - Web3 wallet browser extension
- **Git** - Version control
- **Pinata Account** - IPFS cloud storage (free tier available)

### 🔧 Installation

1. **Clone the repository**
```bash
git clone https://github.com/phoneix116/BlockChain-Project.git
cd invoice-chain
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

3. **Set up environment variables**
```bash
# Create environment file for server
cd server
cp .env.example .env
# Edit server/.env with your Pinata credentials
```

4. **Configure Pinata IPFS (Required)**
   - Sign up at [Pinata.cloud](https://pinata.cloud) (free tier available)
   - Get your API Key and Secret from the dashboard
   - Update `server/.env` with your credentials:
   ```env
   PINATA_API_KEY=your_pinata_api_key_here
   PINATA_SECRET_KEY=your_pinata_secret_key_here
   IPFS_GATEWAY=https://your-gateway.mypinata.cloud/ipfs/
   ```

5. **Deploy smart contracts**
```bash
# Compile contracts
npx hardhat compile

# Start local blockchain (Terminal 1)
npx hardhat node

# Deploy contracts (Terminal 2)
npx hardhat run scripts/deploy.js --network localhost
```

6. **Start the application**
```bash
# Terminal 1: Blockchain (already running from step 5)
npx hardhat node

# Terminal 2: Backend server
cd server && node index.js

# Terminal 3: Frontend client  
cd client && npm start
```

## 🌐 Application URLs

Once all services are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Blockchain RPC**: http://localhost:8545
- **API Documentation**: http://localhost:3001

## ⚙️ Environment Configuration

### Server Environment (`server/.env`)

```env
# Blockchain Configuration
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=http://localhost:8545
PORT=3001
NODE_ENV=development

# Pinata IPFS Configuration (Required)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
IPFS_GATEWAY=https://your-custom-gateway.mypinata.cloud/ipfs/

# Contract Address (auto-generated after deployment)
REACT_APP_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_API_URL=http://localhost:3001
REACT_APP_IPFS_GATEWAY=https://your-custom-gateway.mypinata.cloud/ipfs/
```

## 🎯 Usage Guide

### Creating Your First Invoice

1. **Connect MetaMask Wallet**
   - Click "Connect Wallet" button
   - Approve connection in MetaMask popup
   - Ensure you're on the correct network (localhost:8545 for development)

2. **Create New Invoice**
   - Navigate to "Create Invoice" page
   - Fill in the required details:
     - **Recipient Address**: Ethereum address of the client
     - **Amount**: Invoice amount in ETH
     - **Description**: Service or product description
     - **Due Date**: Payment deadline
   - Click "Generate Invoice" to create on blockchain

3. **Automatic PDF Generation**
   - PDF is automatically generated with professional layout
   - Includes blockchain information and payment instructions
   - Uploaded to Pinata IPFS cloud storage
   - Download link provided instantly

4. **Payment Processing**
   - Recipients can pay directly through the interface
   - Real-time payment status updates
   - Transaction hash recorded on blockchain

5. **Invoice Management**
   - View all invoices in the dashboard
   - Filter by status (Pending, Paid, Overdue)
   - Download PDFs anytime from IPFS

## 🧪 Testing & Development

### Running Tests

```bash
# Smart contract tests
npx hardhat test

# Frontend tests  
cd client && npm test

# Backend API tests
cd server && npm test
```

### Development Network Setup

```bash
# Get test accounts with ETH
npx hardhat run scripts/get-accounts.js

# Reset blockchain state
npx hardhat clean
npx hardhat compile
```

### Sample Test Data

Use these addresses for testing:
```
Recipient: 0x742d35Cc6C0532dF3B5D9b0D8D7B4F2E3c8F9e0A
Amount: 1.5 ETH
Description: Web Development Services
```

## 📊 API Endpoints

### Invoice Management
```
POST   /api/invoice/create     # Create new invoice
GET    /api/invoice/:id        # Get invoice details
PUT    /api/invoice/:id/pay    # Mark invoice as paid
GET    /api/invoice/list       # List all invoices
POST   /api/invoice/generate   # Generate PDF
```

### IPFS Operations
```
POST   /api/ipfs/upload        # Upload file to IPFS
GET    /api/ipfs/file/:hash    # Download file from IPFS
GET    /api/ipfs/pins          # List pinned files
```

### Contract Interaction
```
GET    /api/contract/invoice/:id    # Get blockchain invoice
POST   /api/contract/create        # Create blockchain invoice
POST   /api/contract/pay           # Process payment
```

## 🔧 Key Features Explained

### 🤖 Automatic PDF Generation
- **pdf-lib** creates professional invoices
- Custom styling with company branding
- Blockchain transaction details included
- ETH amount formatting and date handling

### ☁️ Pinata IPFS Integration
- Decentralized storage for invoice PDFs
- Custom gateway for faster access
- Metadata tracking for file organization
- Fallback to local storage in development

### 🎨 Dark Theme UI
- Modern Material-UI design system
- Responsive layout for all devices
- Professional color scheme
- Consistent spacing and typography

### 🔐 Web3 Security
- MetaMask integration for secure transactions
- Smart contract validation
- Encrypted IPFS storage
- Error handling and user feedback

## 📱 Deployment

### Production Deployment

1. **Frontend (Vercel/Netlify)**
```bash
cd client
npm run build
# Deploy build/ folder
```

2. **Backend (Heroku/Railway)**
```bash
cd server  
# Set production environment variables
# Deploy with your preferred service
```

3. **Smart Contracts (Mainnet/Sepolia)**
```bash
npx hardhat run scripts/deploy.js --network sepolia
# Update contract addresses in environment
```

## 🚨 Troubleshooting

### Common Issues

**1. MetaMask Connection Issues**
- Ensure MetaMask is unlocked
- Check network settings (localhost:8545)
- Refresh page and try reconnecting

**2. PDF Download Failures**
- Verify Pinata API credentials
- Check IPFS gateway URL
- Ensure stable internet connection

**3. Transaction Failures**
- Check ETH balance for gas fees
- Verify contract deployment
- Review transaction details in MetaMask

**4. Development Server Issues**
- Ensure all dependencies installed
- Check port availability (3000, 3001, 8545)
- Restart services in correct order

## 📚 Dependencies

### Key Package Versions
```json
{
  "ethers": "^6.0.0",
  "pdf-lib": "^1.17.1", 
  "react": "^18.0.0",
  "@mui/material": "^5.0.0",
  "hardhat": "^2.0.0",
  "express": "^4.18.0"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**phoneix116**
- GitHub: [@phoneix116](https://github.com/phoneix116)
- Repository: [BlockChain-Project](https://github.com/phoneix116/BlockChain-Project)

## 🙏 Acknowledgments

- **OpenZeppelin** - Smart contract security standards
- **Pinata** - IPFS cloud storage infrastructure  
- **Material-UI** - React component library
- **Hardhat** - Ethereum development environment
- **pdf-lib** - JavaScript PDF generation

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
