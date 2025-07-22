import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Container,
} from '@mui/material';

const Settings = () => {
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
          Application Settings
        </Typography>
        
        <Alert 
          severity="info"
          sx={{
            bgcolor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            color: '#6366f1',
            borderRadius: 2,
            '& .MuiAlert-icon': {
              color: '#6366f1'
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
            Settings configuration panel coming soon!
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
            This settings panel will provide comprehensive control over:
          </Typography>
          <ul>
            <li>Custom invoice templates and branding options</li>
            <li>Email and push notification preferences</li>
            <li>Multiple payment gateway integrations</li>
            <li>Tax rates and calculation configurations</li>
            <li>Personal account and security preferences</li>
            <li>Data export and backup settings</li>
          </ul>
        </Alert>
      </Container>
    </Box>
  );
};

export default Settings;
