import React from 'react';
import {
  Box,
  Typography,
  Alert,
} from '@mui/material';

const Analytics = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Analytics
      </Typography>
      
      <Alert severity="info">
        Analytics dashboard coming soon! This will include:
        <ul>
          <li>Invoice payment trends</li>
          <li>Revenue analytics</li>
          <li>Payment success rates</li>
          <li>Geographic distribution</li>
          <li>Monthly/yearly reports</li>
        </ul>
      </Alert>
    </Box>
  );
};

export default Analytics;
