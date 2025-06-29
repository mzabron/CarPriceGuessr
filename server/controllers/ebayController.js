const axios = require('axios');
const https = require('https');
const { getApplicationAccessToken } = require('./token');

const EBAY_API_BASE_URL = 'https://api.ebay.com/buy/browse/v1';
const MARKETPLACE_ID = 'EBAY_US';
const CARS_CATEGORY_ID = '6001';

const agent = new https.Agent({
  localAddress: '10.156.207.123'
});

// Function to shuffle array using Fisher-Yates algorithm
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

exports.getCars = async (req, res) => {
  try {
    
    const randomOffset = Math.floor(Math.random() * 90) * 10;
    // Request more items to have a larger pool for random selection
    const params = new URLSearchParams({
      category_ids: CARS_CATEGORY_ID,
      //filter: 'itemLocation.country:US',
      filter: 'buyingOptions:{FIXED_PRICE}',
      limit: '10',
      offset: `${randomOffset}`
    });

    const carsWithDetails = await fetchCarsWithDetails(params);
    
    // Randomly select 10 cars from the results
    const randomizedCars = {
      itemSummaries: shuffleArray(carsWithDetails.itemSummaries).slice(0, 10),
      totalEstimatedMatches: carsWithDetails.totalEstimatedMatches
    };

    res.json(randomizedCars);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cars from eBay API' });
  }
};

const fetchCarsWithDetails = async (params) => {
  try {
    const accessToken = await getApplicationAccessToken();

    console.log('Using eBay access token:', accessToken);
    
    const searchResponse = await axios.get(`${EBAY_API_BASE_URL}/item_summary/search?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE_ID,
        'Content-Type': 'application/json'
      },
      httpsAgent: agent,
    });

    const searchData = searchResponse.data;
    console.log('Search results sample item:', searchData?.itemSummaries?.[0]);
    
    if (!searchData?.itemSummaries?.length) {
      console.warn('No cars found in search results');
      return { itemSummaries: [], totalEstimatedMatches: 0 };
    }

    const itemDetailsPromises = searchData.itemSummaries.map(async (item) => {
      try {
        const detailResponse = await axios.get(`${EBAY_API_BASE_URL}/item/${item.itemId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE_ID,
            'Content-Type': 'application/json'
          },
          httpsAgent: agent,
        });

        const detailData = detailResponse.data
        console.log('Detail data for item:', item.itemId, 'keys:', Object.keys(detailData));
        console.log('itemWebUrl in detail data:', detailData.itemWebUrl);

        // Function to find value in localizedAspects
        const findAspect = (name) => {
          const aspect = detailData.localizedAspects?.find(
            aspect => aspect.name === name
          );
          return aspect ? aspect.value : null;
        };

        // Combine main image with additional images
        const allImages = [
          detailData.image,
          ...(detailData.additionalImages || [])
        ].filter(img => img && img.imageUrl);

        return {
          // Basic information
          itemId: item.itemId,
          title: detailData.title,
          shortDescription: detailData.shortDescription,
          price: item.price ? `${item.price.value} ${item.price.currency}` : null,
          itemWebUrl: detailData.itemWebUrl || item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
          
          // Condition
          condition: detailData.condition,
          conditionDescription: detailData.conditionDescription,
          
          // Location
          itemLocation: {
            city: detailData.itemLocation?.city,
            country: detailData.itemLocation?.country
          },
          
          // Images - now includes main image as first item
          thumbnailImages: allImages,
          
          // Car specifics from localizedAspects
          year: findAspect('Year'),
          make: findAspect('Make'),
          model: findAspect('Model'),
          mileage: findAspect('Mileage'),
          forSaleBy: findAspect('For Sale By'),
          fuelType: findAspect('Fuel Type'),
          engine: findAspect('Engine'),
          carType: findAspect('Car Type'),
          // Additional aspects
          bodyType: findAspect('Body Type'),
          horsePower: findAspect('Horse Power'),
          numberOfCylinders: findAspect('Number of Cylinders'),
          numberOfDoors: findAspect('Number of Doors')
        };
      } catch (error) {
        console.error(`Error fetching details for item ${item.itemId}:`, error);
        return null;
      }
    });

    const itemsWithDetails = await Promise.all(itemDetailsPromises);
    
    return {
      itemSummaries: itemsWithDetails.filter(item => item !== null),
      totalEstimatedMatches: searchData.totalEstimatedMatches || 0
    };

  } catch (error) {
    console.error('Error in fetchCarsWithDetails:', error);
    throw error;
  }
};