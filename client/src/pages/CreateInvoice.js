import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import { Receipt, Send } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

import { useWallet } from '../contexts/WalletContext';
import { useInvoice } from '../contexts/InvoiceContext';
import invoiceAPI from '../services/invoiceAPI';

const steps = ['Invoice Details', 'Preview & Submit'];

const CreateInvoice = () => {
  const navigate = useNavigate();
  const { isConnected, account } = useWallet();
  const { createInvoice, loading } = useInvoice();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    recipient: '',
    amount: '',
    tokenAddress: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  });
  const [errors, setErrors] = useState({});
  const [pdfBlob, setPdfBlob] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 0) {
      if (!formData.title.trim()) {
        newErrors.title = 'Title is required';
      }
      if (!formData.recipient.trim()) {
        newErrors.recipient = 'Recipient address is required';
      } else if (!ethers.utils.isAddress(formData.recipient)) {
        newErrors.recipient = 'Invalid Ethereum address';
      } else if (formData.recipient.toLowerCase() === account?.toLowerCase()) {
        newErrors.recipient = 'Cannot create invoice for yourself';
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      }
      if (formData.dueDate < new Date()) {
        newErrors.dueDate = 'Due date must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generatePDFPreview = async () => {
    if (!validateStep(0)) return;

    try {
      setGeneratingPDF(true);
      const blob = await invoiceAPI.previewInvoicePDF(formData);
      setPdfBlob(blob);
      setActiveStep(1);
    } catch (error) {
      console.error('Failed to generate PDF preview:', error);
      toast.error('Failed to generate PDF preview');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      generatePDFPreview();
    } else if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      // Generate invoice with automatic PDF creation and IPFS upload
      const result = await invoiceAPI.generateInvoice(formData);
      
      console.log('Generated invoice result:', result);
      
      // Access IPFS hash from nested data structure
      const ipfsHash = result.data?.ipfsHash || result.ipfsHash;
      
      if (!ipfsHash) {
        throw new Error('No IPFS hash received from PDF generation');
      }
      
      // Use the generated IPFS hash to create the blockchain invoice
      const invoiceData = {
        ...formData,
        ipfsHash: ipfsHash
      };
      
      const blockchainResult = await createInvoice(invoiceData);
      
      toast.success(
        <div>
          <div>Invoice created successfully!</div>
          <div>Invoice ID: {blockchainResult.invoiceId}</div>
          <div>PDF stored on IPFS: {ipfsHash}</div>
        </div>
      );
      
      navigate(`/invoice/${blockchainResult.invoiceId}`);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Failed to create invoice: ' + error.message);
    }
  };

  if (!isConnected) {
    return (
      <Box 
        textAlign="center" 
        mt={4}
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Alert 
          severity="warning"
          sx={{
            bgcolor: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            color: '#fbbf24',
            borderRadius: 2,
            '& .MuiAlert-icon': {
              color: '#fbbf24'
            }
          }}
        >
          Please connect your wallet to create an invoice.
        </Alert>
      </Box>
    );
  }

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Invoice Title"
                value={formData.title}
                onChange={handleInputChange('title')}
                error={!!errors.title}
                helperText={errors.title}
                placeholder="e.g., Web Development Services"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(15, 23, 42, 0.8)',
                    '& fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#94a3b8',
                    '&.Mui-focused': {
                      color: '#3b82f6',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#f8fafc',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#ef4444',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange('description')}
                placeholder="Brief description of services or products"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(15, 23, 42, 0.8)',
                    '& fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#94a3b8',
                    '&.Mui-focused': {
                      color: '#3b82f6',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#f8fafc',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recipient Address"
                value={formData.recipient}
                onChange={handleInputChange('recipient')}
                error={!!errors.recipient}
                helperText={errors.recipient}
                placeholder="0x..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(15, 23, 42, 0.8)',
                    '& fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#94a3b8',
                    '&.Mui-focused': {
                      color: '#3b82f6',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#ef4444',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount (ETH)"
                type="number"
                value={formData.amount}
                onChange={handleInputChange('amount')}
                error={!!errors.amount}
                helperText={errors.amount}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(15, 23, 42, 0.8)',
                    '& fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#94a3b8',
                    '&.Mui-focused': {
                      color: '#3b82f6',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#f8fafc',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#ef4444',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Due Date"
                type="date"
                fullWidth
                value={formData.dueDate ? formData.dueDate.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setFormData(prev => ({ ...prev, dueDate: date }));
                  setErrors(prev => ({ ...prev, dueDate: null }));
                }}
                error={!!errors.dueDate}
                helperText={errors.dueDate}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(15, 23, 42, 0.8)',
                    '& fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#94a3b8',
                    '&.Mui-focused': {
                      color: '#3b82f6',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#f8fafc',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#ef4444',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Token Address (Optional)"
                value={formData.tokenAddress}
                onChange={handleInputChange('tokenAddress')}
                placeholder="Leave empty for ETH payments"
                helperText="Enter ERC20 token address for token payments"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(15, 23, 42, 0.8)',
                    '& fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#94a3b8',
                    '&.Mui-focused': {
                      color: '#3b82f6',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#94a3b8',
                  },
                }}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc', fontWeight: 600, mb: 3 }}>
              Review Invoice Details & PDF Preview
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc', fontWeight: 600, mb: 2 }}>
                  Invoice Details
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Title
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 500 }}>
                    {formData.title}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Recipient
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#f8fafc', fontFamily: 'monospace' }}>
                    {formData.recipient}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Amount
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 500 }}>
                    {formData.amount} ETH
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Due Date
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#f8fafc' }}>
                    {new Date(formData.dueDate).toLocaleDateString()}
                  </Typography>
                </Box>

                {formData.description && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#f8fafc' }}>
                      {formData.description}
                    </Typography>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc', fontWeight: 600, mb: 2 }}>
                  PDF Preview
                </Typography>
                
                {pdfBlob ? (
                  <Box>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: 2,
                        textAlign: 'center'
                      }}
                    >
                      <Receipt sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
                      <Typography variant="body1" sx={{ color: '#f8fafc', mb: 2 }}>
                        PDF Generated Successfully
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                        Size: {(pdfBlob.size / 1024).toFixed(1)} KB
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          const url = URL.createObjectURL(pdfBlob);
                          window.open(url, '_blank');
                          URL.revokeObjectURL(url);
                        }}
                        sx={{
                          borderColor: '#3b82f6',
                          color: '#3b82f6',
                          '&:hover': {
                            borderColor: '#2563eb',
                            bgcolor: 'rgba(59, 130, 246, 0.1)'
                          }
                        }}
                      >
                        Preview PDF
                      </Button>
                    </Paper>
                  </Box>
                ) : (
                  <Alert
                    severity="info"
                    sx={{
                      bgcolor: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      color: '#3b82f6',
                      '& .MuiAlert-icon': {
                        color: '#3b82f6'
                      }
                    }}
                  >
                    PDF will be generated automatically when you proceed to the next step.
                  </Alert>
                )}
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        p: 3
      }}
    >
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{ 
          color: '#f8fafc', 
          fontWeight: 700,
          mb: 4,
          textAlign: 'center',
          background: 'linear-gradient(90deg, #f8fafc 0%, #60a5fa 50%, #f8fafc 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        Create New Invoice
      </Typography>

      <Card 
        sx={{
          maxWidth: 800,
          mx: 'auto',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          borderRadius: 3,
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
          }
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stepper 
            activeStep={activeStep} 
            sx={{ 
              mb: 4,
              '& .MuiStepLabel-label': {
                color: '#94a3b8',
                '&.Mui-active': {
                  color: '#3b82f6'
                },
                '&.Mui-completed': {
                  color: '#22c55e'
                }
              },
              '& .MuiStepIcon-root': {
                color: 'rgba(148, 163, 184, 0.5)',
                '&.Mui-active': {
                  color: '#3b82f6'
                },
                '&.Mui-completed': {
                  color: '#22c55e'
                }
              }
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}

          <Divider sx={{ my: 3, borderColor: 'rgba(148, 163, 184, 0.2)' }} />

          <Box display="flex" justifyContent="space-between">
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{
                color: '#94a3b8',
                '&:hover': {
                  bgcolor: 'rgba(148, 163, 184, 0.1)'
                },
                '&:disabled': {
                  color: 'rgba(148, 163, 184, 0.3)'
                }
              }}
            >
              Back
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                sx={{
                  bgcolor: 'rgba(59, 130, 246, 0.9)',
                  '&:hover': { bgcolor: '#3b82f6' },
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={generatingPDF}
                startIcon={generatingPDF ? <CircularProgress size={20} /> : <Receipt />}
                sx={{
                  bgcolor: 'rgba(59, 130, 246, 0.9)',
                  '&:hover': { bgcolor: '#3b82f6' },
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                {generatingPDF ? 'Generating PDF...' : 'Generate PDF & Continue'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateInvoice;
