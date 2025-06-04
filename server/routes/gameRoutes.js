const express = require('express');
const router = express.Router();
const { getCars } = require('../controllers/ebayController');

// Define the route for fetching cars
// This will handle requests like /cars?limit=5&category_ids=6001
router.get('/', getCars);

module.exports = router;