const mongoose = require('mongoose');
const Invoice = require('./models/Invoice');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

async function checkInvoiceIPFS() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Find the most recent invoice
    const recentInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    
    if (recentInvoice) {
      console.log('📋 Most recent invoice:');
      console.log('ID:', recentInvoice.invoiceId);
      console.log('Amount:', recentInvoice.amount);
      console.log('Status:', recentInvoice.status);
      console.log('IPFS Hash:', recentInvoice.ipfsHash || 'NOT SET');
      console.log('Created:', recentInvoice.createdAt);
      console.log('---');
      
      if (!recentInvoice.ipfsHash) {
        console.log('❌ Invoice missing IPFS hash - PDF upload likely failed');
      } else {
        console.log('✅ Invoice has IPFS hash - PDF should be downloadable');
        console.log('📄 IPFS URL: https://gateway.pinata.cloud/ipfs/' + recentInvoice.ipfsHash);
      }
    } else {
      console.log('❌ No invoices found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkInvoiceIPFS();
