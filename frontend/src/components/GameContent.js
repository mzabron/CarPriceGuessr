import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';

const PLAYER_COLORS = [
  'text-red-600', 'text-blue-600', 'text-green-600', 'text-yellow-600',
  'text-purple-600', 'text-pink-600', 'text-cyan-600', 'text-amber-900',
  'text-orange-600', 'text-gray-600'
];

function getPlayerColorById(id, orderedIds) {
  if (!id) return 'text-gray-600';
  const idx = orderedIds.indexOf(id);
  return PLAYER_COLORS[(idx >= 0 ? idx : 0) % PLAYER_COLORS.length];
}

const GameContent = ({ gameSettings, players = [] }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
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
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [roundModalTimer, setRoundModalTimer] = useState(10);
  const [modalTimerRef, setModalTimerRef] = useState(null);
  const [countdownTimerRef, setCountdownTimerRef] = useState(null);
  const [stealUsedThisRound, setStealUsedThisRound] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);

  const PRICE_RANGES = [
    { label: '0 - 20k', min: 0, max: 20000 },
    { label: '20k - 100k', min: 20000, max: 100000 },
    { label: '100k - 300k', min: 100000, max: 300000 },
    { label: 'Over 300k', min: 300000, max: 1000000 }
  ];

  const currentUser = socketService.getCurrentUser() || {};
  const playerName = currentUser.name;
  const playerId = currentUser.id;
  const playerIdsInOrder = players.map(p => p.id);
  const [guessPrice, setGuessPrice] = useState('');
  const [sliderPrice, setSliderPrice] = useState(10000);
  const [selectedRange, setSelectedRange] = useState(PRICE_RANGES[0]);
  const [guessConfirmed, setGuessConfirmed] = useState(false);

  // Helper function to close round modal and clear timers
  const closeRoundModal = useCallback(() => {
    if (showRoundModal) {
      setShowRoundModal(false);
      setRoundResult(null);
      setRoundModalTimer(10);
      if (modalTimerRef) {
        clearTimeout(modalTimerRef);
        setModalTimerRef(null);
      }
      if (countdownTimerRef) {
        clearInterval(countdownTimerRef);
        setCountdownTimerRef(null);
      }
    }
  }, [showRoundModal, modalTimerRef, countdownTimerRef]);

  useEffect(() => {
    socketService.socket?.on('game:turn', (turnData) => {
      setCurrentTurn(turnData);
      setStealUsedThisRound(turnData.stealUsedThisRound || false);
      // Calculate seconds left based on deadline
      if (turnData.deadline) {
        setTurnTimeLeft(Math.max(0, Math.round((turnData.deadline - Date.now()) / 1000)));
      } else {
        setTurnTimeLeft(turnData.answerTime || 10);
      }
      // Clear last guess if this is the first turn OR if roundId/gameId changes
      if (turnData.turnNumber === 1 || turnData.roundId !== currentTurn?.roundId || turnData.gameId !== currentTurn?.gameId) {
        setLastGuess(null);
      }
      
      // Close round modal when a new turn starts (new round in progress)
      closeRoundModal();
    });

    socketService.socket?.on('game:stealUsed', (data) => {
      setStealUsedThisRound(true);
      // You could add a notification here about who used the steal
      console.log(`${data.stealingPlayer} used a steal! Now it's their turn.`);
    });

    return () => {
      socketService.socket?.off('game:turn');
      socketService.socket?.off('game:stealUsed');
    };
  }, [closeRoundModal]);

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
      
      // Reset price guessing state for new round
      setGuessPrice('');
      setSliderPrice(10000);
      setSelectedRange(PRICE_RANGES[0]);
      
      // Close round modal when new cars are received (new round started)
      closeRoundModal();
    });

    socketService.socket?.on('game:votingStarted', () => {
      setVoting(true);
      setVotes({});
      setWinningIndex(null);
      setVotingTimeLeft(15);
      setShowChosenText(false);
      setStealUsedThisRound(false); // Reset steal usage for new round
      
      // Close round modal when voting starts (new round in progress)
      closeRoundModal();
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

    socketService.socket?.on('game:votesUpdate', (votesUpdate) => {
      setVotes(votesUpdate);
    });

    socketService.socket?.on('game:votingResult', ({ winningIndex }) => {
      setWinningIndex(winningIndex);
      setVoting(false);
      setShowChosenText(true);
      setTimeout(() => setShowChosenText(false), 2000);
    });

    // Listen for guess result/confirmation from backend
    socketService.socket?.on('game:guessResult', (data) => {
      setLastGuess({ playerId: data.playerId, playerName: data.playerName, price: data.price });
      setGuessSubmitted(false);
    });
    socketService.socket?.on('game:guessConfirmed', (data) => {
      setLastGuess({ playerId: data.playerId, playerName: data.playerName, price: data.price });
      setGuessSubmitted(false);
    });

    socketService.socket?.on('game:finishRound', (data) => {
      setRoundResult(data);
      setShowRoundModal(true);
      setRoundModalTimer(10); // Reset timer to 10 seconds
      setCurrentTurn(null);
      setTurnTimeLeft(null);
      setLastGuess(null);
      setGuessSubmitted(false);
      setGuessConfirmed(false);
      setSelectedCarIndex(null);
    });

    socketService.socket?.on('game:finishGame', (data) => {
      // Navigate to Results page with game data
      navigate('/results', {
        state: {
          gameData: {
            players: data.players,
            roomId: data.roomId,
            roomCode: data.roomCode,
            roomName: data.roomName,
            gameHistory: data.gameHistory
          }
        }
      });
    });

    socketService.socket?.on('game:requestNextRound', (data) => {
      // When any player requests next round, close modal for everyone and clear timers
      closeRoundModal();
      
      // If current player is host, start the next round
  const currentPlayer = players.find(p => p.id === playerId);
      if (currentPlayer && currentPlayer.isHost) {
        socketService.socket.emit('game:startRound', { roomId });
      }
    });

    return () => {
      socketService.socket?.off('game:cars');
      socketService.socket?.off('game:votingStarted');
      socketService.socket?.off('game:votesUpdate');
      socketService.socket?.off('game:votingResult');
      socketService.socket?.off('game:guessResult');
      socketService.socket?.off('game:guessConfirmed');
      socketService.socket?.off('game:finishRound');
      socketService.socket?.off('game:finishGame');
      socketService.socket?.off('game:requestNextRound');
    };
  }, [closeRoundModal, modalTimerRef, countdownTimerRef, players, playerName, roomId, navigate]);

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
    socketService.socket.emit('game:vote', { roomId, playerId, playerName, carIndex: carIdx });
  };

  const handleSliderChange = (e) => {
    let value = Number(e.target.value);
    const sliderMin = getSliderMin();
    const sliderMax = getSliderMax();
    if (value < sliderMin) value = sliderMin;
    if (value > sliderMax) value = sliderMax;
    setSliderPrice(value);
    setGuessPrice(value);
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

  const renderCarDetailsGrid = (car) => (
    <div className="w-full max-w-2xl mb-2 text-sm md:text-base" style={{ maxHeight: '15.5em', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#a3a3a3 #f3f4f6' }}>
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
            // No maxHeight, no overflow, no scrollbar for description
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
  currentTurn?.playerId === playerId &&
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
      playerId,
      playerName,
      price: Number(guessPrice),
    });
    // Do not setLastGuess here; let the backend event handle it for all players
  }

  useEffect(() => {
    if (
  currentTurn?.playerId === playerId &&
      guessPrice &&
      !isNaN(Number(guessPrice))
    ) {
      socketService.socket.emit('game:updatePendingGuess', {
        roomId,
        playerId,
        playerName,
        price: Number(guessPrice)
      });
    }
    // eslint-disable-next-line
  }, [guessPrice, currentTurn]);

  useEffect(() => {
    if (showRoundModal) {
      const timer = setTimeout(() => {
        setShowRoundModal(false);
        setRoundResult(null);
        socketService.socket.emit('game:startRound', { roomId });
      }, 10000); // 10 seconds
      setModalTimerRef(timer);
      
      // Countdown timer
      const countdownInterval = setInterval(() => {
        setRoundModalTimer(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setCountdownTimerRef(countdownInterval);
      
      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
        setModalTimerRef(null);
        setCountdownTimerRef(null);
      };
    }
  }, [showRoundModal, roomId]);

  const handleNextRound = () => {
    // Use the helper function to close modal and clear timers
    closeRoundModal();
    
    // Check if current player is host
  const currentPlayer = players.find(p => p.id === playerId);
    if (currentPlayer && currentPlayer.isHost) {
      // Host starts the round
      socketService.socket.emit('game:startRound', { roomId });
    } else {
      // Non-host requests next round - emit to all players including host
      socketService.socket.emit('game:requestNextRound', { roomId, playerName });
    }
  };

  const handleSteal = () => {
  const currentPlayer = players.find(p => p.id === playerId);
    
    // Check if player has steals remaining
    if (!currentPlayer || currentPlayer.stealsRemaining <= 0) {
      alert('You have no steals remaining!');
      return;
    }
    
    // Check if steal was already used this round
    if (stealUsedThisRound) {
      alert('Steal has already been used this round!');
      return;
    }
    
    // Check if it's already their turn
  if (currentTurn?.playerId === playerId) {
      alert('It is already your turn!');
      return;
    }
    
    // Emit steal event
    socketService.socket.emit('game:useSteal', { roomId });
  };

  const getCurrentPlayerSteals = () => {
  const currentPlayer = players.find(p => p.id === playerId);
    return currentPlayer ? currentPlayer.stealsRemaining : 0;
  };

  const canUseSteal = () => {
  const currentPlayer = players.find(p => p.id === playerId);
    return (
      currentPlayer &&
      currentPlayer.stealsRemaining > 0 &&
      !stealUsedThisRound &&
  currentTurn?.playerId !== playerId &&
      currentTurn // Make sure there is an active turn
    );
  };

  return (
    <div className="flex-1 bg-white p-2 sm:p-4 h-full">
      <div className="h-full flex flex-col max-w-screen-xl mx-auto">
        <div className="flex-1 bg-gray-100 rounded-lg p-2 sm:p-4 overflow-y-auto thin-scrollbar">
          {showRoundModal && roundResult && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white rounded-lg p-6 shadow-lg text-center max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4">Round Finished!</h2>
                {roundResult.playerName ? (
                  <>
                    <p className="mb-2">
                      <span className="font-semibold">{roundResult.playerName}</span> guessed <span className="font-semibold">${roundResult.price}</span>
                    </p>
                    <p className="mb-4">
                      Actual price: <span className="font-semibold">${roundResult.actualPrice}</span>
                    </p>
                    {roundResult.accuracyPoints && roundResult.turnBonus && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-semibold text-green-800 mb-2">Points Breakdown:</p>
                        <div className="text-sm text-green-700">
                          <p>Accuracy: {roundResult.accuracyPoints} points</p>
                          <p>Turn Bonus: {roundResult.turnBonus} points ({roundResult.turnsPlayed} turns × 5)</p>
                          <p className="font-bold border-t pt-1 mt-1">Total: {roundResult.pointsAwarded} points</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mb-4 text-gray-600">{roundResult.message || "Round ended with no winner"}</p>
                )}
                <button
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  onClick={handleNextRound}
                >
                  {roundResult.isLastRound && roundResult.playerName ? 
                    `View Results (${roundModalTimer}s)` : 
                    `Next Round (${roundModalTimer}s)`
                  }
                </button>
              </div>
            </div>
          )}
          {voting ? (
            <div>
              <h2 className="text-xl font-bold mb-3">Voting Phase ({votingTimeLeft}s left)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mx-auto">
                {cars.map((car, idx) => {
                  const voters = Object.entries(votes)
                    .filter(([_, v]) => v === idx)
                    .map(([idOrName]) => {
                      const player = players.find(p => p.id === idOrName || p.name === idOrName);
                      return player ? { id: player.id, name: player.name } : { id: idOrName, name: idOrName };
                    });
                  return (
                    <button
                      key={idx}
                      onClick={() => handleVote(idx)}
                      className={`w-full p-4 sm:p-6 rounded-xl border-2 text-left text-base font-semibold shadow transition-all duration-150 ${
                        (votes[playerId] === idx || votes[playerName] === idx) ? 'bg-blue-200 border-blue-400 scale-105' : 'bg-white border-gray-300 hover:scale-102'
                      }`}
                      style={{ minHeight: '90px' }}
                    >
                      {getDisplayText(car)}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {voters.map((v) => (
                          <span key={v.id} className={`font-bold ${getPlayerColorById(v.id, playerIdsInOrder)}`}>
                            {v.name}
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
                      maxHeight: '6em',
                      overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#a3a3a3 #f3f4f6',
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
                          className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
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
                      className={`px-4 py-2 rounded-lg border text-sm transition-all duration-100 ${selectedRange.label === range.label
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
                      if (newValue < 0) newValue = 0; // Only prevent going below 0
                      setSliderPrice(newValue);
                      setGuessPrice(newValue);
                      const foundRange = PRICE_RANGES.find((r, index) => {
                        // For the last range, just check if newValue is >= min
                        if (index === PRICE_RANGES.length - 1) {
                          return newValue >= r.min;
                        }
                        // For other ranges, check if newValue is within the range
                        return newValue >= r.min && newValue < r.max;
                      });
                      if (foundRange && foundRange.label !== selectedRange.label) {
                        setSelectedRange(foundRange);
                      }
                    }}
                    aria-label="Decrease price"
                    disabled={Number(sliderPrice) <= 0}
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
                      const foundRange = PRICE_RANGES.find((r, index) => {
                        // For the last range, just check if newValue is >= min
                        if (index === PRICE_RANGES.length - 1) {
                          return newValue >= r.min;
                        }
                        // For other ranges, check if newValue is within the range
                        return newValue >= r.min && newValue < r.max;
                      });
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
                      Turn: <span className={getPlayerColorById(currentTurn?.playerId, playerIdsInOrder)}>{currentTurn?.playerName || "..."}</span>
                    </span>
                    <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-base font-mono">
                      {turnTimeLeft !== null ? `${turnTimeLeft}s` : ""}
                    </span>
                    {/* Last guess message next to timer */}
                    {lastGuess && (
                      <span className="text-sm font-semibold ml-2 flex items-center">
                        <span className={getPlayerColorById(lastGuess.playerId, playerIdsInOrder)} style={{ marginRight: 4 }}>{lastGuess.playerName}</span> guess was <span className="text-green-700 ml-1">${lastGuess.price}</span>
                        {(() => {
                          // Compare guess to actual car price
                          const car = cars[getActiveCarIndex()];
                          let actualPrice = car?.price;
                          if (actualPrice && typeof actualPrice === 'string') {
                            // Try to extract number from string like "12345 USD"
                            const match = actualPrice.match(/([\d,.]+)/);
                            if (match) actualPrice = match[1].replace(/,/g, '');
                          }
                          actualPrice = Number(actualPrice);
                          const guess = Number(lastGuess.price);
                          if (!isNaN(actualPrice) && !isNaN(guess)) {
                            if (guess < actualPrice) return <span className="ml-1 text-black">and it was too <span className="text-blue-700 font-bold">low</span></span>;
                            if (guess > actualPrice) return <span className="ml-1 text-black">and it was too <span className="text-red-700 font-bold">high</span></span>;
                            if (guess === actualPrice) return <span className="ml-1 text-green-700">and it was correct!</span>;
                          }
                          return null;
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSteal}
                      className={`px-6 py-2 rounded-lg font-bold text-base shadow transition active:scale-95 focus:outline-none ${
                        canUseSteal()
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      style={{ minWidth: '100px' }}
                      disabled={!canUseSteal()}
                      title={
                        stealUsedThisRound 
                          ? 'Steal already used this round'
                          : getCurrentPlayerSteals() <= 0 
                            ? 'No steals remaining'
                            : (currentTurn?.playerId === playerId)
                              ? 'Already your turn'
                              : `Steal (${getCurrentPlayerSteals()} left)`
                      }
                    >
                      Steal {getCurrentPlayerSteals() > 0 ? `(${getCurrentPlayerSteals()})` : ''}
                    </button>
                    <button
                      onClick={e => {
                        if (currentTurn?.playerId !== playerId || guessSubmitted) return;
                        submitGuess();
                        const btn = e.currentTarget;
                        btn.classList.add('scale-95', 'ring', 'ring-green-400');
                        setTimeout(() => {
                          btn.classList.remove('scale-95', 'ring', 'ring-green-400');
                        }, 180);
                      }}
                      className={`px-6 py-2 rounded-lg font-bold text-base transition shadow active:scale-95 focus:outline-none ${(currentTurn?.playerId === playerId) && !guessSubmitted
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      disabled={
                        guessPrice === '' ||
                        isNaN(Number(guessPrice)) ||
                        currentTurn?.playerId !== playerId ||
                        guessSubmitted
                      }
                      style={{ transition: 'transform 0.15s, box-shadow 0.15s', minWidth: '140px' }}
                    >
                      Confirm Guess
                    </button>
                  </div>
                </div>
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
                        className={`w-3 h-3 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
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
      
      {/* Fullscreen image viewer */}
      {showFullscreenImage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50 p-4">
          <div className="relative w-full h-full max-w-5xl max-h-[90vh]">
            <button
              onClick={() => setShowFullscreenImage(false)}
              className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-300 z-20"
              title="Close fullscreen"
            >
              ×
            </button>
            <button
              onClick={() => {
                const totalImages = cars[getActiveCarIndex()]?.thumbnailImages?.length || 0;
                setFullscreenImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-3xl hover:text-gray-300 z-20"
              title="Previous image"
            >
              ‹
            </button>
            <button
              onClick={() => {
                const totalImages = cars[getActiveCarIndex()]?.thumbnailImages?.length || 0;
                setFullscreenImageIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-3xl hover:text-gray-300 z-20"
              title="Next image"
            >
              ›
            </button>
            <img
              src={cars[getActiveCarIndex()]?.thumbnailImages?.[fullscreenImageIndex]?.imageUrl}
              alt="Fullscreen Car"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GameContent;