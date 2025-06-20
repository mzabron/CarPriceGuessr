const axios = require('axios');
const https = require('https');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const SCOPES = 'https://api.ebay.com/oauth/api_scope';

let currentAccessToken = null;
let tokenExpiryTime = 0;

const agent = new https.Agent({
  localAddress: '10.156.207.123',
})

async function fetchNewApplicationToken() {
  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token';

    console.log("credentials: " + credentials);
    
    const data = `grant_type=client_credentials&scope=${encodeURIComponent(SCOPES)}`;

    const response = await axios.post(tokenUrl, data, {
      httpsAgent: agent,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`
      },
    })
    
    const tokenData = response.data;
    const { access_token, expires_in } = tokenData;

    // expires_in is in seconds, convert to milliseconds and add to current time
    tokenExpiryTime = Date.now() + (expires_in * 1000);
    console.log('Successfully fetched new eBay access token. Expires in:', expires_in / 60, 'minutes');
    console.log(access_token);
    currentAccessToken = access_token;
  } catch (error) {
    console.error('Error getting application access token:', error.message);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data (error):', error.response.data); // This will be the error object from eBay
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an http.ClientRequest in node.js
      console.error('No response received from server.');
      console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    throw error; // Re-throw to propagate the error if needed
  }
}

async function getApplicationAccessToken() {

  const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  if (!currentAccessToken || (Date.now() + expiryBuffer) >= tokenExpiryTime) {
    console.log('eBay access token is expired or nearing expiration. Refreshing...');
    await fetchNewApplicationToken(); // Await the refresh
  }
  console.log('current access token: ' + currentAccessToken);
  return currentAccessToken;
}

// const accessToken = await getApplicationAccessToken();
// console.log(accessToken);

module.exports = {
    getApplicationAccessToken
};