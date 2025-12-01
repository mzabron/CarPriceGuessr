import React from 'react';

// Unified color palette matching GameContent PLAYER_BG_COLOR
const COLOR_BG = {
  red: 'bg-red-600',
  blue: 'bg-blue-500',
  green: 'bg-lime-400',
  yellow: 'bg-yellow-300',
  purple: 'bg-violet-500',
  pink: 'bg-fuchsia-400',
  cyan: 'bg-cyan-400',
  amber: 'bg-amber-800',
  orange: 'bg-orange-500',
  gray: 'bg-stone-500',
};
const COLOR_BORDER = {
  red: 'border-red-700',
  blue: 'border-blue-700',
  green: 'border-lime-600',
  yellow: 'border-yellow-500',
  purple: 'border-violet-700',
  pink: 'border-fuchsia-600',
  cyan: 'border-cyan-700',
  amber: 'border-amber-900',
  orange: 'border-orange-700',
  gray: 'border-stone-600',
};

function getClasses(player) {
  const key = player?.assignedColorKey || player?.assignedColor || 'gray';
  return {
    bg: COLOR_BG[key] || COLOR_BG.gray,
    border: COLOR_BORDER[key] || COLOR_BORDER.gray,
  };
}

const PlayerList = ({ players, showReadyStatus = false }) => {
  return (
    <div className="h-full w-48 md:w-60 xl:w-64 bg-transparent border-r-2 border-black flex flex-col p-2 overflow-hidden">
      <h2 className="text-xl font-bold mb-2">Players</h2>
      <div className="space-y-2 flex-1 overflow-y-auto thin-scrollbar">
        {players.map((player, index) => {
          const palette = getClasses(player);
          return (
            <div key={player.id} className="bg-transparent border-2 border-black rounded-lg p-2 pr-5 sm:pr-6 relative overflow-hidden">
              <div
                className={`absolute top-0 right-0 h-full w-2 sm:w-3 ${palette.bg} border-l-2 border-black rounded-r-sm`}
                aria-hidden="true"
              />
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="mr-1 text-sm font-bold">#{index + 1}</span>
                  {player.isHost && (
                    <svg
                      className="text-black flex-shrink-0"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-label="Host"
                      title="Host"
                    >
                      <path d="M5 16l-2-9 5 4 4-6 4 6 5-4-2 9H5zm0 2h14v2H5v-2z" />
                    </svg>
                  )}
                  <span className="font-semibold text-sm truncate pr-2" title={player.name}>{player.name}</span>
                </div>
              </div>
              <div className="mt-1 text-sm font-bold">Points: {player.points || 0}</div>
              {typeof player.stealsRemaining === 'number' && (
                <div className="mt-1 text-sm">Steals: {player.stealsRemaining}</div>
              )}
              <div className="absolute bottom-1 right-4 sm:right-5 flex flex-col items-end gap-0.5">
                {showReadyStatus && 'isReady' in player && (
                  <span className={`${player.isReady ? 'text-black' : 'text-black opacity-50'} text-base font-bold tracking-tight`}>
                    {player.isReady ? 'Ready' : 'Not Ready'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerList;