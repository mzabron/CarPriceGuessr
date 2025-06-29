const axios = require('axios');
const https = require('https');
const fs = require('fs');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

console.log(process.env.CLIENT_ID)
const SCOPES = 'https://api.ebay.com/oauth/api_scope'; // Required scope for most public APIs

let currentAccessToken = null;
let tokenExpiryTime = 0;

const agent = new https.Agent({
  localAddress: '10.156.207.123'
});

const data = `grant_type=client_credentials&scope=${encodeURIComponent(SCOPES)}`;

async function fetchNewApplicationToken() {
  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token'; // Or sandbox URL: https://api.sandbox.ebay.com/identity/v1/oauth2/token

    const response = await axios.post(tokenUrl, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`
      },
      httpsAgent: agent,
    })

    const tokenData = response.data;

    // Destructure properties directly from response.data (the object)
    const { access_token, expires_in, token_type } = tokenData; // Added token_type for completeness

    // expires_in is in seconds, convert to milliseconds and add to current time
    tokenExpiryTime = Date.now() + (expires_in * 1000);
    console.log('Successfully fetched new eBay access token. Expires in:', expires_in / 60, 'minutes');
    console.log(access_token);
    currentAccessToken = access_token;
  } catch (error) {
    console.error('Error getting application access token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch eBay application token');
  }
  }

async function getApplicationAccessToken() {

  const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds

  if (!currentAccessToken || (Date.now() + expiryBuffer) >= tokenExpiryTime) {
    console.log('eBay access token is expired or nearing expiration. Refreshing...');
    await fetchNewApplicationToken(); // Await the refresh
  }
  return currentAccessToken;
}

// const accessToken = await getApplicationAccessToken();
// console.log(accessToken);

module.exports = {
    getApplicationAccessToken
};