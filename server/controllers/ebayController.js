const { getApplicationAccessToken } = require('./token');

const EBAY_API_BASE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search'; // Or sandbox: https://api.sandbox.ebay.com/buy/browse/v1
const MARKETPLACE_ID = 'EBAY_US'; // For eBay US, which includes Motors

// Category ID for Cars & Trucks on eBay US. You might need to verify this or use Taxonomy API.
const CARS_CATEGORY_ID = '6001';

exports.getCars = (req, res) => {
  // Create parameters based on request query parameters or use defaults
  const params = new URLSearchParams({
    category_ids: req.query.category_ids || CARS_CATEGORY_ID,
    filter: req.query.filter || `itemLocation.country:US`,
    limit: req.query.limit || 10,
    offset: req.query.offset || 0,
  });

  // Any additional query parameters can be added
  if (req.query.q) {
    params.append('q', req.query.q);
  }

  fetchCarsFromEbay(params)
    .then(cars => res.json(cars))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch cars from eBay API' });
    });
};

const fetchCarsFromEbay = async (params) => {
  try {
    const accessToken = await getApplicationAccessToken();
    const response = await fetch(`${EBAY_API_BASE_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE_ID,
        'Content-Type': 'application/json' // Although GET, good practice to specify
      },
    })

    if (!response.ok) {
      throw new Error(`eBay API request failed: ${response.status}`);
    }

    const responseData = await response.json();

    if (!responseData || (responseData.itemSummaries === undefined && responseData.totalEstimatedMatches === undefined)) {
      console.warn('eBay API response data is empty or not in expected format.');
      return { itemSummaries: [], totalEstimatedMatches: 0 };
    }

    console.log("log response data:");
    console.log('----------------------------')
    console.log(responseData);
    const itemSummaries = responseData.itemSummaries || [];
    const totalEstimatedMatches = responseData.totalEstimatedMatches || 0;

    if (itemSummaries.length === 0) {
      console.log('No items found for the specified category and filters.');
    } return {
      itemSummaries: itemSummaries.map(item => ({
        itemId: item.itemId,
        title: item.title,
        price: item.price ? `${item.price.value} ${item.price.currency}` : 'N/A',
        imageUrl: item.image ? item.image.imageUrl : 'No image available',
        itemWebUrl: item.itemWebUrl,
        itemAspects: item.itemAspects ? item.itemAspects.reduce((acc, aspect) => {
          acc[aspect.name] = (Array.isArray(aspect.value) && aspect.value.length > 0) ? aspect.value[0] : null;
          return acc;
        }, {}) : {},
      })),
      totalEstimatedMatches: totalEstimatedMatches
    };

  } catch (error) {
    if (error.response) {
      console.error('eBay API Error Response Status:', error.response.status);
      console.error('eBay API Error Response Data:', error.response.data); // Look here for details!
      console.error('eBay API Error Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received from eBay API:', error.request);
    } else {
      console.error('Error setting up eBay API request:', error.message);
    }
    throw new Error(`eBay API request failed: ${error.response ? error.response.status : error.message}`);
  }
}