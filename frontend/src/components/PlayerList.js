import React from 'react';

const PlayerList = ({ players, showReadyStatus = false }) => {
  return (
    <div className="w-1/6 bg-gray-800 p-4 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-4">Players</h2>
      <div className="space-y-4">
        {players.map((player, index) => (
          <div key={player.id} className="bg-gray-700 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">#{index + 1}</span>
                <span className="font-semibold">{player.name}</span>
                {player.isHost && <span className="ml-2 text-yellow-400">(Host)</span>}
              </div>
              {showReadyStatus && 'isReady' in player && (
                <span className={`${player.isReady ? 'text-green-400' : 'text-red-400'}`}>
                  {player.isReady ? 'Ready' : 'Not Ready'}
                </span>
              )}
            </div>
            <div className="mt-2 text-gray-300">
              Points: {player.points || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList; 