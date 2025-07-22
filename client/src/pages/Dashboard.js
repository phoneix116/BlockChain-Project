import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Receipt,
  Add,
  TrendingUp,
  AccountBalanceWallet,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useInvoice } from '../contexts/InvoiceContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isConnected, account } = useWallet();
  const { userInvoices, loading, loadUserInvoices, formatInvoiceStatus, getStatusColor } = useInvoice();
  
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    disputed: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    if (isConnected && account) {
      loadUserInvoices();
    }
  }, [isConnected, account, loadUserInvoices]);

  useEffect(() => {
    if (userInvoices.length > 0) {
      const newStats = userInvoices.reduce((acc, invoice) => {
        acc.total += 1;
        
        switch (invoice.status) {
          case 1: // Paid
            acc.paid += 1;
            break;
          case 0: // Created/Pending
            acc.pending += 1;
            break;
          case 2: // Disputed
            acc.disputed += 1;
            break;
          default:
            break;
        }
        
        acc.totalAmount += parseFloat(invoice.amount) / 1e18; // Convert from wei
        return acc;
      }, {
        total: 0,
        paid: 0,
        pending: 0,
        disputed: 0,
        totalAmount: 0,
      });
      
      setStats(newStats);
    }
  }, [userInvoices]);

  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              {value}
            </Typography>
          </Box>
          <Box color={`${color}.main`}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (!isConnected) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
        textAlign="center"
      >
        <AccountBalanceWallet sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Connect Your Wallet
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Please connect your wallet to start using the blockchain invoicing system.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/create')}
          size="large"
        >
          Create Invoice
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Invoices"
            value={stats.total}
            icon={<Receipt sx={{ fontSize: 40 }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Paid"
            value={stats.paid}
            icon={<CheckCircle sx={{ fontSize: 40 }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<Warning sx={{ fontSize: 40 }} />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Amount"
            value={`${stats.totalAmount.toFixed(2)} ETH`}
            icon={<TrendingUp sx={{ fontSize: 40 }} />}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Invoices */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" component="h2">
                  Recent Invoices
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/invoices')}
                >
                  View All
                </Button>
              </Box>
              
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : userInvoices.length === 0 ? (
                <Alert severity="info">
                  No invoices found. Create your first invoice to get started!
                </Alert>
              ) : (
                <List>
                  {userInvoices.slice(0, 5).map((invoice) => (
                    <ListItem
                      key={invoice.id}
                      button
                      onClick={() => navigate(`/invoice/${invoice.id}`)}
                      divider
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">
                              Invoice #{invoice.id}
                            </Typography>
                            <Chip
                              label={formatInvoiceStatus(invoice.status)}
                              color={getStatusColor(invoice.status)}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Amount: {(parseFloat(invoice.amount) / 1e18).toFixed(4)} ETH
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Due: {new Date(invoice.dueDate).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Add />}
                  onClick={() => navigate('/create')}
                >
                  Create New Invoice
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Receipt />}
                  onClick={() => navigate('/invoices')}
                >
                  View All Invoices
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<TrendingUp />}
                  onClick={() => navigate('/analytics')}
                >
                  View Analytics
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Account Summary
              </Typography>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Connected Address:
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all', mb: 1 }}>
                  {account}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Invoices: {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Success Rate: {stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
