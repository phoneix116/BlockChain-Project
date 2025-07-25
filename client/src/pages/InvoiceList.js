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
  Container,
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
        (invoice.recipient?.walletAddress || invoice.recipient || '').toLowerCase().includes(searchTerm.toLowerCase())
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
    try {
      if (!amount) return '0.0000';
      const numAmount = typeof amount === 'object' ? parseFloat(amount.toString()) : parseFloat(amount);
      return isNaN(numAmount) ? '0.0000' : numAmount.toFixed(4);
    } catch (error) {
      console.warn('Error formatting amount:', error);
      return '0.0000';
    }
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
      <Box 
        sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #475569 75%, #64748b 100%)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(147, 197, 253, 0.1) 0%, transparent 50%)
            `,
            pointerEvents: 'none',
          }
        }}
      >
        <Container maxWidth="xl" sx={{ pt: 4, position: 'relative', zIndex: 1 }}>
          <Alert 
            severity="warning"
            sx={{
              background: 'linear-gradient(145deg, rgba(120, 53, 15, 0.95) 0%, rgba(146, 64, 14, 0.95) 100%)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            Please connect your wallet to view your invoices.
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #475569 75%, #64748b 100%)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(147, 197, 253, 0.1) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        }
      }}
    >
      <Container maxWidth="xl" sx={{ pt: 4, pb: 4, position: 'relative', zIndex: 1 }}>
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Typography 
              variant="h3" 
              component="h1"
              sx={{
                fontWeight: 700,
                color: '#f8fafc',
                fontSize: { xs: '2rem', md: '2.5rem' },
                letterSpacing: '-0.025em'
              }}
            >
              My Invoices
            </Typography>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
              sx={{
                bgcolor: 'rgba(59, 130, 246, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.25)',
                '&:hover': {
                  bgcolor: 'rgba(59, 130, 246, 1)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 15px 35px rgba(59, 130, 246, 0.35)',
                },
                '&:disabled': {
                  bgcolor: 'rgba(59, 130, 246, 0.5)',
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Box>
          <Card 
            sx={{ 
              mb: 4,
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 3,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)',
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                }}
                placeholder="Search by ID, description, or recipient"
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
                  '& .MuiInputBase-input::placeholder': {
                    color: '#64748b',
                    opacity: 1,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                fullWidth
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                  '& .MuiSelect-select': {
                    color: '#f8fafc',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#94a3b8',
                  },
                }}
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
                  '& .MuiSelect-select': {
                    color: '#f8fafc',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#94a3b8',
                  },
                }}
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
                  '& .MuiSelect-select': {
                    color: '#f8fafc',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#94a3b8',
                  },
                }}
              >
                <MenuItem value="desc">Newest First</MenuItem>
                <MenuItem value="asc">Oldest First</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card 
        sx={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: 3,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)',
          }
        }}
      >
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
                    <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>ID</TableCell>
                    <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>Recipient</TableCell>
                    <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>Created</TableCell>
                    <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>Due Date</TableCell>
                    <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} hover sx={{ '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.1)' } }}>
                      <TableCell sx={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                        <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                          #{invoice.id}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                        <Tooltip title={invoice.recipient?.walletAddress || invoice.recipient}>
                          <Typography variant="body2" sx={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                            {formatAddress(invoice.recipient?.walletAddress || invoice.recipient)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                        <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 600 }}>
                          {formatAmount(invoice.amount)} ETH
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewInvoice(invoice.id)}
                            sx={{ 
                              color: '#94a3b8',
                              '&:hover': { 
                                color: '#3b82f6',
                                bgcolor: 'rgba(59, 130, 246, 0.1)' 
                              }
                            }}
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
        <Card 
          sx={{ 
            mt: 2,
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
          }}
        >
          <CardContent>
            <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>
              Showing {filteredInvoices.length} of {userInvoices.length} invoices
            </Typography>
          </CardContent>
        </Card>
      )}
        </Box>
      </Container>
    </Box>
  );
};

export default InvoiceList;
