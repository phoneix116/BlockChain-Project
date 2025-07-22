import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Grid,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search,
  Visibility,
  FilterList,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useInvoice } from '../contexts/InvoiceContext';

const InvoiceList = () => {
  const navigate = useNavigate();
  const { isConnected, account, formatAddress } = useWallet();
  const { userInvoices, loading, loadUserInvoices, formatInvoiceStatus, getStatusColor } = useInvoice();

  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (isConnected && account) {
      loadUserInvoices();
    }
  }, [isConnected, account, loadUserInvoices]);

  useEffect(() => {
    let filtered = [...userInvoices];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.id.includes(searchTerm) ||
        invoice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.recipient.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === parseInt(statusFilter));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'amount':
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate);
          bValue = new Date(b.dueDate);
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredInvoices(filtered);
  }, [userInvoices, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleRefresh = () => {
    loadUserInvoices();
  };

  const handleViewInvoice = (invoiceId) => {
    navigate(`/invoice/${invoiceId}`);
  };

  const formatAmount = (amount) => {
    return (parseFloat(amount) / 1e18).toFixed(4);
  };

  const getStatusBadge = (status) => (
    <Chip
      label={formatInvoiceStatus(status)}
      color={getStatusColor(status)}
      size="small"
      variant="outlined"
    />
  );

  if (!isConnected) {
    return (
      <Box textAlign="center" mt={4}>
        <Alert severity="warning">
          Please connect your wallet to view your invoices.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          My Invoices
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                placeholder="Search by ID, description, or recipient"
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                fullWidth
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="0">Created</MenuItem>
                <MenuItem value="1">Paid</MenuItem>
                <MenuItem value="2">Disputed</MenuItem>
                <MenuItem value="3">Resolved</MenuItem>
                <MenuItem value="4">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                fullWidth
                select
                label="Sort By"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="createdAt">Created Date</MenuItem>
                <MenuItem value="dueDate">Due Date</MenuItem>
                <MenuItem value="amount">Amount</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                select
                label="Order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <MenuItem value="desc">Newest First</MenuItem>
                <MenuItem value="asc">Oldest First</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : filteredInvoices.length === 0 ? (
            <Alert severity="info">
              {userInvoices.length === 0 
                ? "No invoices found. Create your first invoice to get started!"
                : "No invoices match your current filters."
              }
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">
                          #{invoice.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={invoice.recipient}>
                          <Typography variant="body2">
                            {formatAddress(invoice.recipient)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatAmount(invoice.amount)} ETH
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewInvoice(invoice.id)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredInvoices.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Showing {filteredInvoices.length} of {userInvoices.length} invoices
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default InvoiceList;
