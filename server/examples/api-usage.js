// This file demonstrates how to call the cars API with query parameters

/*
Example API endpoints you can now use:

1. Basic request with default parameters:
   GET http://localhost:8080/cars

2. Request with custom limit and offset:
   GET http://localhost:8080/cars?limit=5&offset=10

3. Request with a specific search query:
   GET http://localhost:8080/cars?q=mustang

4. Request with multiple parameters:
   GET http://localhost:8080/cars?limit=5&q=porsche&filter=itemLocation.country:US

All parameters are optional and will use defaults if not provided.
*/

// Example frontend fetch code:
// This could be used in your React components

async function fetchCars(params = {}) {
  // Convert params object to URLSearchParams
  const queryParams = new URLSearchParams();
  
  // Add any parameters that were passed in
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, value);
  });
  
  try {
    const response = await fetch(`http://localhost:8080/cars?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching cars:', error);
    throw error;
  }
}

// Examples of calling the function:
// fetchCars({ limit: 5, q: 'mustang' })
// fetchCars({ category_ids: '6001', limit: 10, offset: 0 })
