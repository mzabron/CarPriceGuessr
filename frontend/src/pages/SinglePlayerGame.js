import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/apiService';
import { useSfx } from '../services/soundService';

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
  const { play } = useSfx();

  const [phase, setPhase] = useState('voting'); // voting, playing, gameover
  const [cars, setCars] = useState([]);
  const [selectedCarIndex, setSelectedCarIndex] = useState(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);

  // Game state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sliderPrice, setSliderPrice] = useState(10000);
  const [guessPrice, setGuessPrice] = useState('10000');
  const [selectedRange, setSelectedRange] = useState(PRICE_RANGES[0]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);
  const [showChosenText, setShowChosenText] = useState(false);

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
        if (phase === 'voting' && data.itemSummaries.length > 0) {
          play('voting_start');
        }
      }
    } catch (error) {
      console.error('Failed to fetch cars:', error);
    }
  }, []);

  useEffect(() => {
    fetchCars();
  }, [fetchCars, round]);

  // Preload images for the selected car immediately after selection
  useEffect(() => {
    if (selectedCarIndex !== null && cars[selectedCarIndex]?.thumbnailImages) {
      cars[selectedCarIndex].thumbnailImages.forEach((img) => {
        if (img && img.imageUrl) {
          const image = new Image();
          image.src = img.imageUrl;
        }
      });
    }
  }, [selectedCarIndex, cars]);

  const handleCarSelect = (index) => {
    setSelectedCarIndex(index);
    // Show transition screen similar to multiplayer: "... was chosen!"
    play('confirm');
    setShowChosenText(true);
    setTimeout(() => {
      setShowChosenText(false);
      setPhase('playing');
      setCurrentImageIndex(0);
      setSliderPrice(10000);
      setGuessPrice('10000');
      setSelectedRange(PRICE_RANGES[0]);
      setFeedbackMessage('');
    }, 2000);
  };

  const handleGuess = () => {
    const car = cars[selectedCarIndex];
    if (!car) return;
    play('confirm');

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
        play('game_end');
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
    <div className="w-full max-w-2xl mb-2 text-sm md:text-base thin-scrollbar" style={{ maxHeight: '35vh', overflowY: 'auto' }}>
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

  const getSliderMax = () => selectedRange.max;
  const getSliderMin = () => selectedRange.min;

  const handleSliderChange = (e) => {
    let value = Number(e.target.value);
    const sliderMin = getSliderMin();
    const sliderMax = getSliderMax();
    if (value < sliderMin) value = sliderMin;
    if (value > sliderMax) value = sliderMax;
    setSliderPrice(value);
    setGuessPrice(String(value));

    // Auto-switch range if slider hits boundary (though slider is constrained by min/max, handling edge cases)
    const foundRange = PRICE_RANGES.find((r, index) => {
      // Special cases for slider boundaries
      if (value === sliderMin && r.label === selectedRange.label) return true;
      if (value === sliderMax && r.label === selectedRange.label) return true;

      // For the last range, just check if value is >= min
      if (index === PRICE_RANGES.length - 1) {
        return value >= r.min;
      }
      // For other ranges, check if value is within the range
      return value >= r.min && value < r.max;
    });
    if (foundRange && foundRange.label !== selectedRange.label) {
      setSelectedRange(foundRange);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setGuessPrice(value);
    setSliderPrice(Number(value));
    const price = Number(value);
    const foundRange = PRICE_RANGES.find((r, index) => {
      // For the last range, just check if price is >= min
      if (index === PRICE_RANGES.length - 1) {
        return price >= r.min;
      }
      // For other ranges, check if price is within the range
      return price >= r.min && price < r.max;
    });
    if (foundRange && foundRange.label !== selectedRange.label) {
      setSelectedRange(foundRange);
    }
  };

  const handleRangeClick = (range) => {
    setSelectedRange(range);
    const middle = Math.round((range.min + range.max) / 2 / 100) * 100;
    setSliderPrice(middle);
    setGuessPrice(String(middle));
    play('toggle', { volume: 0.5 });
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
      <div className="h-screen bg-[color:var(--bg-color)] flex flex-col items-center p-4 overflow-y-auto thin-scrollbar">
        <div className="hand-drawn-panel p-8 w-full max-w-6xl mb-8 shrink-0">
          <h1 className="text-4xl font-bold text-center mb-2">Game Over</h1>
          <p className="text-xl text-center mb-8">You ran out of lives!</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 rounded-lg text-center border-2 border-[color:var(--text-color)]">
              <div className="font-semibold mb-1">Final Score</div>
              <div className="text-4xl font-bold">{score}</div>
            </div>
            <div className="p-6 rounded-lg text-center border-2 border-[color:var(--text-color)]">
              <div className="font-semibold mb-1">Avg. Price Deviation</div>
              <div className="text-4xl font-bold">{avgDeviation}%</div>
            </div>
            <div className="p-6 rounded-lg text-center border-2 border-[color:var(--text-color)]">
              <div className="font-semibold mb-1">Time Played</div>
              <div className="text-4xl font-bold">{timeString}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => {
                play('toggle');
                setPhase('voting');
                setRound(1);
                setScore(0);
                setLives(3);
                setCars([]);
                setSelectedCarIndex(null);
                setGameHistory([]);
                navigate(0);
              }}
              className="hand-drawn-btn px-8 py-3 font-bold"
            >
              Play Again
            </button>
            <button
              onClick={() => {
                play('toggle');
                navigate('/');
              }}
              className="hand-drawn-btn px-8 py-3 font-bold"
            >
              Back to Home
            </button>
          </div>

          {/* Game History */}
          <h2 className="text-2xl font-bold mb-6 text-center">Game History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uniqueRoundHistory.map((roundData, index) => (
              <div key={index} className="border-2 border-[color:var(--text-color)] rounded-lg overflow-hidden hover:shadow-lg transition-all bg-transparent">
                <div className="bg-transparent border-b-2 border-[color:var(--text-color)] text-center py-2 flex justify-between px-4 items-center">
                  <span className="font-bold">Round {roundData.round}</span>
                  <span className={`text-sm font-bold px-2 py-1 rounded border-2 border-[color:var(--text-color)] ${roundData.correct ? 'bg-[color:var(--text-color)] text-[color:var(--bg-color)]' : 'bg-transparent text-[color:var(--text-color)]'}`}>
                    {roundData.correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <div className="p-4">
                  {roundData.car.thumbnailImages && roundData.car.thumbnailImages[0] && (
                    <div className="mb-3 relative group">
                      <img
                        src={roundData.car.thumbnailImages[0].imageUrl}
                        alt={roundData.car.title}
                        className="w-full h-48 object-cover rounded cursor-pointer border-2 border-[color:var(--text-color)]"
                        onClick={() => roundData.car.itemWebUrl && window.open(roundData.car.itemWebUrl, '_blank')}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all cursor-pointer flex items-center justify-center"
                        onClick={() => roundData.car.itemWebUrl && window.open(roundData.car.itemWebUrl, '_blank')}>
                        <span className="opacity-0 group-hover:opacity-100 bg-[color:var(--bg-color)] px-3 py-1 rounded-full text-sm font-bold shadow border-2 border-[color:var(--text-color)] text-[color:var(--text-color)]">View on eBay</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div
                      className="font-semibold line-clamp-2 cursor-pointer hover:underline transition-colors h-12"
                      onClick={() => roundData.car.itemWebUrl && window.open(roundData.car.itemWebUrl, '_blank')}
                      title={roundData.car.title}
                    >
                      {roundData.car.title}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                      <div className="opacity-70">Your Guess:</div>
                      <div className="font-semibold text-right">${roundData.guess.toLocaleString()}</div>

                      <div className="opacity-70">Actual Price:</div>
                      <div className="font-bold text-right">${roundData.actualPrice.toLocaleString()}</div>

                      <div className="opacity-70">Deviation:</div>
                      <div className={`font-semibold text-right ${roundData.deviation <= difficultyThreshold ? 'font-bold' : ''}`}>
                        {roundData.deviation.toFixed(1)}%
                      </div>
                    </div>

                    {roundData.car.itemWebUrl && (
                      <a
                        href={roundData.car.itemWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center mt-4 hand-drawn-btn py-2 px-4 text-sm font-semibold"
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
    <div className="min-h-screen bg-[color:var(--bg-color)] flex flex-col">
      {/* Header */}
      <header className="bg-transparent border-b-2 border-[color:var(--text-color)] p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                play('toggle');
                navigate('/');
              }}
              className="hand-drawn-btn px-4 py-2 flex items-center gap-2"
              title="Go back to main page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span>Go back</span>
            </button>
            <div className="text-xl font-bold">Round {round}</div>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <svg
                  key={i}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`w-8 h-8 ${i < lives ? 'text-[color:var(--text-color)]' : 'text-gray-300'}`}
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ))}
            </div>
          </div>
          <div className="text-xl font-bold">Score: {score}</div>
        </div>
      </header>

      <main className={`flex-1 container mx-auto p-4 overflow-y-auto thin-scrollbar ${showChosenText && selectedCarIndex !== null ? 'flex items-center justify-center' : ''}`}>
        {showChosenText && selectedCarIndex !== null ? (
          <div className="text-center w-full">
            <h2 className="text-3xl font-extrabold text-[color:var(--text-color)] mb-4 text-center">
              {getDisplayText(cars[selectedCarIndex])} was chosen!
            </h2>
          </div>
        ) : phase === 'voting' && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-6">Choose a Category</h2>
            {cars.length === 0 ? (
              <div className="text-xl">Loading cars...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                {cars.map((car, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCarSelect(idx)}
                    className={`w-full p-4 sm:p-6 rounded-xl border-2 border-[color:var(--text-color)] text-left text-base font-semibold shadow-none transition-all duration-150 ${selectedCarIndex === idx ? 'bg-[color:var(--text-color)] text-[color:var(--bg-color)] scale-105' : 'bg-transparent hover:scale-102'
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
          <div className="flex flex-col items-center w-full max-w-6xl mx-auto hand-drawn-panel p-4">
            <div className="text-2xl font-bold mb-2 text-center">{cars[selectedCarIndex].title}</div>
            <div className="w-full flex justify-center mb-2">
              <div
                className="text-base text-[color:var(--text-color)] opacity-80 w-full"
                style={{
                  textAlign: "left",
                }}
              >
                <div
                  className="px-2 thin-scrollbar leading-relaxed pb-1"
                  style={{
                    whiteSpace: 'pre-line',
                    maxHeight: '6em', // ~3.5 lines
                    overflowY: 'auto',
                  }}
                >
                  {cars[selectedCarIndex]?.shortDescription || 'No Description Available'}
                </div>
              </div>
            </div>

            {/* Image and Details */}
            <div className="flex flex-col lg:flex-row gap-4 w-full mb-4">
              {/* Carousel */}
              <div className="w-full lg:w-1/2 relative">
                <div className="aspect-video relative bg-black rounded-lg overflow-hidden border-2 border-[color:var(--text-color)]">
                  <img
                    src={cars[selectedCarIndex].thumbnailImages?.[currentImageIndex]?.imageUrl}
                    alt="Car"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  <button
                    onClick={() => setCurrentImageIndex(prev => prev === 0 ? (cars[selectedCarIndex].thumbnailImages?.length || 1) - 1 : prev - 1)}
                    className="no-press absolute left-0 top-[40%] bg-black text-[#FAEBD7] opacity-70 hover:opacity-100 p-3 rounded-r z-10 text-3xl md:text-4xl leading-none"
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(prev => prev === (cars[selectedCarIndex].thumbnailImages?.length || 1) - 1 ? 0 : prev + 1)}
                    className="no-press absolute right-0 top-[40%] bg-black text-[#FAEBD7] opacity-70 hover:opacity-100 p-3 rounded-l z-10 text-3xl md:text-4xl leading-none"
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => {
                      play('toggle');
                      setFullscreenImageIndex(currentImageIndex);
                      setShowFullscreenImage(true);
                    }}
                    className="absolute top-4 right-4 bg-black text-[#FAEBD7] opacity-70 hover:opacity-100 p-2 rounded z-10"
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
                      className={`w-2 h-2 rounded-full border border-[color:var(--text-color)] ${idx === currentImageIndex ? 'bg-[color:var(--text-color)]' : 'bg-transparent'}`}
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
            <div className="w-full max-w-3xl border-t-2 border-[color:var(--text-color)] pt-4">
              <div className="flex justify-center gap-4 mb-4">
              </div>

              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                {PRICE_RANGES.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handleRangeClick(range)}
                    className={`px-4 py-2 rounded-lg border-2 border-[color:var(--text-color)] text-sm transition-all ${selectedRange.label === range.label
                      ? 'bg-[color:var(--text-color)] text-[color:var(--bg-color)] font-bold'
                      : 'bg-transparent hover:bg-black/10'
                      }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4">
                <input
                  type="range"
                  min={getSliderMin()}
                  max={getSliderMax()}
                  step={100}
                  value={sliderPrice}
                  onChange={handleSliderChange}
                  className="w-full max-w-lg h-3 hand-drawn-slider border-2 border-[color:var(--text-color)] rounded-full cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--text-color) 0%, var(--text-color) ${((Number(sliderPrice) - getSliderMin()) / (getSliderMax() - getSliderMin())) * 100}%, transparent ${((Number(sliderPrice) - getSliderMin()) / (getSliderMax() - getSliderMin())) * 100}%, transparent 100%)`
                  }}
                />

                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">$</span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={guessPrice}
                      onChange={handleInputChange}
                      className="text-2xl font-bold hand-drawn-input w-40 text-right no-spinner"
                    />
                    <div className="flex flex-col gap-3 ml-2">
                      <button
                        type="button"
                        onClick={() => {
                          let newVal = Number(sliderPrice) + 100;
                          // Check if we need to switch range first
                          const foundRange = PRICE_RANGES.find((r, index) => {
                            if (index === PRICE_RANGES.length - 1) {
                              return newVal >= r.min;
                            }
                            return newVal >= r.min && newVal < r.max;
                          });

                          if (foundRange) {
                            if (foundRange.label !== selectedRange.label) {
                              setSelectedRange(foundRange);
                            }
                            // Allow value to exceed current max if we found a valid range (which we did)
                            setSliderPrice(newVal);
                            setGuessPrice(String(newVal));
                          } else {
                            // Fallback to clamping if no range found (shouldn't happen within global bounds)
                            if (newVal > getSliderMax()) newVal = getSliderMax();
                            setSliderPrice(newVal);
                            setGuessPrice(String(newVal));
                          }
                        }}
                        className="hover:scale-110 transition-transform focus:outline-none"
                        aria-label="Increase price"
                      >
                        <svg width="20" height="12" viewBox="-2 -2 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 7C1 7 5 2 7 1C9 2 13 7 13 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          let newVal = Number(sliderPrice) - 100;

                          const foundRange = PRICE_RANGES.find((r, index) => {
                            if (index === PRICE_RANGES.length - 1) {
                              return newVal >= r.min;
                            }
                            return newVal >= r.min && newVal < r.max;
                          });

                          if (foundRange) {
                            if (foundRange.label !== selectedRange.label) {
                              setSelectedRange(foundRange);
                            }
                            setSliderPrice(newVal);
                            setGuessPrice(String(newVal));
                          } else {
                            if (newVal < 0) newVal = 0; // Global min
                            if (newVal < getSliderMin()) newVal = getSliderMin(); // Clamp to current if no associated range found? but we should search globally
                            setSliderPrice(newVal);
                            setGuessPrice(String(newVal));
                          }
                        }}
                        className="hover:scale-110 transition-transform focus:outline-none"
                        aria-label="Decrease price"
                      >
                        <svg width="20" height="12" viewBox="-2 -2 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 1C1 1 5 6 7 7C9 6 13 1 13 1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {feedbackMessage && (
                  <div className={`text-xl font-bold ${feedbackMessage.includes('Correct') ? 'text-[color:var(--text-color)]' :
                    feedbackMessage.includes('Low') ? 'text-[color:var(--text-color)]' : 'text-[color:var(--text-color)]'
                    }`}>
                    {feedbackMessage}
                  </div>
                )}

                <button
                  onClick={handleGuess}
                  disabled={!!feedbackMessage && feedbackMessage.includes('Correct')}
                  className="hand-drawn-btn px-8 py-3 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
            onClick={() => {
              play('toggle');
              setShowFullscreenImage(false);
            }}
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
