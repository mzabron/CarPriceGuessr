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
  const [lastGuess, setLastGuess] = useState(null);
  const [guessSubmitted, setGuessSubmitted] = useState(false);

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

    // Listen for guess result/confirmation from backend
    socketService.socket?.on('game:guessResult', (data) => {
      setLastGuess({ playerName: data.playerName, price: data.price });
      setGuessSubmitted(false);
    });
    socketService.socket?.on('game:guessConfirmed', (data) => {
      setLastGuess({ playerName: data.playerName, price: data.price });
      setGuessSubmitted(false);
    });

    return () => {
      socketService.socket?.off('game:cars');
      socketService.socket?.off('game:votingStarted');
      socketService.socket?.off('game:votesUpdate');
      socketService.socket?.off('game:votingResult');
      socketService.socket?.off('game:guessResult');
      socketService.socket?.off('game:guessConfirmed');
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

  const renderCarDetailsGrid = (car) => (
    <div className="w-full max-w-2xl mb-2 text-sm md:text-base">
      <div className="grid grid-cols-2 gap-2 mb-1">
        <div className="flex flex-col items-start gap-1">
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
        <div className="flex flex-col items-start gap-1">
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
      <div className="mt-1">
        <span className="font-semibold">Condition Description:</span>
        <span
          className="ml-2 block rounded p-1"
          style={{
            whiteSpace: 'pre-line',
            maxHeight: '3em',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: '#a3a3a3 #f3f4f6',
            WebkitLineClamp: 2,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
          }}
        >
          {car?.conditionDescription || 'No Information'}
        </span>
      </div>
    </div>
  );

  // Auto-submit guess if timer runs out and it's your turn
  useEffect(() => {
    if (
      turnTimeLeft === 0 &&
      currentTurn?.playerName === playerName &&
      !guessSubmitted &&
      currentTurn &&
      guessPrice !== '' &&
      !isNaN(Number(guessPrice))
    ) {
      submitGuess();
    }
    // eslint-disable-next-line
  }, [turnTimeLeft, currentTurn]);

  function submitGuess() {
    if (guessPrice === '' || isNaN(Number(guessPrice))) return;
    setGuessSubmitted(true);
    socketService.socket.emit('game:confirmGuess', {
      roomId,
      playerName,
      price: Number(guessPrice),
    });
    // Do not setLastGuess here; let the backend event handle it for all players
  }

  useEffect(() => {
    if (
      currentTurn?.playerName === playerName &&
      guessPrice &&
      !isNaN(Number(guessPrice))
    ) {
      socketService.socket.emit('game:updatePendingGuess', {
        roomId,
        playerName,
        price: Number(guessPrice)
      });
    }
    // eslint-disable-next-line
  }, [guessPrice, currentTurn]);

  return (
    <div className="flex-1 bg-white p-2 sm:p-4 h-full">
      <div className="h-full flex flex-col max-w-screen-xl mx-auto">
        <div className="flex-1 bg-gray-100 rounded-lg p-2 sm:p-4 overflow-y-auto thin-scrollbar">
          {voting ? (
            <div>
              <h2 className="text-xl font-bold mb-3">Voting Phase ({votingTimeLeft}s left)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mx-auto">
                {cars.map((car, idx) => {
                  const voters = Object.entries(votes)
                    .filter(([_, v]) => v === idx)
                    .map(([name]) => name);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleVote(idx)}
                      className={`w-full p-4 sm:p-6 rounded-xl border-2 text-left text-base font-semibold shadow transition-all duration-150 ${
                        votes[playerName] === idx ? 'bg-blue-200 border-blue-400 scale-105' : 'bg-white border-gray-300 hover:scale-102'
                      }`}
                      style={{ minHeight: '90px' }}
                    >
                      {getDisplayText(car)}
                      <div className="flex flex-wrap gap-1 mt-2">
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
              <h2 className="text-3xl font-extrabold text-green-700 mb-4">
                {getDisplayText(cars[winningIndex])} was chosen!
              </h2>
            </div>
          ) : winningIndex !== null || selectedCarIndex !== null ? (
            <div className="flex flex-col items-center w-full">
              <div className="text-xl font-bold mb-1 text-center max-w-4xl">
                {cars[getActiveCarIndex()]?.title || 'No Title'}
              </div>
              <div className="w-full flex justify-center mb-2">
                <div
                  className="text-base text-gray-600 max-w-4xl w-full"
                  style={{
                    textAlign: "left",
                  }}
                >
                  <div
                    className="px-2"
                    style={{
                      whiteSpace: 'pre-line',
                      maxHeight: '3em',
                      overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#a3a3a3 #f3f4f6',
                      WebkitLineClamp: 2,
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {cars[getActiveCarIndex()]?.shortDescription || 'No Description Available'}
                  </div>
                </div>
              </div>
              {/* Responsive image/details block */}
              <div className="flex flex-col lg:flex-row gap-3 w-full mb-2">
                {/* Carousel */}
                <div className="w-full lg:w-1/2 flex-shrink-0 relative mx-auto">
                  <div className="aspect-video relative 3xl:max-h-[30vh] 4xl:max-h-[25vh]" style={{ maxHeight: '35vh' }}>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-l hover:bg-opacity-75 z-10"
                    >
                      ←
                    </button>
                    <img
                      src={cars[getActiveCarIndex()]?.thumbnailImages?.[currentImageIndex]?.imageUrl}
                      alt="Car"
                      className="absolute inset-0 w-full h-full object-contain bg-black rounded-lg"
                    />
                    <button
                      onClick={handleNextImage}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-r hover:bg-opacity-75 z-10"
                    >
                      →
                    </button>
                    <div
                      className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex flex-wrap gap-1 justify-center w-full px-4"
                      style={{
                        pointerEvents: 'auto',
                        maxWidth: '95%',
                        rowGap: '2px',
                      }}
                    >
                      {cars[getActiveCarIndex()]?.thumbnailImages?.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                          }`}
                          style={{
                            flex: '0 0 auto',
                          }}
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
              <div className="w-full mt-1">
                <div className="mb-2 font-bold text-lg text-center">Guess the price:</div>
                <div className="flex flex-wrap gap-2 mb-3 justify-center">
                  {PRICE_RANGES.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => handleRangeClick(range)}
                      className={`px-4 py-2 rounded-lg border text-sm transition-all duration-100 ${
                        selectedRange.label === range.label
                          ? 'bg-blue-200 border-blue-400 font-bold scale-105'
                          : 'bg-white border-gray-300 hover:bg-blue-50'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col md:flex-row items-center gap-2 mb-3 justify-center">
                  <input
                    type="range"
                    min={getSliderMin()}
                    max={getSliderMax()}
                    step={100}
                    value={sliderPrice}
                    onChange={handleSliderChange}
                    className="w-full md:w-[500px] accent-blue-500 h-8"
                    style={{
                      accentColor: "#2563eb",
                      height: "2rem",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <button
                    type="button"
                    className="ml-1 px-2 py-1 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center disabled:opacity-50"
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
                    <svg width="16" height="16" viewBox="0 0 18 18" className="fill-gray-600">
                      <polygon points="12,4 6,9 12,14" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={guessPrice}
                    onChange={handleInputChange}
                    className="w-28 md:w-36 border-2 border-blue-400 rounded-lg px-3 py-1 text-xl font-bold text-right shadow"
                    placeholder="Enter price"
                    inputMode="numeric"
                  />
                  <span className="ml-1 font-semibold text-xl">$</span>
                  <button
                    type="button"
                    className="ml-1 px-2 py-1 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
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
                    <svg width="16" height="16" viewBox="0 0 18 18" className="fill-gray-600">
                      <polygon points="6,4 12,9 6,14" />
                    </svg>
                  </button>
                </div>
                {/* Who's turn, steal, confirm guess */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-base">
                      Turn: <span className="text-blue-700">{currentTurn?.playerName || "..."}</span>
                    </span>
                    <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-base font-mono">
                      {turnTimeLeft !== null ? `${turnTimeLeft}s` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-base shadow transition active:scale-95 focus:outline-none"
                      style={{ minWidth: '100px' }}
                      disabled
                    >
                      Steal
                    </button>
                    <button
                      onClick={e => {
                        if (currentTurn?.playerName !== playerName || guessSubmitted) return;
                        submitGuess();
                        const btn = e.currentTarget;
                        btn.classList.add('scale-95', 'ring', 'ring-green-400');
                        setTimeout(() => {
                          btn.classList.remove('scale-95', 'ring', 'ring-green-400');
                        }, 180);
                      }}
                      className={`px-6 py-2 rounded-lg font-bold text-base transition shadow active:scale-95 focus:outline-none ${
                        currentTurn?.playerName === playerName && !guessSubmitted
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={
                        guessPrice === '' ||
                        isNaN(Number(guessPrice)) ||
                        currentTurn?.playerName !== playerName ||
                        guessSubmitted
                      }
                      style={{ transition: 'transform 0.15s, box-shadow 0.15s', minWidth: '140px' }}
                    >
                      Confirm Guess
                    </button>
                  </div>
                </div>
                {/* Last guess message next to timer */}
                {lastGuess && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-700 font-semibold">
                      {lastGuess.playerName} guess was ${lastGuess.price}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : selectedCarIndex === null ? (
            <div className="flex flex-col items-center gap-3">
              <h2 className="text-xl font-bold mb-2">Select a car to guess</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {cars.map((car, index) => (
                  <button
                    key={index}
                    onClick={() => handleCarSelect(index)}
                    className="p-3 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-base font-medium text-center min-h-[80px] flex items-center justify-center"
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