import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState('0');

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Create provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const network = await provider.getNetwork();

      // Get balance
      const balance = await provider.getBalance(accounts[0]);

      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
      setNetwork(network);
      setBalance(ethers.utils.formatEther(balance));

      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('Failed to connect wallet: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setNetwork(null);
    setBalance('0');
    toast.info('Wallet disconnected');
  };

  // Switch network
  const switchNetwork = async (chainId) => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask is not installed');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethers.utils.hexValue(chainId) }],
      });
    } catch (error) {
      // Network doesn't exist, add it
      if (error.code === 4902) {
        toast.error('Please add this network to MetaMask manually');
      } else {
        console.error('Failed to switch network:', error);
        toast.error('Failed to switch network: ' + error.message);
      }
    }
  };

  // Add token to MetaMask
  const addTokenToWallet = async (tokenAddress, tokenSymbol, tokenDecimals = 18) => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask is not installed');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
          },
        },
      });
      toast.success(`${tokenSymbol} token added to wallet!`);
    } catch (error) {
      console.error('Failed to add token:', error);
      toast.error('Failed to add token to wallet');
    }
  };

  // Get transaction receipt
  const waitForTransaction = async (txHash) => {
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const receipt = await provider.waitForTransaction(txHash);
      return receipt;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Update balance
  const updateBalance = async () => {
    if (account && provider) {
      try {
        const balance = await provider.getBalance(account);
        setBalance(ethers.utils.formatEther(balance));
      } catch (error) {
        console.error('Failed to update balance:', error);
      }
    }
  };

  // Check if connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (isMetaMaskInstalled()) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });

          if (accounts.length > 0) {
            // Auto-connect if previously connected
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const network = await provider.getNetwork();
            const balance = await provider.getBalance(accounts[0]);

            setAccount(accounts[0]);
            setProvider(provider);
            setSigner(signer);
            setNetwork(network);
            setBalance(ethers.utils.formatEther(balance));
          }
        } catch (error) {
          console.error('Failed to check connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          setAccount(accounts[0]);
          updateBalance();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account]);

  const value = {
    account,
    provider,
    signer,
    network,
    balance,
    isConnecting,
    isConnected: !!account,
    isMetaMaskInstalled,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    addTokenToWallet,
    waitForTransaction,
    formatAddress,
    updateBalance,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
