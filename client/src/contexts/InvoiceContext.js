import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useWallet } from './WalletContext';
import contractAPI from '../services/contractAPI';
import invoiceAPI from '../services/invoiceAPI';

const InvoiceContext = createContext();

export const useInvoice = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoice must be used within an InvoiceProvider');
  }
  return context;
};

export const InvoiceProvider = ({ children }) => {
  const { signer, account } = useWallet();
  const [userInvoices, setUserInvoices] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [lastLoadTime, setLastLoadTime] = useState(0);

  // Rate limiting: prevent API calls more frequent than once per 5 seconds
  const MIN_LOAD_INTERVAL = 5000;

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

  // Load user data and invoices from MongoDB
  const loadUserInvoices = useCallback(async () => {
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
      // Load user info and invoices from MongoDB
      const [userResponse, invoicesResponse] = await Promise.all([
        invoiceAPI.createOrGetUser({ walletAddress: account }),
        invoiceAPI.getUserInvoices(account)
      ]);

      if (userResponse.user) {
        setUserInfo(userResponse.user);
      }

      if (invoicesResponse.results) {
        setUserInvoices(invoicesResponse.results);
      } else {
        setUserInvoices([]);
      }
    } catch (error) {
      // Only log non-network errors to reduce console noise
      if (!error.message?.includes('Network error') && !error.message?.includes('Rate limit')) {
        console.error('Failed to load user data:', error.message);
      }
      
      // Only show toast for meaningful errors, avoid duplicates
      if (error.message?.includes('Network error')) {
        // Don't show network error toasts as they're usually temporary
      } else if (!document.querySelector('.Toastify__toast--error')) {
        toast.error('Failed to load invoices: ' + error.message);
      }
      setUserInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [account, lastLoadTime]);

  // Create invoice with MongoDB and blockchain
  const createInvoice = async (invoiceData) => {
    if (!contract || !signer || !account) {
      throw new Error('Contract or wallet not available');
    }

    try {
      setLoading(true);

      // Use the complete invoice creation workflow
      const result = await invoiceAPI.createCompleteInvoice(
        invoiceData, 
        account, 
        userInfo
      );

      const { invoice, pdf, error } = result;
      
      // Handle partial success (metadata created but PDF upload failed)
      if (error) {
        // Store the invoice in our local state even if PDF failed
        setUserInvoices(prev => [invoice, ...prev]);
        toast.warning(error);
        setLoading(false);
        return { success: false, invoice, error };
      }
      
      if (!pdf || !pdf.ipfsHash) {
        throw new Error('Failed to upload PDF to IPFS');
      }

      // Convert due date to timestamp
      const dueTimestamp = Math.floor(new Date(invoiceData.dueDate).getTime() / 1000);

      // Create invoice on blockchain
      const tx = await contract.createInvoice(
        pdf.ipfsHash,
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
      const blockchainInvoiceId = event?.args?.id?.toString();

      // Update the invoice in MongoDB with blockchain transaction details
      if (blockchainInvoiceId) {
        await invoiceAPI.updateInvoice(invoice._id, {
          blockchainId: blockchainInvoiceId,
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          status: 'pending'
        });
      }

      toast.success('Invoice created successfully!');
      
      // Reload user invoices
      await loadUserInvoices();

      return {
        success: true,
        invoiceId: blockchainInvoiceId,
        mongoId: invoice._id,
        txHash: receipt.transactionHash,
        ipfsHash: pdf.ipfsHash
      };
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Failed to create invoice: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Pay invoice with ETH (also update MongoDB status)
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

      // Update status in MongoDB
      try {
        // Find the invoice by blockchain ID and mark as paid
        const invoices = await invoiceAPI.searchInvoices({ 
          walletAddress: account, 
          blockchainId: invoiceId 
        });
        
        if (invoices.results && invoices.results.length > 0) {
          await invoiceAPI.markInvoiceAsPaid(invoices.results[0]._id, receipt.transactionHash);
        }
      } catch (dbError) {
        console.error('Failed to update invoice status in database:', dbError);
        // Don't fail the entire operation for database update errors
      }

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

  // MongoDB-specific methods
  const searchInvoices = async (filters) => {
    try {
      setLoading(true);
      const response = await invoiceAPI.searchInvoices({ 
        walletAddress: account, 
        ...filters 
      });
      return response.results || [];
    } catch (error) {
      console.error('Failed to search invoices:', error);
      toast.error('Failed to search invoices');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getDashboardData = async () => {
    if (!account) return null;
    
    try {
      setLoading(true);
      return await invoiceAPI.getDashboardData(account);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateUserInfo = async (updatedInfo) => {
    try {
      const response = await invoiceAPI.updateUserPreferences(account, updatedInfo);
      if (response.user) {
        setUserInfo(response.user);
        toast.success('Profile updated successfully');
      }
      return response;
    } catch (error) {
      console.error('Failed to update user info:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  const getInvoiceTemplates = async () => {
    try {
      const response = await invoiceAPI.getUserTemplates(account);
      return response.templates || [];
    } catch (error) {
      console.error('Failed to load templates:', error);
      return [];
    }
  };

  const createInvoiceTemplate = async (templateData) => {
    try {
      const response = await invoiceAPI.createTemplate({
        ...templateData,
        walletAddress: account
      });
      toast.success('Template created successfully');
      return response.template;
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template');
      throw error;
    }
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
      setUserInfo(null);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [account]); // Removed loadUserInvoices to prevent infinite loop

  const value = {
    userInvoices,
    userInfo,
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
    searchInvoices,
    getDashboardData,
    updateUserInfo,
    getInvoiceTemplates,
    createInvoiceTemplate,
    formatInvoiceStatus,
    getStatusColor,
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
};
