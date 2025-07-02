import React from 'react';

const PlayerList = ({ players, showReadyStatus = false }) => {
  return (
    <div className="h-full w-48 md:w-60 xl:w-64 bg-gray-800 flex flex-col p-2 overflow-hidden">
      <h2 className="text-xl font-bold text-white mb-2">Players</h2>
      <div className="space-y-2 flex-1 overflow-y-auto thin-scrollbar">
        {players.map((player, index) => (
          <div key={player.id} className="bg-gray-700 rounded-lg p-2 text-white relative">
            <div className="flex items-center">
              <span className="text-gray-400 mr-1 text-sm">#{index + 1}</span>
              <span className="font-semibold text-sm truncate pr-2">{player.name}</span>
            </div>
            <div className="mt-1 text-gray-300 text-sm">
              Points: {player.points || 0}
            </div>
            {typeof player.stealsRemaining === 'number' && (
              <div className="mt-1 text-gray-300 text-sm">
                Steals: {player.stealsRemaining}
              </div>
            )}
            {/* Status indicators in bottom right corner */}
            <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0.5">
              {player.isHost && (
                <span className="text-yellow-400 text-xs font-semibold">Host</span>
              )}
              {showReadyStatus && 'isReady' in player && (
                <span className={`${player.isReady ? 'text-green-400' : 'text-red-400'} text-xs font-medium`}>
                  {player.isReady ? 'Ready' : 'Not Ready'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList;