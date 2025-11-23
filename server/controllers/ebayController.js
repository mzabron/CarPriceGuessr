const { getRandomCars, getCarsCount } = require('../services/db');

function buildDisplayLabel(car) {
  if (car.conditionDescription) {
    const words = car.conditionDescription.split(' ');
    const firstSix = words.slice(0, 6).join(' ');
    if (firstSix !== 'View 35 pictures by scrolling below') {
      const shortDesc = firstSix;
      return shortDesc + (words.length > 6 ? '...' : '');
    }
  }

  const fields = [
    'carType',
    'horsePower',
    'bodyType',
    'numberOfCylinders',
    'numberOfDoors',
    'make',
  ];

  for (const field of fields) {
    const value = car[field];
    if (!value || value === 'No Information' || value === '--') {
      continue;
    }
    if (field === 'bodyType' && value === 'Other') {
      continue;
    }
    if (field === 'horsePower') {
      return `Horse Power: ${value}`;
    }
    if (field === 'numberOfCylinders') {
      return `Cylinders number: ${value}`;
    }
    if (field === 'numberOfDoors') {
      return `Doors number: ${value}`;
    }
    return value;
  }

  return 'No Information Available';
}

exports.getCars = async (req, res) => {
  try {
    const total = await getCarsCount();

    // Oversample from DB so we can enforce unique labels per round.
    const oversampleCount = 40;
    const desiredCount = 10;
    const candidateCars = await getRandomCars(Math.max(oversampleCount, desiredCount));

    if (!candidateCars.length) {
      return res.status(503).json({
        itemSummaries: [],
        totalEstimatedMatches: total,
        message: 'No cached cars available yet. Please try again shortly.',
      });
    }

    const usedLabels = new Set();
    const selectedCars = [];

    for (const car of candidateCars) {
      const label = buildDisplayLabel(car);
      if (usedLabels.has(label)) {
        continue;
      }
      usedLabels.add(label);
      selectedCars.push(car);
      if (selectedCars.length >= desiredCount) {
        break;
      }
    }

    // Fallback: if we couldn't get enough unique labels, fill the rest
    // with remaining candidates (even if labels duplicate) to keep 10 cars.
    if (selectedCars.length < desiredCount) {
      for (const car of candidateCars) {
        if (selectedCars.includes(car)) continue;
        selectedCars.push(car);
        if (selectedCars.length >= desiredCount) break;
      }
    }

    res.json({
      itemSummaries: selectedCars,
      totalEstimatedMatches: total,
    });
  } catch (error) {
    console.error('Failed to read cars from database', error);
    res.status(500).json({ error: 'Failed to load cars from cache' });
  }
};