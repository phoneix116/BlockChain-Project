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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
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

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, dueDate: date }));
    if (errors.dueDate) {
      setErrors(prev => ({ ...prev, dueDate: null }));
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
      <Box textAlign="center" mt={4}>
        <Alert severity="warning">
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
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Due Date"
                  value={formData.dueDate}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={!!errors.dueDate}
                      helperText={errors.dueDate}
                    />
                  )}
                  minDate={new Date()}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Token Address (Optional)"
                value={formData.tokenAddress}
                onChange={handleInputChange('tokenAddress')}
                placeholder="Leave empty for ETH payments"
                helperText="Enter ERC20 token address for token payments"
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
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                textAlign: 'center',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the PDF here' : 'Upload Invoice PDF'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Drag & drop a PDF file here, or click to select
              </Typography>
              <Typography variant="caption" display="block" mt={1}>
                Maximum file size: 10MB
              </Typography>
            </Paper>

            {formData.file && (
              <Alert severity="success" sx={{ mt: 2 }}>
                File selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
              </Alert>
            )}

            {errors.file && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errors.file}
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Invoice Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="body1">{formData.title}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Amount
                </Typography>
                <Typography variant="body1">{formData.amount} ETH</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Recipient
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                  {formData.recipient}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Due Date
                </Typography>
                <Typography variant="body1">
                  {formData.dueDate.toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1">
                  {formData.description || 'No description provided'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  PDF File
                </Typography>
                <Typography variant="body1">
                  {formData.file?.name} ({(formData.file?.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Invoice
      </Typography>

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}

          <Divider sx={{ my: 3 }} />

          <Box display="flex" justifyContent="space-between">
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Send />}
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
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
