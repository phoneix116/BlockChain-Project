import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Add,
  Receipt,
  Analytics,
  Settings,
  AccountBalanceWallet,
  Logout,
  ContentCopy,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';
import { toast } from 'react-toastify';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  { text: 'Create Invoice', icon: <Add />, path: '/create' },
  { text: 'Invoices', icon: <Receipt />, path: '/invoices' },
  { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
  { text: 'Settings', icon: <Settings />, path: '/settings' },
];

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    account,
    balance,
    network,
    isConnected,
    connectWallet,
    disconnectWallet,
    formatAddress,
    isConnecting,
  } = useWallet();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast.success('Address copied to clipboard!');
    }
    handleMenuClose();
  };

  const handleDisconnect = () => {
    disconnectWallet();
    handleMenuClose();
  };

  const drawer = (
    <Box
      sx={{
        height: '100%',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(148, 163, 184, 0.2)',
      }}
    >
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
          }
        }}
      >
        <Typography 
          variant="h5" 
          noWrap 
          component="div" 
          sx={{ 
            fontWeight: 700,
            color: '#f8fafc',
            background: 'linear-gradient(90deg, #f8fafc 0%, #60a5fa 50%, #f8fafc 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center',
            letterSpacing: '-0.025em'
          }}
        >
          InvoiceChain
        </Typography>
      </Box>
      <List sx={{ p: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  transform: 'translateX(4px)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(59, 130, 246, 0.2)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#3b82f6',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#f8fafc',
                    fontWeight: 600,
                  },
                },
                '& .MuiListItemIcon-root': {
                  color: '#94a3b8',
                  minWidth: 40,
                },
                '& .MuiListItemText-primary': {
                  color: '#94a3b8',
                  fontWeight: 500,
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              color: '#f8fafc',
              '&:hover': {
                bgcolor: 'rgba(59, 130, 246, 0.1)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              color: '#f8fafc',
              fontWeight: 600,
              background: 'linear-gradient(90deg, #f8fafc 0%, #60a5fa 50%, #f8fafc 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Blockchain Invoicing System
          </Typography>

          {/* Network indicator */}
          {network && (
            <Chip
              label={network.name}
              size="small"
              sx={{ 
                mr: 2,
                bgcolor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontWeight: 600
              }}
            />
          )}

          {/* Wallet connection */}
          {isConnected ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  display: { xs: 'none', md: 'block' },
                  color: '#94a3b8',
                  fontWeight: 500
                }}
              >
                {parseFloat(balance).toFixed(4)} ETH
              </Typography>
              
              <Button
                color="inherit"
                startIcon={<AccountBalanceWallet />}
                onClick={handleMenuClick}
                sx={{
                  bgcolor: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#f8fafc',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(59, 130, 246, 0.25)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    mr: 1, 
                    bgcolor: 'rgba(99, 102, 241, 0.8)',
                    color: '#f8fafc',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {account?.slice(2, 4).toUpperCase()}
                </Avatar>
                {formatAddress(account)}
              </Button>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                sx={{
                  '& .MuiPaper-root': {
                    background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 2,
                    mt: 1,
                  }
                }}
              >
                <MenuItem 
                  onClick={copyAddress}
                  sx={{
                    color: '#f8fafc',
                    '&:hover': {
                      bgcolor: 'rgba(59, 130, 246, 0.1)',
                    }
                  }}
                >
                  <ContentCopy fontSize="small" sx={{ mr: 1, color: '#3b82f6' }} />
                  Copy Address
                </MenuItem>
                <MenuItem 
                  onClick={handleDisconnect}
                  sx={{
                    color: '#f8fafc',
                    '&:hover': {
                      bgcolor: 'rgba(239, 68, 68, 0.1)',
                    }
                  }}
                >
                  <Logout fontSize="small" sx={{ mr: 1, color: '#ef4444' }} />
                  Disconnect
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Button
              color="inherit"
              variant="outlined"
              startIcon={<AccountBalanceWallet />}
              onClick={connectWallet}
              disabled={isConnecting}
              sx={{ 
                borderColor: 'rgba(59, 130, 246, 0.5)',
                color: '#f8fafc',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { 
                  borderColor: '#3b82f6',
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                },
                '&:disabled': {
                  borderColor: 'rgba(148, 163, 184, 0.3)',
                  color: 'rgba(148, 163, 184, 0.5)',
                },
                transition: 'all 0.3s ease'
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(148, 163, 184, 0.2)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(148, 163, 184, 0.2)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          minHeight: '100vh',
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Box sx={{ mt: 8 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
