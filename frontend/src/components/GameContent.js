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
  const [currentRound, setCurrentRound] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedCarIndex, setSelectedCarIndex] = useState(null);
  const [voting, setVoting] = useState(false);
  const [votes, setVotes] = useState({});
  const [votingTimeLeft, setVotingTimeLeft] = useState(15);
  const [winningIndex, setWinningIndex] = useState(null);
  const [showChosenText, setShowChosenText] = useState(false);


  const playerName = socketService.getCurrentUser()?.name;
  const playerNames = players.map(p => p.name);

  useEffect(() => {
    // Listen for car list from server
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

  const getDisplayText = (car) => {
    // Show first 6 words of conditionDescription if it exists
    if (car.conditionDescription) {
      const words = car.conditionDescription.split(' ');
      const shortDesc = words.slice(0, 6).join(' ');
      return shortDesc + (words.length > 6 ? '...' : '');
    }
    // Check other fields in hierarchy
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

  // Helper to get the current car index for the carousel
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

  return (
    <div className="flex-1 bg-white p-4">
      <div className="h-full flex flex-col">
        <h1 className="text-3xl font-bold mb-4">Game in Progress</h1>
        <div className="flex-1 bg-gray-100 rounded-lg p-4">
          {voting ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Voting Phase ({votingTimeLeft}s left)</h2>
              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                {cars.map((car, idx) => {
                  // Find all player names who voted for this car
                  const voters = Object.entries(votes)
                    .filter(([_, v]) => v === idx)
                    .map(([name]) => name);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleVote(idx)}
                      className={`p-4 rounded-lg border ${votes[playerName] === idx ? 'bg-blue-200' : 'bg-white'}`}
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
              <h2 className="text-4xl font-extrabold text-green-700 mb-8">
                {getDisplayText(cars[winningIndex])} was chosen!
              </h2>
            </div>
          ) : winningIndex !== null || selectedCarIndex !== null ? (
            <div className="flex flex-col items-center">
              {/* Car Title and Description */}
              <div className="text-2xl font-bold mb-2 text-center max-w-4xl">
                {cars[getActiveCarIndex()]?.title || 'No Title'}
              </div>
              <div className="text-lg mb-4 text-center max-w-4xl text-gray-600">
                {cars[getActiveCarIndex()]?.shortDescription || 'No Description Available'}
              </div>

              {/* Image Carousel */}
              <div className="w-full max-w-4xl mb-4 relative">
                <div className="aspect-[16/9] relative">
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

              {/* Car Details Grid */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-4 text-lg">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Year:</span>
                  <span>{cars[getActiveCarIndex()]?.year || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Make:</span>
                  <span>{cars[getActiveCarIndex()]?.make || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Model:</span>
                  <span>{cars[getActiveCarIndex()]?.model || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Car Type:</span>
                  <span>{cars[getActiveCarIndex()]?.carType || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Mileage:</span>
                  <span>{cars[getActiveCarIndex()]?.mileage || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Engine:</span>
                  <span>{cars[getActiveCarIndex()]?.engine || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Fuel Type:</span>
                  <span>{cars[getActiveCarIndex()]?.fuelType || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">For Sale By:</span>
                  <span>{cars[getActiveCarIndex()]?.forSaleBy || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Condition:</span>
                  <span>{cars[getActiveCarIndex()]?.condition || 'No Information'}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">Condition Description:</span>
                  <span className="ml-2">{cars[getActiveCarIndex()]?.conditionDescription || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Price:</span>
                  <span>{cars[getActiveCarIndex()]?.price || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Location:</span>
                  <span>
                    {cars[getActiveCarIndex()]?.itemLocation?.city ? `${cars[getActiveCarIndex()].itemLocation.city}, ` : ''}
                    {cars[getActiveCarIndex()]?.itemLocation?.country || 'No Information'}
                  </span>
                </div>
              </div>
            </div>
          ) : selectedCarIndex === null ? (
            // Selection Phase
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-2xl font-bold mb-4">Select a car to guess</h2>
              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
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
            // Car Details Phase (fallback)
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
              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-4 text-lg">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Year:</span>
                  <span>{cars[selectedCarIndex]?.year || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Make:</span>
                  <span>{cars[selectedCarIndex]?.make || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Model:</span>
                  <span>{cars[selectedCarIndex]?.model || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Car Type:</span>
                  <span>{cars[selectedCarIndex]?.carType || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Mileage:</span>
                  <span>{cars[selectedCarIndex]?.mileage || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Engine:</span>
                  <span>{cars[selectedCarIndex]?.engine || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Fuel Type:</span>
                  <span>{cars[selectedCarIndex]?.fuelType || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">For Sale By:</span>
                  <span>{cars[selectedCarIndex]?.forSaleBy || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Condition:</span>
                  <span>{cars[selectedCarIndex]?.condition || 'No Information'}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">Condition Description:</span>
                  <span className="ml-2">{cars[selectedCarIndex]?.conditionDescription || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Price:</span>
                  <span>{cars[selectedCarIndex]?.price || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Location:</span>
                  <span>
                    {cars[selectedCarIndex]?.itemLocation?.city ? `${cars[selectedCarIndex].itemLocation.city}, ` : ''}
                    {cars[selectedCarIndex]?.itemLocation?.country || 'No Information'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameContent;