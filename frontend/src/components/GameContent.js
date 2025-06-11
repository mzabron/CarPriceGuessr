import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import socketService from '../services/socketService';

const PLAYER_COLORS = [
  'text-red-600', 'text-blue-600', 'text-green-600', 'text-yellow-600',
  'text-purple-600', 'text-pink-600', 'text-indigo-600', 'text-teal-600',
  'text-orange-600', 'text-gray-600'
];

function getPlayerColor(name, playerList) {
  const idx = playerList.findIndex(n => n === name);
  return PLAYER_COLORS[idx % PLAYER_COLORS.length];
}

const GameContent = ({ gameSettings, players = [] }) => {
  const { roomId } = useParams();
  const [cars, setCars] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedCarIndex, setSelectedCarIndex] = useState(null);
  const [voting, setVoting] = useState(false);
  const [votes, setVotes] = useState({});
  const [votingTimeLeft, setVotingTimeLeft] = useState(15);
  const [winningIndex, setWinningIndex] = useState(null);
  const [showChosenText, setShowChosenText] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState(null);

  const PRICE_RANGES = [
    { label: '0 - 100k', min: 0, max: 100000 },
    { label: '100k - 200k', min: 100000, max: 200000 },
    { label: '200k - 300k', min: 200000, max: 300000 },
    { label: 'Over 300k', min: 300000, max: 1000000 }
  ];

  const playerName = socketService.getCurrentUser()?.name;
  const playerNames = players.map(p => p.name);
  const [guessPrice, setGuessPrice] = useState('');
  const [sliderPrice, setSliderPrice] = useState(10000);
  const [selectedRange, setSelectedRange] = useState(PRICE_RANGES[0]);
  const [guessConfirmed, setGuessConfirmed] = useState(false);

  useEffect(() => {
    socketService.socket?.on('game:turn', (turnData) => {
      setCurrentTurn(turnData);
      // Calculate seconds left based on deadline
      if (turnData.deadline) {
        setTurnTimeLeft(Math.max(0, Math.round((turnData.deadline - Date.now()) / 1000)));
      } else {
        setTurnTimeLeft(turnData.answerTime || 10);
      }
    });

    return () => {
      socketService.socket?.off('game:turn');
    };
  }, []);

  useEffect(() => {
    if (turnTimeLeft === null) return;
    if (turnTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setTurnTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [turnTimeLeft]);



  useEffect(() => {
    socketService.socket?.on('game:cars', (carList) => {
      setCars(carList.itemSummaries || []);
      setCurrentImageIndex(0);
      setSelectedCarIndex(null);
    });

    socketService.socket?.on('game:votingStarted', () => {
      setVoting(true);
      setVotes({});
      setWinningIndex(null);
      setVotingTimeLeft(15);
      setShowChosenText(false);
      const interval = setInterval(() => {
        setVotingTimeLeft(t => {
          if (t <= 1) {
            clearInterval(interval);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    });

    socketService.socket?.on('game:votesUpdate', (votes) => {
      setVotes(votes);
    });

    socketService.socket?.on('game:votingResult', ({ winningIndex }) => {
      setWinningIndex(winningIndex);
      setVoting(false);
      setShowChosenText(true);
      setTimeout(() => setShowChosenText(false), 2000);
    });

    return () => {
      socketService.socket?.off('game:cars');
      socketService.socket?.off('game:votingStarted');
      socketService.socket?.off('game:votesUpdate');
      socketService.socket?.off('game:votingResult');
    };
  }, []);

  useEffect(() => {
    if (winningIndex !== null && cars[winningIndex]?.thumbnailImages) {
      cars[winningIndex].thumbnailImages.forEach(img => {
        const image = new window.Image();
        image.src = img.imageUrl;
      });
    }
  }, [winningIndex, cars]);

  const getDisplayText = (car) => {
    if (car.conditionDescription) {
      const words = car.conditionDescription.split(' ');
      const shortDesc = words.slice(0, 6).join(' ');
      return shortDesc + (words.length > 6 ? '...' : '');
    }
    const fields = [
      'carType',
      'bodyType',
      'horsePower',
      'numberOfCylinders',
      'numberOfDoors',
      'make'
    ];
    for (const field of fields) {
      if (
        car[field] &&
        car[field] !== 'No Information' &&
        car[field] !== '--'
      ) {
        if (field === 'numberOfCylinders') {
          return `Cylinders number: ${car[field]}`;
        }
        if (field === 'numberOfDoors') {
          return `Doors number: ${car[field]}`;
        }
        return car[field];
      }
    }
    return 'No Information Available';
  };

  const getActiveCarIndex = () => {
    if (winningIndex !== null) return winningIndex;
    if (selectedCarIndex !== null) return selectedCarIndex;
    return 0;
  };

  const handlePrevImage = () => {
    const idx = getActiveCarIndex();
    if (!cars[idx]?.thumbnailImages) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? cars[idx].thumbnailImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    const idx = getActiveCarIndex();
    if (!cars[idx]?.thumbnailImages) return;
    setCurrentImageIndex((prev) =>
      prev === cars[idx].thumbnailImages.length - 1 ? 0 : prev + 1
    );
  };

  const handleCarSelect = (index) => {
    setSelectedCarIndex(index);
    setCurrentImageIndex(0);
  };

  const handleVote = (carIdx) => {
    socketService.socket.emit('game:vote', { roomId, playerName, carIndex: carIdx });
  };

  const handleSliderChange = (e) => {
    let value = Number(e.target.value);
    const sliderMin = getSliderMin();
    const sliderMax = getSliderMax();
    if (value < sliderMin) value = sliderMin;
    if (value > sliderMax) value = sliderMax;
    setSliderPrice(value);
    setGuessPrice(value);
    const foundRange = PRICE_RANGES.find(
      r =>
        (value === sliderMin && r.label === selectedRange.label) ||
        (value === sliderMax && r.label === selectedRange.label) ||
        (value > r.min && value < r.max)
    );
    if (foundRange && foundRange.label !== selectedRange.label) {
      setSelectedRange(foundRange);
    }
  };

  const getSliderMax = () => selectedRange.max;
  const getSliderMin = () => selectedRange.min;

  const handleRangeClick = (range) => {
    setSelectedRange(range);
    const middle = Math.round((range.min + range.max) / 2 / 100) * 100;
    setSliderPrice(middle);
    setGuessPrice(middle);
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setGuessPrice(value);
    setSliderPrice(Number(value));
    const price = Number(value);
    const foundRange = PRICE_RANGES.find(r => price >= r.min && price < r.max);
    if (foundRange && foundRange.label !== selectedRange.label) {
      setSelectedRange(foundRange);
    }
  };

  const handleConfirmGuess = () => {
    setGuessConfirmed(true);
    setTimeout(() => setGuessConfirmed(false), 1500);
  };

  const renderCarDetailsGrid = (car) => (
    <div className="w-full max-w-2xl mb-4 text-lg">
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="flex flex-col items-start gap-2">
          <div>
            <span className="font-semibold">Make:</span>
            <span className="ml-2">{car?.make || 'No Information'}</span>
          </div>
          <div>
            <span className="font-semibold">Model:</span>
            <span className="ml-2">{car?.model || 'No Information'}</span>
          </div>
          <div>
            <span className="font-semibold">Year:</span>
            <span className="ml-2">{car?.year || 'No Information'}</span>
          </div>
          <div>
            <span className="font-semibold">Condition:</span>
            <span className="ml-2">{car?.condition || 'No Information'}</span>
          </div>
          <div>
            <span className="font-semibold">Mileage:</span>
            <span className="ml-2">{car?.mileage || 'No Information'}</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2">
          <div>
            <span className="font-semibold">Engine:</span>
            <span className="ml-2">{car?.engine || 'No Information'}</span>
          </div>
          <div>
            <span className="font-semibold">Fuel Type:</span>
            <span className="ml-2">{car?.fuelType || 'No Information'}</span>
          </div>
          <div>
            <span className="font-semibold">Horse Power:</span>
            <span className="ml-2">{car?.horsePower || 'No Information'}</span>
          </div>
          <div>
            <span className="font-semibold">Location:</span>
            <span className="ml-2">
              {car?.itemLocation?.city ? `${car.itemLocation.city}, ` : ''}
              {car?.itemLocation?.country || 'No Information'}
            </span>
          </div>
          <div>
            <span className="font-semibold">For Sale By:</span>
            <span className="ml-2">{car?.forSaleBy || 'No Information'}</span>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <span className="font-semibold">Condition Description:</span>
        <span
          className="ml-2 block rounded p-2"
          style={{
            whiteSpace: 'pre-line',
            maxHeight: '5em',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: '#a3a3a3 #f3f4f6',
            WebkitLineClamp: 3,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
          }}
        >
          {car?.conditionDescription || 'No Information'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-white p-2 sm:p-4">
      <div className="h-full flex flex-col max-w-screen-xl mx-auto">
        <div className="flex-1 bg-gray-100 rounded-lg p-2 sm:p-4 overflow-auto">
          {voting ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Voting Phase ({votingTimeLeft}s left)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
                {cars.map((car, idx) => {
                  const voters = Object.entries(votes)
                    .filter(([_, v]) => v === idx)
                    .map(([name]) => name);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleVote(idx)}
                      className={`w-full p-6 sm:p-8 rounded-xl border-2 text-left text-xl font-semibold shadow transition-all duration-150 ${
                        votes[playerName] === idx ? 'bg-blue-200 border-blue-400 scale-105' : 'bg-white border-gray-300 hover:scale-102'
                      }`}
                      style={{ minHeight: '110px' }}
                    >
                      {getDisplayText(car)}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {voters.map((name) => (
                          <span key={name} className={`font-bold ${getPlayerColor(name, playerNames)}`}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : showChosenText && winningIndex !== null ? (
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-4xl font-extrabold text-green-700 mb-8">
                {getDisplayText(cars[winningIndex])} was chosen!
              </h2>
            </div>
          ) : winningIndex !== null || selectedCarIndex !== null ? (
            <div className="flex flex-col items-center w-full">
              <div className="text-2xl font-bold mb-2 text-center max-w-4xl">
                {cars[getActiveCarIndex()]?.title || 'No Title'}
              </div>
              <div className="w-full flex justify-center mb-4">
                <div
                  className="text-lg text-gray-600 max-w-4xl w-full"
                  style={{
                    textAlign: "left",
                  }}
                >
                  <div
                    className="px-2"
                    style={{
                      whiteSpace: 'pre-line',
                      maxHeight: '4.5em',
                      overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#a3a3a3 #f3f4f6',
                      WebkitLineClamp: 3,
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {cars[getActiveCarIndex()]?.shortDescription || 'No Description Available'}
                  </div>
                </div>
              </div>
              {/* Responsive image/details block */}
              <div className="flex flex-col lg:flex-row gap-6 w-full mb-4">
                {/* Carousel */}
                <div className="w-full lg:w-1/2 flex-shrink-0 relative mx-auto">
                  <div className="aspect-video relative">
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-4 rounded-l hover:bg-opacity-75 z-10"
                    >
                      ←
                    </button>
                    <img
                      src={cars[getActiveCarIndex()]?.thumbnailImages?.[currentImageIndex]?.imageUrl}
                      alt="Car"
                      className="absolute inset-0 w-full h-full object-contain bg-black rounded-lg"
                      style={{ maxHeight: '60vh' }}
                    />
                    <button
                      onClick={handleNextImage}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-4 rounded-r hover:bg-opacity-75 z-10"
                    >
                      →
                    </button>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {cars[getActiveCarIndex()]?.thumbnailImages?.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-3 h-3 rounded-full ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Car details */}
                <div className="flex-1">
                  {renderCarDetailsGrid(cars[getActiveCarIndex()])}
                </div>
              </div>

              {/* Guess the price section - moved directly under car images/details */}
              <div className="w-full mt-2">
                <div className="mb-4 font-extrabold text-2xl text-center">Guess the price:</div>
                <div className="flex flex-wrap gap-3 mb-6 justify-center">
                  {PRICE_RANGES.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => handleRangeClick(range)}
                      className={`px-6 py-3 rounded-lg border text-lg transition-all duration-100 ${
                        selectedRange.label === range.label
                          ? 'bg-blue-200 border-blue-400 font-bold scale-105'
                          : 'bg-white border-gray-300 hover:bg-blue-50'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 mb-4 justify-center">
                  <input
                    type="range"
                    min={getSliderMin()}
                    max={getSliderMax()}
                    step={100}
                    value={sliderPrice}
                    onChange={handleSliderChange}
                    className="w-full md:w-[600px] accent-blue-500 h-12"
                    style={{
                      accentColor: "#2563eb",
                      height: "3rem",
                      borderRadius: "1rem",
                    }}
                  />
                  <button
                    type="button"
                    className="ml-2 px-2 py-2 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center disabled:opacity-50"
                    onClick={() => {
                      let newValue = Number(sliderPrice) - 100;
                      if (newValue < getSliderMin()) newValue = getSliderMin();
                      setSliderPrice(newValue);
                      setGuessPrice(newValue);
                      const foundRange = PRICE_RANGES.find(r => newValue >= r.min && newValue <= r.max);
                      if (foundRange && foundRange.label !== selectedRange.label) {
                        setSelectedRange(foundRange);
                      }
                    }}
                    aria-label="Decrease price"
                    disabled={Number(sliderPrice) <= getSliderMin()}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" className="fill-gray-600">
                      <polygon points="12,4 6,9 12,14" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={guessPrice}
                    onChange={handleInputChange}
                    className="w-32 md:w-40 border-2 border-blue-400 rounded-lg px-4 py-2 text-2xl font-bold text-right shadow"
                    placeholder="Enter price"
                    inputMode="numeric"
                  />
                  <span className="ml-1 font-semibold text-2xl">$</span>
                  <button
                    type="button"
                    className="ml-2 px-2 py-2 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    onClick={() => {
                      let newValue = Number(sliderPrice) + 100;
                      if (newValue > getSliderMax()) newValue = getSliderMax();
                      setSliderPrice(newValue);
                      setGuessPrice(newValue);
                      const foundRange = PRICE_RANGES.find(r => newValue >= r.min && newValue <= r.max);
                      if (foundRange && foundRange.label !== selectedRange.label) {
                        setSelectedRange(foundRange);
                      }
                    }}
                    aria-label="Increase price"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" className="fill-gray-600">
                      <polygon points="6,4 12,9 6,14" />
                    </svg>
                  </button>
                </div>
                {/* Who's turn, steal, confirm guess */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-bold text-lg">
                      Turn: <span className="text-blue-700">{currentTurn?.playerName || "..."}</span>
                    </span>
                    <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded text-lg font-mono">
                      {turnTimeLeft !== null ? `${turnTimeLeft}s` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xl shadow transition active:scale-95 focus:outline-none"
                      style={{ minWidth: '120px' }}
                    >
                      Steal
                    </button>
                    <button
                      onClick={e => {
                        handleConfirmGuess();
                        const btn = e.currentTarget;
                        btn.classList.add('scale-95', 'ring', 'ring-green-400');
                        setTimeout(() => {
                          btn.classList.remove('scale-95', 'ring', 'ring-green-400');
                        }, 180);
                      }}
                      className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-xl hover:bg-green-700 transition shadow active:scale-95 focus:outline-none"
                      disabled={!guessPrice || isNaN(Number(guessPrice))}
                      style={{ transition: 'transform 0.15s, box-shadow 0.15s' }}
                    >
                      Confirm Guess
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedCarIndex === null ? (
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-2xl font-bold mb-4">Select a car to guess</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {cars.map((car, index) => (
                  <button
                    key={index}
                    onClick={() => handleCarSelect(index)}
                    className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-lg font-medium text-center min-h-[100px] flex items-center justify-center"
                  >
                    {getDisplayText(car)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold mb-2 text-center max-w-4xl">
                {cars[selectedCarIndex]?.title || 'No Title'}
              </div>
              <div className="text-lg mb-4 text-center max-w-4xl text-gray-600">
                {cars[selectedCarIndex]?.shortDescription || 'No Description Available'}
              </div>
              <div className="w-full max-w-4xl mb-4 relative">
                <div className="aspect-[16/9] relative">
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-4 rounded-l hover:bg-opacity-75 z-10"
                  >
                    ←
                  </button>
                  <img
                    src={cars[selectedCarIndex]?.thumbnailImages?.[currentImageIndex]?.imageUrl}
                    alt="Car"
                    className="absolute inset-0 w-full h-full object-contain bg-black rounded-lg"
                  />
                  <button
                    onClick={handleNextImage}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-4 rounded-r hover:bg-opacity-75 z-10"
                  >
                    →
                  </button>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {cars[selectedCarIndex]?.thumbnailImages?.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-3 h-3 rounded-full ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {renderCarDetailsGrid(cars[selectedCarIndex])}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameContent;