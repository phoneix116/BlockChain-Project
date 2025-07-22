import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from '@mui/material';

import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceList from './pages/InvoiceList';
import InvoiceDetails from './pages/InvoiceDetails';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function App() {
  return (
    <Layout>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreateInvoice />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/invoice/:id" element={<InvoiceDetails />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Container>
    </Layout>
  );
}

export default App;
