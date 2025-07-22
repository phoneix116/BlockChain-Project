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
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load invoice: {error}
      </Alert>
    );
  }

  if (!invoice) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Invoice not found
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Invoice #{id}</Typography>
        <Chip
          label={formatInvoiceStatus(invoice.status)}
          color={getStatusColor(invoice.status)}
          size="large"
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Invoice Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="h5">
                    {(parseFloat(invoice.amount) / 1e18).toFixed(4)} ETH
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Due Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {invoice.description || 'No description provided'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Issuer
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {invoice.issuer}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Recipient
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {invoice.recipient}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleDownloadPDF}
                  fullWidth
                >
                  Download PDF
                </Button>
                {invoice.status === 0 && (
                  <Button
                    variant="contained"
                    startIcon={<Payment />}
                    fullWidth
                  >
                    Pay Invoice
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                QR Code
              </Typography>
              <Box display="flex" justifyContent="center">
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
