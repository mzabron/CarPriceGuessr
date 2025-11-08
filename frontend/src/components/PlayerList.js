import React from 'react';

// Pastel background palette (light, low saturation) mapped by player id.
// Using Tailwind's 200/300 shades which are already pastel-like.
const PASTEL_BG = [
  'bg-red-200','bg-blue-200','bg-green-200','bg-yellow-200',
  'bg-purple-200','bg-pink-200','bg-indigo-200','bg-teal-200',
  'bg-orange-200','bg-gray-300'
];
const PASTEL_BORDER = [
  'border-red-300','border-blue-300','border-green-300','border-yellow-300',
  'border-purple-300','border-pink-300','border-indigo-300','border-teal-300',
  'border-orange-300','border-gray-400'
];

function getPastelClassById(id, orderedIds) {
  const idx = orderedIds.indexOf(id);
  const safeIdx = idx >= 0 ? idx : 0;
  return {
    bg: PASTEL_BG[safeIdx % PASTEL_BG.length],
    border: PASTEL_BORDER[safeIdx % PASTEL_BORDER.length]
  };
}

const PlayerList = ({ players, showReadyStatus = false }) => {
  const orderedIds = players.map(p => p.id);
  return (
    <div className="h-full w-48 md:w-60 xl:w-64 bg-gray-800 flex flex-col p-2 overflow-hidden">
      <h2 className="text-xl font-bold text-white mb-2">Players</h2>
      <div className="space-y-2 flex-1 overflow-y-auto thin-scrollbar">
        {players.map((player, index) => (
          <div key={player.id} className="bg-gray-700 rounded-lg p-2 pr-4 sm:pr-5 text-white relative overflow-hidden">
            {/* Colored right-side bar */}
            <div
              className={`absolute top-0 right-0 h-full w-2 sm:w-3 ${getPastelClassById(player.id, orderedIds).bg} ${getPastelClassById(player.id, orderedIds).border} border-l rounded-r-lg`}
              aria-hidden="true"
            />
            <div className="flex items-center gap-1">
              <span className="text-white-600 mr-1 text-sm">#{index + 1}</span>
              {player.isHost && (
                <svg
                  className="text-yellow-600 flex-shrink-0"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-label="Host"
                  title="Host"
                >
                  <path d="M5 16l-2-9 5 4 4-6 4 6 5-4-2 9H5zm0 2h14v2H5v-2z"/>
                </svg>
              )}
              <span className="font-semibold text-sm truncate pr-2">{player.name}</span>
            </div>
            <div className="mt-1 text-white-700 text-sm">Points: {player.points || 0}</div>
            {typeof player.stealsRemaining === 'number' && (
              <div className="mt-1 text-white-700 text-sm">Steals: {player.stealsRemaining}</div>
            )}
            {/* Status indicators in bottom right corner */}
            <div className="absolute bottom-1 right-3 sm:right-4 flex flex-col items-end gap-0.5">
              {showReadyStatus && 'isReady' in player && (
                <span className={`${player.isReady ? 'text-green-600' : 'text-red-600'} text-base font-semibold tracking-tight`}> 
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