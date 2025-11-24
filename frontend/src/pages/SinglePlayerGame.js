import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/apiService';

const PRICE_RANGES = [
  { label: '0 - 20k', min: 0, max: 20000 },
  { label: '20k - 100k', min: 20000, max: 100000 },
  { label: '100k - 300k', min: 100000, max: 300000 },
  { label: 'Over 300k', min: 300000, max: 1000000 }
];

const SinglePlayerGame = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const difficultyThreshold = location.state?.difficulty || 15;

  const [phase, setPhase] = useState('voting'); // voting, playing, gameover
  const [cars, setCars] = useState([]);
  const [selectedCarIndex, setSelectedCarIndex] = useState(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  
  // Game state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sliderPrice, setSliderPrice] = useState(10000);
  const [guessPrice, setGuessPrice] = useState(10000);
  const [selectedRange, setSelectedRange] = useState(PRICE_RANGES[0]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);

  // Fetch cars for the round
  const fetchCars = useCallback(async () => {
    try {
      const data = await apiService.getCars();
      if (data && data.itemSummaries) {
        setCars(data.itemSummaries);
        // Pre-load images
        data.itemSummaries.forEach(car => {
          if (car.thumbnailImages) {
            car.thumbnailImages.forEach(img => {
              const image = new Image();
              image.src = img.imageUrl;
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch cars:', error);
    }
  }, []);

  useEffect(() => {
    fetchCars();
  }, [fetchCars, round]);

  const handleCarSelect = (index) => {
    setSelectedCarIndex(index);
    // Small delay to show highlight
    setTimeout(() => {
      setPhase('playing');
      setCurrentImageIndex(0);
      setSliderPrice(10000);
      setGuessPrice(10000);
      setSelectedRange(PRICE_RANGES[0]);
      setFeedbackMessage('');
    }, 500);
  };

  const handleGuess = () => {
    const car = cars[selectedCarIndex];
    if (!car) return;

    let actualPrice = car.price;
    if (typeof actualPrice === 'string') {
      const match = actualPrice.match(/([\d,.]+)/);
      if (match) actualPrice = parseFloat(match[1].replace(/,/g, ''));
    }
    actualPrice = Number(actualPrice);
    const guess = Number(guessPrice);

    if (isNaN(actualPrice) || isNaN(guess)) {
      setFeedbackMessage('Error calculating price. Try again.');
      return;
    }

    const deviation = Math.abs(guess - actualPrice) / actualPrice * 100;

    if (deviation <= difficultyThreshold) {
      // Correct!
      const points = Math.round(100 * (1 - deviation / 100)); // Simple scoring
      setScore(s => s + points);
      setFeedbackMessage(`Correct! The price was $${actualPrice}. (+${points} pts)`);
      
      // Wait a bit then next round
      setTimeout(() => {
        setRound(r => r + 1);
        setLives(3); // Renew lives
        setPhase('voting');
        setSelectedCarIndex(null);
        setCars([]); // Clear cars to show loading or wait for new fetch
      }, 2000);
    } else {
      // Incorrect
      const newLives = lives - 1;
      setLives(newLives);
      
      if (newLives <= 0) {
        setPhase('gameover');
      } else {
        const direction = guess < actualPrice ? 'low' : 'high';
        setFeedbackMessage(`Too ${direction}`);
        // Shake animation or visual cue could be added here
      }
    }
  };

  const getDisplayText = (car) => {
    if (car.conditionDescription) {
      const words = car.conditionDescription.split(' ');
      const firstSix = words.slice(0, 6).join(' ');
      if (firstSix !== 'View 35 pictures by scrolling below') {
        const shortDesc = firstSix;
        return shortDesc + (words.length > 6 ? '...' : '');
      }
    }
    const fields = ['carType', 'horsePower', 'bodyType', 'numberOfCylinders', 'numberOfDoors', 'make'];
    for (const field of fields) {
      if (car[field] && car[field] !== 'No Information' && car[field] !== '--') {
        if (field === 'bodyType' && car[field] === 'Other') continue;
        if (field === 'horsePower') return `Horse Power: ${car[field]}`;
        if (field === 'numberOfCylinders') return `Cylinders number: ${car[field]}`;
        if (field === 'numberOfDoors') return `Doors number: ${car[field]}`;
        return car[field];
      }
    }
    return 'No Information Available';
  };

  const renderCarDetailsGrid = (car) => (
    <div className="w-full max-w-2xl mb-2 text-sm md:text-base" style={{ maxHeight: '15.5em', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#a3a3a3 #f3f4f6' }}>
      <div className="grid grid-cols-2 gap-2 mb-1">
        <div className="flex flex-col items-start gap-1">
          <div><span className="font-semibold">Make:</span><span className="ml-2">{car?.make || 'No Information'}</span></div>
          <div><span className="font-semibold">Model:</span><span className="ml-2">{car?.model || 'No Information'}</span></div>
          <div><span className="font-semibold">Year:</span><span className="ml-2">{car?.year || 'No Information'}</span></div>
          <div><span className="font-semibold">Condition:</span><span className="ml-2">{car?.condition || 'No Information'}</span></div>
          <div><span className="font-semibold">Mileage:</span><span className="ml-2">{car?.mileage || 'No Information'}</span></div>
        </div>
        <div className="flex flex-col items-start gap-1">
          <div><span className="font-semibold">Engine:</span><span className="ml-2">{car?.engine || 'No Information'}</span></div>
          <div><span className="font-semibold">Fuel Type:</span><span className="ml-2">{car?.fuelType || 'No Information'}</span></div>
          <div><span className="font-semibold">Horse Power:</span><span className="ml-2">{car?.horsePower || 'No Information'}</span></div>
          <div><span className="font-semibold">Location:</span><span className="ml-2">{car?.itemLocation?.city ? `${car.itemLocation.city}, ` : ''}{car?.itemLocation?.country || 'No Information'}</span></div>
          <div><span className="font-semibold">For Sale By:</span><span className="ml-2">{car?.forSaleBy || 'No Information'}</span></div>
        </div>
      </div>
      <div className="mt-1">
        <span className="font-semibold">Condition Description:</span>
        <span className="ml-2 block rounded p-1" style={{ whiteSpace: 'pre-line' }}>{car?.conditionDescription || 'No Information'}</span>
      </div>
    </div>
  );

  const handleSliderChange = (e) => {
    let value = Number(e.target.value);
    const sliderMin = selectedRange.min;
    const sliderMax = selectedRange.max;
    if (value < sliderMin) value = sliderMin;
    if (value > sliderMax) value = sliderMax;
    setSliderPrice(value);
    setGuessPrice(value);
  };

  const handleRangeClick = (range) => {
    setSelectedRange(range);
    const middle = Math.round((range.min + range.max) / 2 / 100) * 100;
    setSliderPrice(middle);
    setGuessPrice(middle);
  };

  if (phase === 'gameover') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
          <h1 className="text-4xl font-bold text-red-600 mb-4">Game Over</h1>
          <p className="text-xl mb-6">You ran out of lives!</p>
          <div className="text-2xl font-bold mb-8">Final Score: {score}</div>
          <div className="space-y-4">
            <button
              onClick={() => {
                setPhase('voting');
                setRound(1);
                setScore(0);
                setLives(3);
                setCars([]);
                setSelectedCarIndex(null);
                fetchCars();
              }}
              className="w-full py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition"
            >
              Play Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-semibold transition-colors"
              title="Go back to main page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span>Go back to main page</span>
            </button>
            <div className="text-xl font-bold">Round {round}</div>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <svg 
                  key={i} 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className={`w-8 h-8 ${i < lives ? 'text-red-500' : 'text-gray-300'}`}
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ))}
            </div>
          </div>
          <div className="text-xl font-bold text-blue-600">Score: {score}</div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 overflow-y-auto">
        {phase === 'voting' && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-6">Choose a Category</h2>
            {cars.length === 0 ? (
              <div className="text-xl text-gray-500">Loading cars...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                {cars.map((car, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCarSelect(idx)}
                    className={`w-full p-4 sm:p-6 rounded-xl border-2 text-left text-base font-semibold shadow transition-all duration-150 ${
                      selectedCarIndex === idx ? 'bg-blue-200 border-blue-400 scale-105' : 'bg-white border-gray-300 hover:scale-102'
                    }`}
                    style={{ minHeight: '90px' }}
                  >
                    {getDisplayText(car)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 'playing' && cars[selectedCarIndex] && (
          <div className="flex flex-col items-center w-full max-w-6xl mx-auto bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold mb-2 text-center">{cars[selectedCarIndex].title}</div>
            
            {/* Image and Details */}
            <div className="flex flex-col lg:flex-row gap-4 w-full mb-4">
              {/* Carousel */}
              <div className="w-full lg:w-1/2 relative">
                <div className="aspect-video relative bg-black rounded-lg overflow-hidden">
                  <img
                    src={cars[selectedCarIndex].thumbnailImages?.[currentImageIndex]?.imageUrl}
                    alt="Car"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  <button
                    onClick={() => setCurrentImageIndex(prev => prev === 0 ? (cars[selectedCarIndex].thumbnailImages?.length || 1) - 1 : prev - 1)}
                    className="no-press absolute left-0 top-[40%] bg-black bg-opacity-50 text-white p-3 rounded-r hover:bg-opacity-75 z-10 text-3xl md:text-4xl leading-none"
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(prev => prev === (cars[selectedCarIndex].thumbnailImages?.length || 1) - 1 ? 0 : prev + 1)}
                    className="no-press absolute right-0 top-[40%] bg-black bg-opacity-50 text-white p-3 rounded-l hover:bg-opacity-75 z-10 text-3xl md:text-4xl leading-none"
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <button
                      onClick={() => {
                        setFullscreenImageIndex(currentImageIndex);
                        setShowFullscreenImage(true);
                      }}
                      className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-75 z-10"
                      title="View fullscreen"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                      </svg>
                    </button>
                </div>
                <div className="flex justify-center gap-1 mt-2 flex-wrap">
                  {cars[selectedCarIndex].thumbnailImages?.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Details */}
              <div className="flex-1">
                {renderCarDetailsGrid(cars[selectedCarIndex])}
              </div>
            </div>

            {/* Guessing Controls */}
            <div className="w-full max-w-3xl border-t pt-4">
              <div className="flex justify-center gap-4 mb-4">
                {/* Hearts above slider */}
                 <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <svg 
                      key={i} 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      className={`w-8 h-8 ${i < lives ? 'text-red-500' : 'text-gray-300'}`}
                    >
                      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                    </svg>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                {PRICE_RANGES.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handleRangeClick(range)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                      selectedRange.label === range.label
                        ? 'bg-blue-200 border-blue-400 font-bold'
                        : 'bg-white border-gray-300 hover:bg-blue-50'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4">
                <input
                  type="range"
                  min={selectedRange.min}
                  max={selectedRange.max}
                  step={100}
                  value={sliderPrice}
                  onChange={handleSliderChange}
                  className="w-full max-w-lg h-8 accent-blue-500"
                />
                
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">$</span>
                  <input
                    type="number"
                    value={guessPrice}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setGuessPrice(val);
                      setSliderPrice(val);
                    }}
                    className="text-2xl font-bold border-2 border-blue-400 rounded px-3 py-1 w-40 text-right"
                  />
                </div>

                {feedbackMessage && (
                  <div className={`text-xl font-bold ${
                    feedbackMessage.includes('Correct') ? 'text-green-600' : 
                    feedbackMessage.includes('Low') ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {feedbackMessage}
                  </div>
                )}

                <button
                  onClick={handleGuess}
                  disabled={!!feedbackMessage && feedbackMessage.includes('Correct')}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform transition hover:scale-105"
                >
                  Confirm Guess
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
       {/* Fullscreen image viewer */}
      {showFullscreenImage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50 p-4">
          <button
            onClick={() => setShowFullscreenImage(false)}
            className="fixed top-4 right-4 z-50 bg-black/70 text-white p-3 rounded-full hover:bg-black/80 shadow-lg text-4xl leading-none"
          >
            ×
          </button>
          <div className="relative w-full h-full max-w-5xl max-h-[90vh]">
            <button
              onClick={() => {
                const totalImages = cars[selectedCarIndex]?.thumbnailImages?.length || 0;
                setFullscreenImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
              }}
              className="fixed left-4 top-1/2 -translate-y-1/2 text-white text-7xl hover:text-gray-300 z-50 leading-none p-5"
            >
              ‹
            </button>
            <button
              onClick={() => {
                const totalImages = cars[selectedCarIndex]?.thumbnailImages?.length || 0;
                setFullscreenImageIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
              }}
              className="fixed right-4 top-1/2 -translate-y-1/2 text-white text-7xl hover:text-gray-300 z-50 leading-none p-5"
            >
              ›
            </button>
            <img
              src={cars[selectedCarIndex]?.thumbnailImages?.[fullscreenImageIndex]?.imageUrl}
              alt="Fullscreen Car"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SinglePlayerGame;
