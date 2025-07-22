import React from 'react';
import {
  Box,
  Typography,
  Alert,
} from '@mui/material';

const Settings = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      <Alert severity="info">
        Settings page coming soon! This will include:
        <ul>
          <li>Default invoice templates</li>
          <li>Notification preferences</li>
          <li>Payment gateway settings</li>
          <li>Tax configuration</li>
          <li>Account preferences</li>
        </ul>
      </Alert>
    </Box>
  );
};

export default Settings;
