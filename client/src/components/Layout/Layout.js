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
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          InvoiceChain
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Blockchain Invoicing System
          </Typography>

          {/* Network indicator */}
          {network && (
            <Chip
              label={network.name}
              size="small"
              color="secondary"
              sx={{ mr: 2 }}
            />
          )}

          {/* Wallet connection */}
          {isConnected ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>
                {parseFloat(balance).toFixed(4)} ETH
              </Typography>
              
              <Button
                color="inherit"
                startIcon={<AccountBalanceWallet />}
                onClick={handleMenuClick}
                sx={{ textTransform: 'none' }}
              >
                <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'secondary.main' }}>
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
              >
                <MenuItem onClick={copyAddress}>
                  <ContentCopy fontSize="small" sx={{ mr: 1 }} />
                  Copy Address
                </MenuItem>
                <MenuItem onClick={handleDisconnect}>
                  <Logout fontSize="small" sx={{ mr: 1 }} />
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
              sx={{ borderColor: 'white', '&:hover': { borderColor: 'white' } }}
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
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
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
