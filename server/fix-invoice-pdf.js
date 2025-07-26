require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('./models/Invoice');
const pdfGenerator = require('./services/pdfGenerator');
const FormData = require('form-data');
const axios = require('axios');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixInvoicePDF() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Find the invoice without IPFS hash
    const invoice = await Invoice.findOne({ invoiceId: 'INV-1753520272331-YG0FP1' });
    
    if (!invoice) {
      console.log('❌ Invoice not found');
      return;
    }
    
    console.log('📋 Found invoice:', invoice.invoiceId);
    console.log('Current IPFS Hash:', invoice.ipfsHash || 'NOT SET');
    
    if (invoice.ipfsHash) {
      console.log('✅ Invoice already has IPFS hash');
      return;
    }
    
    // Generate PDF for this invoice
    console.log('🔨 Generating PDF...');
    const metadata = {
      invoiceId: invoice.invoiceId,
      title: invoice.title,
      description: invoice.description,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      issuerName: invoice.issuerName,
      issuerEmail: invoice.issuerEmail,
      recipientName: invoice.recipientName,
      recipientEmail: invoice.recipientEmail,
      issuerWallet: invoice.issuerWallet,
      recipientWallet: invoice.recipientWallet,
      notes: invoice.notes,
      filename: `invoice-${invoice.invoiceId}.pdf`
    };
    
    const pdfBytes = await pdfGenerator.generateInvoicePDF(metadata);
    console.log('✅ PDF generated, size:', pdfBytes.length, 'bytes');
    
    // Upload to Pinata
    console.log('📤 Uploading to Pinata...');
    const formData = new FormData();
    formData.append('file', Buffer.from(pdfBytes), {
      filename: metadata.filename,
      contentType: 'application/pdf'
    });

    const pinataMetadata = JSON.stringify({
      name: metadata.title || 'Blockchain Invoice',
      type: 'invoice-pdf'
    });

    formData.append('pinataMetadata', pinataMetadata);
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

    const formHeaders = {};
    if (typeof formData.getHeaders === 'function') {
      Object.assign(formHeaders, formData.getHeaders());
    }
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
          ...formHeaders
        },
        timeout: 60000
      }
    );

    if (response.data && response.data.IpfsHash) {
      // Update invoice with IPFS hash
      invoice.ipfsHash = response.data.IpfsHash;
      await invoice.save();
      
      console.log('✅ PDF uploaded to Pinata!');
      console.log('IPFS Hash:', response.data.IpfsHash);
      console.log('📄 IPFS URL: https://gateway.pinata.cloud/ipfs/' + response.data.IpfsHash);
      console.log('✅ Invoice updated in database');
    } else {
      console.error('❌ Invalid response from Pinata:', response.data);
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

fixInvoicePDF();
