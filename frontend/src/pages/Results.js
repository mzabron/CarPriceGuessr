import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { gameData } = location.state || {};
  
  // Debug logging
  console.log('Results page - gameData:', gameData);
  if (gameData?.gameHistory) {
    console.log('Game history:', gameData.gameHistory);
    gameData.gameHistory.forEach((round, index) => {
      console.log(`Round ${index + 1} car:`, round.car);
      console.log(`Round ${index + 1} itemWebUrl:`, round.car?.itemWebUrl);
    });
  }
  
  if (!gameData) {
    navigate('/');
    return null;
  }

  const { players, roomId, roomCode, roomName, gameHistory } = gameData;
  
  // Sort players by points (descending)
  const sortedPlayers = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));
  
  const getPlacementSuffix = (index) => {
    if (index === 0) return '1st';
    if (index === 1) return '2nd';
    if (index === 2) return '3rd';
    return `${index + 1}th`;
  };
  
  const handleQuit = () => {
    // Leave the room before navigating to home
    socketService.socket?.emit('rooms:leave', {
      roomId: parseInt(roomId),
      playerName: socketService.getCurrentUser()?.name
    });
    navigate('/');
  };
  
  const handleBackToLobby = () => {
    // Emit a request to reset the room to lobby state and reset player ready status
    socketService.socket?.emit('game:resetToLobby', { roomId });
    navigate(`/lobby/${roomId}`);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8 overflow-y-auto thin-scrollbar max-h-full">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Game Results</h1>
            <p className="text-xl text-blue-200">Room: {roomName} ({roomCode})</p>
          </div>
          
          {/* Player Rankings */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Final Rankings</h2>
            <div className="space-y-4">
              {sortedPlayers.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    index === 0 
                      ? 'bg-yellow-50 border-yellow-400' 
                      : index === 1 
                        ? 'bg-gray-50 border-gray-400'
                        : index === 2
                          ? 'bg-orange-50 border-orange-400'
                          : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold ${
                      index === 0 
                        ? 'text-yellow-600' 
                        : index === 1 
                          ? 'text-gray-600'
                          : index === 2
                            ? 'text-orange-600'
                            : 'text-blue-600'
                    }`}>
                      {getPlacementSuffix(index)}
                    </div>
                    <div>
                      <div className="font-semibold text-lg text-gray-800">
                        {player.name}
                        {player.isHost && <span className="ml-2 text-sm text-yellow-600">(Host)</span>}
                      </div>
                      {player.stealsRemaining !== undefined && (
                        <div className="text-sm text-gray-600">
                          Steals remaining: {player.stealsRemaining}
                          {player.stealsRemaining > 0 && (
                            <span className="ml-2 text-green-600 font-semibold">
                              (+{player.stealsRemaining * 5} bonus points)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {player.points || 0} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Game Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Game Summary</h2>
            <p className="text-center text-gray-600 mb-6 text-sm">Click on any car to view the original eBay listing</p>
            {gameHistory && gameHistory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gameHistory.map((round, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                    <div className="bg-gray-50 text-center py-2">
                      <h3 className="font-bold text-lg text-gray-800">Round {round.round}</h3>
                    </div>
                    
                    <div className="p-4">
                      {round.car.thumbnailImages && round.car.thumbnailImages[0] && (
                        <div className="mb-3">
                          <img 
                            src={round.car.thumbnailImages[0].imageUrl} 
                            alt={round.car.title}
                            className="w-full h-32 object-cover rounded cursor-pointer"
                            onClick={() => round.car.itemWebUrl && window.open(round.car.itemWebUrl, '_blank')}
                            title="Click to view on eBay"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2 text-sm">
                        <div 
                          className="font-semibold text-gray-800 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => round.car.itemWebUrl && window.open(round.car.itemWebUrl, '_blank')}
                          title="Click to view on eBay"
                        >
                          {round.car.title}
                        </div>
                        <div className="text-gray-600">
                          {round.car.year} {round.car.make} {round.car.model}
                        </div>
                        <div className="font-bold text-green-600">
                          Price: {round.car.price}
                        </div>
                      </div>
                      
                      {round.car.itemWebUrl && (
                        <div className="mt-3">
                          <a 
                            href={round.car.itemWebUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors text-sm font-semibold"
                          >
                            View on eBay
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-600">
                <p>No game history available</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleBackToLobby}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg"
            >
              Back to Lobby
            </button>
            <button
              onClick={handleQuit}
              className="px-8 py-3 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors shadow-lg"
            >
              Quit to Home
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Results;
