const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

class InvoicePDFGenerator {
  async generateInvoicePDF(invoiceData) {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      
      // Add a page with A4 dimensions
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
      
      // Load fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Define colors
      const black = rgb(0, 0, 0);
      const darkBlue = rgb(0.1, 0.2, 0.6);
      const lightGray = rgb(0.9, 0.9, 0.9);
      const gray = rgb(0.5, 0.5, 0.5);
      
      // Page dimensions
      const { width, height } = page.getSize();
      const margin = 50;
      
      // Helper function to format currency
      const formatETH = (amount) => {
        // Amount is already in ETH from frontend, no need to divide by 1e18
        return `${parseFloat(amount).toFixed(4)} ETH`;
      };
      
      // Helper function to format date
      const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };
      
      let yPosition = height - margin;
      
      // Header Section
      page.drawText('BLOCKCHAIN INVOICE', {
        x: margin,
        y: yPosition,
        size: 28,
        font: helveticaBoldFont,
        color: darkBlue,
      });
      
      yPosition -= 20;
      page.drawText('Decentralized Invoice System', {
        x: margin,
        y: yPosition,
        size: 12,
        font: helveticaFont,
        color: gray,
      });
      
      // Invoice number and date (right aligned)
      const invoiceText = `Invoice #${invoiceData.id || 'N/A'}`;
      const dateText = `Date: ${formatDate(invoiceData.createdAt || new Date())}`;
      
      page.drawText(invoiceText, {
        x: width - margin - 150,
        y: height - margin,
        size: 18,
        font: helveticaBoldFont,
        color: black,
      });
      
      page.drawText(dateText, {
        x: width - margin - 150,
        y: height - margin - 25,
        size: 12,
        font: helveticaFont,
        color: gray,
      });
      
      yPosition -= 60;
      
      // Draw separator line
      page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 2,
        color: darkBlue,
      });
      
      yPosition -= 30;
      
      // Billing Information Section
      page.drawText('BILL TO:', {
        x: margin,
        y: yPosition,
        size: 14,
        font: helveticaBoldFont,
        color: black,
      });
      
      yPosition -= 25;
      
      // Client information
      const clientAddress = invoiceData.recipient || 'N/A';
      page.drawText('Ethereum Address:', {
        x: margin,
        y: yPosition,
        size: 11,
        font: helveticaBoldFont,
        color: black,
      });
      
      yPosition -= 18;
      page.drawText(clientAddress, {
        x: margin,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: gray,
        maxWidth: width - 2 * margin,
      });
      
      yPosition -= 40;
      
      // Invoice Details Section
      page.drawText('INVOICE DETAILS', {
        x: margin,
        y: yPosition,
        size: 14,
        font: helveticaBoldFont,
        color: black,
      });
      
      yPosition -= 30;
      
      // Create table header background
      page.drawRectangle({
        x: margin,
        y: yPosition - 20,
        width: width - 2 * margin,
        height: 25,
        color: lightGray,
      });
      
      // Table headers
      page.drawText('Description', {
        x: margin + 10,
        y: yPosition - 10,
        size: 11,
        font: helveticaBoldFont,
        color: black,
      });
      
      page.drawText('Due Date', {
        x: width - margin - 200,
        y: yPosition - 10,
        size: 11,
        font: helveticaBoldFont,
        color: black,
      });
      
      page.drawText('Amount', {
        x: width - margin - 80,
        y: yPosition - 10,
        size: 11,
        font: helveticaBoldFont,
        color: black,
      });
      
      yPosition -= 35;
      
      // Table content
      const description = invoiceData.description || 'Service Provided';
      const dueDate = formatDate(invoiceData.dueDate || new Date());
      const amount = formatETH(invoiceData.amount || '0');
      
      page.drawText(description, {
        x: margin + 10,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: black,
        maxWidth: 300,
      });
      
      page.drawText(dueDate, {
        x: width - margin - 200,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: black,
      });
      
      page.drawText(amount, {
        x: width - margin - 80,
        y: yPosition,
        size: 10,
        font: helveticaBoldFont,
        color: darkBlue,
      });
      
      yPosition -= 30;
      
      // Draw table line
      page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: gray,
      });
      
      yPosition -= 30;
      
      // Total section
      page.drawRectangle({
        x: width - margin - 200,
        y: yPosition - 15,
        width: 200,
        height: 30,
        color: lightGray,
      });
      
      page.drawText('TOTAL AMOUNT:', {
        x: width - margin - 190,
        y: yPosition - 5,
        size: 12,
        font: helveticaBoldFont,
        color: black,
      });
      
      page.drawText(amount, {
        x: width - margin - 80,
        y: yPosition - 5,
        size: 14,
        font: helveticaBoldFont,
        color: darkBlue,
      });
      
      yPosition -= 60;
      
      // Blockchain Information
      page.drawText('BLOCKCHAIN INFORMATION', {
        x: margin,
        y: yPosition,
        size: 14,
        font: helveticaBoldFont,
        color: black,
      });
      
      yPosition -= 25;
      
      // Contract address
      page.drawText('Smart Contract:', {
        x: margin,
        y: yPosition,
        size: 10,
        font: helveticaBoldFont,
        color: black,
      });
      
      yPosition -= 15;
      page.drawText(process.env.REACT_APP_CONTRACT_ADDRESS || 'Contract Address', {
        x: margin,
        y: yPosition,
        size: 9,
        font: helveticaFont,
        color: gray,
      });
      
      yPosition -= 20;
      
      // Network
      page.drawText('Network: Ethereum (Local Testnet)', {
        x: margin,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: gray,
      });
      
      yPosition -= 60;
      
      // Payment Instructions
      page.drawText('PAYMENT INSTRUCTIONS', {
        x: margin,
        y: yPosition,
        size: 14,
        font: helveticaBoldFont,
        color: black,
      });
      
      yPosition -= 25;
      
      const paymentInstructions = [
        '1. Connect your Web3 wallet (MetaMask, etc.)',
        '2. Navigate to the invoice payment page',
        '3. Click "Pay Invoice" to process payment',
        '4. Confirm the transaction in your wallet',
        '5. Payment will be recorded on the blockchain'
      ];
      
      paymentInstructions.forEach(instruction => {
        page.drawText(instruction, {
          x: margin,
          y: yPosition,
          size: 10,
          font: helveticaFont,
          color: black,
        });
        yPosition -= 18;
      });
      
      // Footer
      yPosition = margin + 50;
      
      page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: lightGray,
      });
      
      yPosition -= 20;
      
      page.drawText('This invoice is secured by blockchain technology and smart contracts.', {
        x: margin,
        y: yPosition,
        size: 9,
        font: helveticaFont,
        color: gray,
      });
      
      yPosition -= 15;
      
      page.drawText(`Generated on ${new Date().toLocaleString()}`, {
        x: margin,
        y: yPosition,
        size: 8,
        font: helveticaFont,
        color: gray,
      });
      
      // Return the PDF as bytes
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
      
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }
}

module.exports = new InvoicePDFGenerator();
