require('dotenv').config();
const FormData = require('form-data');
const axios = require('axios');

async function testSimplePinataUpload() {
  try {
    console.log('🔑 Testing simple Pinata upload...');
    console.log('API Key:', process.env.PINATA_API_KEY?.substring(0, 10) + '...');
    console.log('Secret Key:', process.env.PINATA_SECRET_KEY?.substring(0, 10) + '...');
    
    // Create a simple test file
    const testContent = 'Hello Pinata Test - ' + new Date().toISOString();
    
    const formData = new FormData();
    formData.append('file', Buffer.from(testContent), {
      filename: 'test.txt',
      contentType: 'text/plain'
    });

    const pinataMetadata = JSON.stringify({
      name: 'Test Upload',
      type: 'test-file'
    });

    formData.append('pinataMetadata', pinataMetadata);
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

    console.log('📤 Uploading test file...');
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
          ...formData.getHeaders()
        },
        timeout: 30000
      }
    );

    if (response.data && response.data.IpfsHash) {
      console.log('✅ Upload successful!');
      console.log('IPFS Hash:', response.data.IpfsHash);
      console.log('📄 URL: https://gateway.pinata.cloud/ipfs/' + response.data.IpfsHash);
    } else {
      console.error('❌ Upload failed - no IPFS hash in response');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Upload failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timed out - check internet connection');
    }
  }
}

testSimplePinataUpload();
