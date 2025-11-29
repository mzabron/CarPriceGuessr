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

  // New state for summary
  const [gameHistory, setGameHistory] = useState([]);
  const [startTime] = useState(Date.now());
  const [endTime, setEndTime] = useState(null);

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

    // Record history
    const roundResult = {
      round,
      car,
      guess,
      actualPrice,
      deviation,
      correct: deviation <= difficultyThreshold
    };

    setGameHistory(prev => [...prev, roundResult]);

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
        setEndTime(Date.now());
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

  // Calculate stats
  const calculateStats = () => {
    if (gameHistory.length === 0) return { avgDeviation: 0, timeString: '0s' };

    const totalDeviation = gameHistory.reduce((acc, curr) => acc + curr.deviation, 0);
    const avgDeviation = (totalDeviation / gameHistory.length).toFixed(1);

    const timeDiff = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(timeDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeString = minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;

    return { avgDeviation, timeString };
  };

  if (phase === 'gameover') {
    const { avgDeviation, timeString } = calculateStats();

    // Filter history to show only the last guess for each round (unique cars)
    const uniqueRoundHistory = Object.values(
      gameHistory.reduce((acc, curr) => {
        acc[curr.round] = curr;
        return acc;
      }, {})
    );

    return (
      <div className="h-screen bg-gray-100 flex flex-col items-center p-4 overflow-y-auto">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-6xl mb-8 shrink-0">
          <h1 className="text-4xl font-bold text-center text-red-600 mb-2">Game Over</h1>
          <p className="text-xl text-center text-gray-600 mb-8">You ran out of lives!</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-100">
              <div className="text-gray-600 font-semibold mb-1">Final Score</div>
              <div className="text-4xl font-bold text-blue-600">{score}</div>
            </div>
            <div className="bg-green-50 p-6 rounded-lg text-center border border-green-100">
              <div className="text-gray-600 font-semibold mb-1">Avg. Price Deviation</div>
              <div className="text-4xl font-bold text-green-600">{avgDeviation}%</div>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-100">
              <div className="text-gray-600 font-semibold mb-1">Time Played</div>
              <div className="text-4xl font-bold text-purple-600">{timeString}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => {
                setPhase('voting');
                setRound(1);
                setScore(0);
                setLives(3);
                setCars([]);
                setSelectedCarIndex(null);
                setGameHistory([]);
                // Reset start time implicitly by component remount or we could add a key, 
                // but here we just continue. Ideally we might want to reset startTime too.
                // Since startTime is a const from useState(Date.now()), we can't reset it easily without remounting.
                // Let's force a remount or navigation to reset everything cleanly.
                navigate(0); // Reload page to reset everything
              }}
              className="px-8 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition shadow-lg"
            >
              Play Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition shadow-lg"
            >
              Back to Home
            </button>
          </div>

          {/* Game History */}
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Game History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uniqueRoundHistory.map((roundData, index) => (
              <div key={index} className="border rounded-lg overflow-hidden hover:shadow-lg transition-all bg-white">
                <div className="bg-gray-50 text-center py-2 border-b flex justify-between px-4 items-center">
                  <span className="font-bold text-gray-700">Round {roundData.round}</span>
                  <span className={`text-sm font-bold px-2 py-1 rounded ${roundData.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {roundData.correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <div className="p-4">
                  {roundData.car.thumbnailImages && roundData.car.thumbnailImages[0] && (
                    <div className="mb-3 relative group">
                      <img
                        src={roundData.car.thumbnailImages[0].imageUrl}
                        alt={roundData.car.title}
                        className="w-full h-48 object-cover rounded cursor-pointer"
                        onClick={() => roundData.car.itemWebUrl && window.open(roundData.car.itemWebUrl, '_blank')}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all cursor-pointer flex items-center justify-center"
                        onClick={() => roundData.car.itemWebUrl && window.open(roundData.car.itemWebUrl, '_blank')}>
                        <span className="opacity-0 group-hover:opacity-100 bg-white px-3 py-1 rounded-full text-sm font-bold shadow">View on eBay</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div
                      className="font-semibold text-gray-800 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors h-12"
                      onClick={() => roundData.car.itemWebUrl && window.open(roundData.car.itemWebUrl, '_blank')}
                      title={roundData.car.title}
                    >
                      {roundData.car.title}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                      <div className="text-gray-500">Your Guess:</div>
                      <div className="font-semibold text-right">${roundData.guess.toLocaleString()}</div>

                      <div className="text-gray-500">Actual Price:</div>
                      <div className="font-bold text-green-600 text-right">${roundData.actualPrice.toLocaleString()}</div>

                      <div className="text-gray-500">Deviation:</div>
                      <div className={`font-semibold text-right ${roundData.deviation <= difficultyThreshold ? 'text-green-600' : 'text-red-600'}`}>
                        {roundData.deviation.toFixed(1)}%
                      </div>
                    </div>

                    {roundData.car.itemWebUrl && (
                      <a
                        href={roundData.car.itemWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors text-sm font-semibold"
                      >
                        View on eBay
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
                    className={`w-full p-4 sm:p-6 rounded-xl border-2 text-left text-base font-semibold shadow transition-all duration-150 ${selectedCarIndex === idx ? 'bg-blue-200 border-blue-400 scale-105' : 'bg-white border-gray-300 hover:scale-102'
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
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
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
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${selectedRange.label === range.label
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
                  <div className={`text-xl font-bold ${feedbackMessage.includes('Correct') ? 'text-green-600' :
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
