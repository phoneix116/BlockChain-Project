import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Download, Payment, Gavel } from '@mui/icons-material';
import QRCode from 'react-qr-code';
import { useInvoice } from '../contexts/InvoiceContext';
import ipfsAPI from '../services/ipfsAPI';

const InvoiceDetails = () => {
  const { id } = useParams();
  const { getInvoiceDetails, formatInvoiceStatus, getStatusColor } = useInvoice();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true);
        const invoiceData = await getInvoiceDetails(id);
        setInvoice(invoiceData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadInvoice();
    }
  }, [id, getInvoiceDetails]);

  const handleDownloadPDF = async () => {
    if (invoice?.ipfsHash) {
      try {
        const blob = await ipfsAPI.downloadFile(invoice.ipfsHash);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="50vh"
        sx={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}
      >
        <CircularProgress size={60} sx={{ color: '#3b82f6' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Alert 
          severity="error" 
          sx={{
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            borderRadius: 2,
            '& .MuiAlert-icon': {
              color: '#ef4444'
            }
          }}
        >
          Failed to load invoice: {error}
        </Alert>
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box 
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          p: 3,
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
          Invoice not found
        </Alert>
      </Box>
    );
  }

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        p: 3
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: '#f8fafc', 
            fontWeight: 700,
            background: 'linear-gradient(90deg, #f8fafc 0%, #60a5fa 50%, #f8fafc 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Invoice #{id}
        </Typography>
        <Chip
          label={formatInvoiceStatus(invoice.status)}
          color={getStatusColor(invoice.status)}
          size="large"
          sx={{
            fontWeight: 600,
            fontSize: '0.875rem',
            height: 40,
            borderRadius: 3
          }}
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card 
            sx={{
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
              <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc', fontWeight: 600, mb: 3 }}>
                Invoice Details
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={6}>
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
                    <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 700 }}>
                      {(parseFloat(invoice.amount) / 1e18).toFixed(4)} ETH
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
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
                      {new Date(invoice.dueDate).toLocaleDateString()}
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
                      {invoice.description || 'No description provided'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3, borderColor: 'rgba(148, 163, 184, 0.2)' }} />

              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(15, 23, 42, 0.8)', 
                      borderRadius: 2,
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                      Issuer
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#f8fafc', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {invoice.issuer}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
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
                    <Typography variant="body1" sx={{ color: '#f8fafc', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {invoice.recipient}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card 
            sx={{
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
                background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc', fontWeight: 600, mb: 3 }}>
                Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleDownloadPDF}
                  fullWidth
                  sx={{
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                    color: '#94a3b8',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      color: '#3b82f6',
                      bgcolor: 'rgba(59, 130, 246, 0.1)'
                    },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Download PDF
                </Button>
                {invoice.status === 0 && (
                  <Button
                    variant="contained"
                    startIcon={<Payment />}
                    fullWidth
                    sx={{
                      bgcolor: 'rgba(59, 130, 246, 0.9)',
                      '&:hover': { bgcolor: '#3b82f6' },
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Pay Invoice
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          <Card 
            sx={{ 
              mt: 2,
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
                background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)',
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc', fontWeight: 600, mb: 3 }}>
                QR Code
              </Typography>
              <Box 
                display="flex" 
                justifyContent="center" 
                sx={{
                  p: 2,
                  bgcolor: '#ffffff',
                  borderRadius: 2,
                  border: '2px solid rgba(148, 163, 184, 0.2)'
                }}
              >
                <QRCode
                  value={window.location.href}
                  size={150}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvoiceDetails;
