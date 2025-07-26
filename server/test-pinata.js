require('dotenv').config();
const axios = require('axios');

async function testPinataConnection() {
  try {
    console.log('🔑 Testing Pinata API connection...');
    console.log('API Key:', process.env.PINATA_API_KEY?.substring(0, 5) + '...');
    console.log('Secret Key:', process.env.PINATA_SECRET_KEY?.substring(0, 5) + '...');
    
    // Test with the authentication endpoint
    const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_KEY
      }
    });
    
    console.log('✅ Pinata API connection successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Pinata API connection failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data || error.message);
  }
}

testPinataConnection();
