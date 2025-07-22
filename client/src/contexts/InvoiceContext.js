import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useWallet } from './WalletContext';
import contractAPI from '../services/contractAPI';
import ipfsAPI from '../services/ipfsAPI';

const InvoiceContext = createContext();

export const useInvoice = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoice must be used within an InvoiceProvider');
  }
  return context;
};

export const InvoiceProvider = ({ children }) => {
  const { signer, account, provider } = useWallet();
  const [invoices, setInvoices] = useState([]);
  const [userInvoices, setUserInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [lastLoadTime, setLastLoadTime] = useState(0);

  // Rate limiting: prevent API calls more frequent than once per 2 seconds
  const MIN_LOAD_INTERVAL = 2000;

  // Load contract
  useEffect(() => {
    const loadContract = async () => {
      if (signer) {
        try {
          const contractData = await import('../contracts/InvoiceManager.json');
          const contractInstance = new ethers.Contract(
            contractData.address,
            contractData.abi,
            signer
          );
          setContract(contractInstance);
        } catch (error) {
          console.error('Failed to load contract:', error);
        }
      }
    };

    loadContract();
  }, [signer]);

  // Load user invoices
  const loadUserInvoices = async () => {
    if (!account) return;

    // Rate limiting: check if enough time has passed since last load
    const now = Date.now();
    if (now - lastLoadTime < MIN_LOAD_INTERVAL) {
      console.log('Rate limited: skipping API call');
      return;
    }

    setLoading(true);
    setLastLoadTime(now);
    
    try {
      const response = await contractAPI.getUserInvoices(account);
      if (response.success) {
        setUserInvoices(response.invoices || []);
      } else {
        // If no invoices found, set empty array instead of showing error
        setUserInvoices([]);
      }
    } catch (error) {
      console.error('Failed to load user invoices:', error);
      // Only show error for actual network/server failures, not empty results
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        // Only show one error notification at a time
        if (!document.querySelector('.Toastify__toast--error')) {
          toast.error('Failed to load invoices: Network error - please check your connection');
        }
      }
      setUserInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // Create invoice
  const createInvoice = async (invoiceData) => {
    if (!contract || !signer) {
      throw new Error('Contract not available');
    }

    try {
      setLoading(true);

      // Upload PDF to IPFS first
      const uploadResponse = await ipfsAPI.uploadFile(
        invoiceData.file,
        invoiceData.title,
        invoiceData.description
      );

      if (!uploadResponse.success) {
        throw new Error('Failed to upload PDF to IPFS');
      }

      // Convert due date to timestamp
      const dueTimestamp = Math.floor(new Date(invoiceData.dueDate).getTime() / 1000);

      // Create invoice on blockchain
      const tx = await contract.createInvoice(
        uploadResponse.ipfsHash,
        invoiceData.recipient,
        ethers.utils.parseEther(invoiceData.amount.toString()),
        invoiceData.tokenAddress || ethers.constants.AddressZero,
        dueTimestamp,
        invoiceData.description
      );

      toast.info('Transaction submitted. Waiting for confirmation...');
      const receipt = await tx.wait();

      // Get the invoice ID from the event
      const event = receipt.events?.find(e => e.event === 'InvoiceCreated');
      const invoiceId = event?.args?.id?.toString();

      toast.success('Invoice created successfully!');
      
      // Reload user invoices
      await loadUserInvoices();

      return {
        success: true,
        invoiceId,
        txHash: receipt.transactionHash,
        ipfsHash: uploadResponse.ipfsHash
      };
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Failed to create invoice: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Pay invoice with ETH
  const payInvoiceETH = async (invoiceId, amount) => {
    if (!contract || !signer) {
      throw new Error('Contract not available');
    }

    try {
      setLoading(true);

      const tx = await contract.payInvoiceETH(invoiceId, {
        value: ethers.utils.parseEther(amount.toString())
      });

      toast.info('Payment submitted. Waiting for confirmation...');
      const receipt = await tx.wait();

      toast.success('Payment completed successfully!');
      
      // Reload user invoices
      await loadUserInvoices();

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Failed to pay invoice:', error);
      toast.error('Failed to pay invoice: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Pay invoice with tokens
  const payInvoiceToken = async (invoiceId, tokenAddress, amount) => {
    if (!contract || !signer) {
      throw new Error('Contract not available');
    }

    try {
      setLoading(true);

      // First approve token spending
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function approve(address spender, uint256 amount) external returns (bool)'],
        signer
      );

      const approveTx = await tokenContract.approve(
        contract.address,
        ethers.utils.parseEther(amount.toString())
      );
      
      toast.info('Approving token spending...');
      await approveTx.wait();

      // Then pay the invoice
      const tx = await contract.payInvoiceToken(invoiceId);

      toast.info('Payment submitted. Waiting for confirmation...');
      const receipt = await tx.wait();

      toast.success('Payment completed successfully!');
      
      // Reload user invoices
      await loadUserInvoices();

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Failed to pay invoice:', error);
      toast.error('Failed to pay invoice: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Raise dispute
  const raiseDispute = async (invoiceId, reason) => {
    if (!contract || !signer) {
      throw new Error('Contract not available');
    }

    try {
      setLoading(true);

      // Get dispute fee
      const disputeFee = await contract.disputeFee();

      const tx = await contract.raiseDispute(invoiceId, reason, {
        value: disputeFee
      });

      toast.info('Dispute submitted. Waiting for confirmation...');
      const receipt = await tx.wait();

      toast.success('Dispute raised successfully!');
      
      // Reload user invoices
      await loadUserInvoices();

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Failed to raise dispute:', error);
      toast.error('Failed to raise dispute: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Cancel invoice
  const cancelInvoice = async (invoiceId) => {
    if (!contract || !signer) {
      throw new Error('Contract not available');
    }

    try {
      setLoading(true);

      const tx = await contract.cancelInvoice(invoiceId);

      toast.info('Cancelling invoice. Waiting for confirmation...');
      const receipt = await tx.wait();

      toast.success('Invoice cancelled successfully!');
      
      // Reload user invoices
      await loadUserInvoices();

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Failed to cancel invoice:', error);
      toast.error('Failed to cancel invoice: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get invoice details
  const getInvoiceDetails = async (invoiceId) => {
    try {
      const response = await contractAPI.getInvoice(invoiceId);
      if (response.success) {
        return response.invoice;
      }
      throw new Error('Failed to get invoice details');
    } catch (error) {
      console.error('Failed to get invoice details:', error);
      throw error;
    }
  };

  // Get invoice by status
  const getInvoicesByStatus = async (status, limit = 10, offset = 0) => {
    try {
      const response = await contractAPI.getInvoicesByStatus(status, limit, offset);
      if (response.success) {
        return response.invoices;
      }
      throw new Error('Failed to get invoices by status');
    } catch (error) {
      console.error('Failed to get invoices by status:', error);
      throw error;
    }
  };

  // Format invoice status
  const formatInvoiceStatus = (status) => {
    const statusMap = {
      0: 'Created',
      1: 'Paid',
      2: 'Disputed',
      3: 'Resolved',
      4: 'Cancelled'
    };
    return statusMap[status] || 'Unknown';
  };

  // Get status color
  const getStatusColor = (status) => {
    const colorMap = {
      0: 'warning',    // Created
      1: 'success',    // Paid
      2: 'error',      // Disputed
      3: 'info',       // Resolved
      4: 'default'     // Cancelled
    };
    return colorMap[status] || 'default';
  };

  // Load invoices on account change (with debouncing)
  useEffect(() => {
    let timeoutId;
    
    if (account) {
      // Debounce the API call to prevent rapid successive calls
      timeoutId = setTimeout(() => {
        loadUserInvoices();
      }, 500);
    } else {
      setUserInvoices([]);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [account]);

  const value = {
    invoices,
    userInvoices,
    loading,
    contract,
    createInvoice,
    payInvoiceETH,
    payInvoiceToken,
    raiseDispute,
    cancelInvoice,
    getInvoiceDetails,
    getInvoicesByStatus,
    loadUserInvoices,
    formatInvoiceStatus,
    getStatusColor,
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
};
