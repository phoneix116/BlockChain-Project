import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Container,
} from '@mui/material';

const Analytics = () => {
  return (
    <Box 
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        p: 3
      }}
    >
      <Container maxWidth="lg">
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            color: '#f8fafc', 
            fontWeight: 700,
            mb: 4,
            textAlign: 'center',
            background: 'linear-gradient(90deg, #f8fafc 0%, #60a5fa 50%, #f8fafc 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Analytics Dashboard
        </Typography>
        
        <Alert 
          severity="info"
          sx={{
            bgcolor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            color: '#3b82f6',
            borderRadius: 2,
            '& .MuiAlert-icon': {
              color: '#3b82f6'
            },
            '& ul': {
              color: '#94a3b8',
              mt: 1
            },
            '& li': {
              mb: 0.5
            }
          }}
        >
          <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 600, mb: 2 }}>
            Analytics dashboard coming soon!
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
            This comprehensive dashboard will include:
          </Typography>
          <ul>
            <li>Real-time invoice payment trends and metrics</li>
            <li>Revenue analytics with visual charts and graphs</li>
            <li>Payment success rates and conversion statistics</li>
            <li>Geographic distribution of transactions</li>
            <li>Detailed monthly and yearly financial reports</li>
            <li>Performance insights and recommendations</li>
          </ul>
        </Alert>
      </Container>
    </Box>
  );
};

export default Analytics;
