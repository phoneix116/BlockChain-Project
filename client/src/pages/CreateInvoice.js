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
import { Upload, Receipt, Send } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

import { useWallet } from '../contexts/WalletContext';
import { useInvoice } from '../contexts/InvoiceContext';
import ipfsAPI from '../services/ipfsAPI';

const steps = ['Invoice Details', 'Upload PDF', 'Review & Submit'];

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
    file: null,
  });
  const [errors, setErrors] = useState({});

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFormData(prev => ({ ...prev, file: acceptedFiles[0] }));
        setErrors(prev => ({ ...prev, file: null }));
      }
    },
    onDropRejected: (rejectedFiles) => {
      const error = rejectedFiles[0]?.errors[0];
      if (error?.code === 'file-too-large') {
        setErrors(prev => ({ ...prev, file: 'File size must be less than 10MB' }));
      } else if (error?.code === 'file-invalid-type') {
        setErrors(prev => ({ ...prev, file: 'Only PDF files are allowed' }));
      } else {
        setErrors(prev => ({ ...prev, file: 'Invalid file' }));
      }
    }
  });

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

    if (step === 1) {
      if (!formData.file) {
        newErrors.file = 'PDF file is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) return; // Validate file again

    try {
      const result = await createInvoice(formData);
      
      toast.success(
        <div>
          <div>Invoice created successfully!</div>
          <div>Invoice ID: {result.invoiceId}</div>
        </div>
      );
      
      navigate(`/invoice/${result.invoiceId}`);
    } catch (error) {
      console.error('Failed to create invoice:', error);
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
            <Paper
              {...getRootProps()}
              sx={{
                p: 4,
                border: '2px dashed',
                borderColor: isDragActive ? '#3b82f6' : 'rgba(148, 163, 184, 0.3)',
                bgcolor: isDragActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.8)',
                cursor: 'pointer',
                textAlign: 'center',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: 'rgba(59, 130, 246, 0.05)',
                  borderColor: 'rgba(59, 130, 246, 0.5)',
                },
              }}
            >
              <input {...getInputProps()} />
              <Upload sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc', fontWeight: 600 }}>
                {isDragActive ? 'Drop the PDF here' : 'Upload Invoice PDF'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Drag & drop a PDF file here, or click to select
              </Typography>
              <Typography variant="caption" display="block" mt={1} sx={{ color: '#64748b' }}>
                Maximum file size: 10MB
              </Typography>
            </Paper>

            {formData.file && (
              <Alert 
                severity="success" 
                sx={{ 
                  mt: 2,
                  bgcolor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  color: '#22c55e',
                  '& .MuiAlert-icon': {
                    color: '#22c55e'
                  }
                }}
              >
                File selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
              </Alert>
            )}

            {errors.file && (
              <Alert 
                severity="error" 
                sx={{ 
                  mt: 2,
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  '& .MuiAlert-icon': {
                    color: '#ef4444'
                  }
                }}
              >
                {errors.file}
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc', fontWeight: 600, mb: 3 }}>
              Review Invoice Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(15, 23, 42, 0.8)', 
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Title
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 500 }}>
                    {formData.title}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(15, 23, 42, 0.8)', 
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Amount
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#22c55e', fontWeight: 600, fontSize: '1.1rem' }}>
                    {formData.amount} ETH
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(15, 23, 42, 0.8)', 
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Recipient
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#f8fafc', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {formData.recipient}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(15, 23, 42, 0.8)', 
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Due Date
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 500 }}>
                    {formData.dueDate.toLocaleDateString()}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(15, 23, 42, 0.8)', 
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#f8fafc' }}>
                    {formData.description || 'No description provided'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(15, 23, 42, 0.8)', 
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                    PDF File
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#3b82f6', fontWeight: 500 }}>
                    {formData.file?.name} ({(formData.file?.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                </Box>
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
                startIcon={<Receipt />}
                sx={{
                  bgcolor: 'rgba(59, 130, 246, 0.9)',
                  '&:hover': { bgcolor: '#3b82f6' },
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Next
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateInvoice;
