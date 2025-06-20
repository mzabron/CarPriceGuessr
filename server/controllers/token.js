const axios = require('axios');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const address = '10.156.207.123';

const SCOPES = 'https://api.ebay.com/oauth/api_scope';

let currentAccessToken = null;
let tokenExpiryTime = 0;

async function fetchNewApplicationToken() {
  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token';

    console.log("credentials: " + credentials);
    
    const data = `grant_type=client_credentials&scope=${encodeURIComponent(SCOPES)}`;

    const response = await axios.post(tokenUrl, data, {
      localAddress: address,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`
      },
    })

    console.log("response: " + response);
    
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const json = await response.json();

    console.log("json: " + json);
    const { access_token, expires_in } = json;

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
  console.log('current access token: ' + currentAccessToken);
  return currentAccessToken;
}

// const accessToken = await getApplicationAccessToken();
// console.log(accessToken);

module.exports = {
    getApplicationAccessToken
};