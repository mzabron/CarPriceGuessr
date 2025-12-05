import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';
import PlayerList from './PlayerList';
import ChatBox from './ChatBox';
import HandDrawnNumberInput from './HandDrawnNumberInput';
import { useSfx } from '../services/soundService';

const GameLobby = () => {
  const navigate = useNavigate();
  const { play } = useSfx();
  const roomId = socketService.getCurrentRoomId();
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [gameSettings, setGameSettings] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(null);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  useEffect(() => {
    const currentUser = socketService.getCurrentUser();
    if (currentUser?.isHost) {
      setIsHost(true);
    }

    // Request current room state when component mounts
    if (roomId != null) {
      socketService.socket?.emit('room:requestState', { roomId: parseInt(roomId) });
    }

    socketService.socket?.on('playerList', (updatedPlayers) => {
      const sortedPlayers = [...updatedPlayers].sort((a, b) => b.points - a.points);
      setPlayers(sortedPlayers);
      checkAllPlayersReady(sortedPlayers);
      const currentPlayer = updatedPlayers.find(p => p.id === socketService.socket?.id);
      if (currentPlayer) {
        setIsReady(currentPlayer.isReady);
        setIsHost(currentPlayer.isHost);
      }
    });

    socketService.socket?.on('rooms:playerLeft', ({ playerName, players: updatedPlayers }) => {
      const sortedPlayers = [...updatedPlayers].sort((a, b) => b.points - a.points);
      setPlayers(sortedPlayers);
      checkAllPlayersReady(sortedPlayers);
    });

    socketService.socket?.on('game:startRound', ({ roomId }) => {
      // Force scroll to bottom when the game starts
      setScrollTrigger(t => t + 1);
      navigate(`/game`);
    });

    socketService.socket?.on('chat:newMessage', (message) => {
      setMessages(prev => [...prev, message]);
      if (message?.type === 'round') {
        setScrollTrigger(t => t + 1);
      }
    });

    socketService.socket?.on('chat:history', (chatHistory) => {
      setMessages(chatHistory);
      // Force scroll after history loads
      setScrollTrigger(t => t + 1);
    });

    // Listen for chat clear event
    socketService.socket?.on('chat:clear', () => {
      setMessages([]);
      setScrollTrigger(t => t + 1);
    });

    socketService.socket?.on('room:settings', (settings) => {
      setGameSettings(settings);
      setTempSettings(settings);
    });

    socketService.socket?.on('room:settingsUpdated', (settings) => {
      setGameSettings(settings);
      setTempSettings(settings);
    });

    socketService.socket?.on('hostStatus', (status) => {
      setIsHost(status);
    });

    return () => {
      socketService.socket?.off('playerList');
      socketService.socket?.off('rooms:playerLeft');
      socketService.socket?.off('game:startRound');
      socketService.socket?.off('chat:newMessage');
      socketService.socket?.off('chat:history');
      socketService.socket?.off('chat:clear');
      socketService.socket?.off('room:settings');
      socketService.socket?.off('room:settingsUpdated');
      socketService.socket?.off('hostStatus');
    };
  }, [navigate]);

  const checkAllPlayersReady = (playerList) => {
    setAllPlayersReady(playerList.every(player => player.isReady));
  };

  const handleReadyToggle = () => {
    play('toggle');
    setIsReady(!isReady);
    socketService.socket?.emit('playerReady', !isReady);
  };

  const handleStartGame = () => {
    play('toggle');
    if (isHost && allPlayersReady) {
      socketService.startGame();
    }
  };

  const handleCopyRoomCode = async () => {
    play('toggle');
    if (!gameSettings?.roomCode) return;
    try {
      await navigator.clipboard.writeText(gameSettings.roomCode);
      setCopiedNotice(true);
      // Auto-hide after a short delay
      setTimeout(() => setCopiedNotice(false), 2500);
    } catch (err) {
      // Optional: fallback to prompt if clipboard fails
      try {
        // eslint-disable-next-line no-alert
        window.prompt('Copy the room code:', gameSettings.roomCode);
        setCopiedNotice(true);
        setTimeout(() => setCopiedNotice(false), 2500);
      } catch (_) { }
    }
  };

  const handleLeaveRoom = () => {
    play('toggle');
    socketService.socket?.emit('rooms:leave', {
      roomId: parseInt(roomId),
      playerName: socketService.getCurrentUser()?.name
    });
    navigate('/');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socketService.socket?.emit('chat:message', {
        roomId: parseInt(roomId),
        message: newMessage.trim(),
        playerName: socketService.getCurrentUser()?.name
      });
      setNewMessage('');
    }
  };

  const handleSettingsUpdate = () => {
    play('toggle');
    if (!isHost || !tempSettings) return;

    // Validate that all fields have valid numeric values
    if (tempSettings.rounds === '' || tempSettings.playersLimit === '' || tempSettings.powerUps === '' || tempSettings.answerTime === '' || tempSettings.correctGuessThreshold === '') {
      alert('All fields must be filled out with valid values');
      return;
    }

    // Validate ranges
    if (tempSettings.rounds < 1 || tempSettings.rounds > 10) {
      alert('Rounds must be between 1 and 10');
      return;
    }

    if (tempSettings.playersLimit < 2 || tempSettings.playersLimit > 10) {
      alert('Max players must be between 2 and 10');
      return;
    }

    if (tempSettings.powerUps < 0 || tempSettings.powerUps > 100) {
      alert('Steals must be between 0 and 100');
      return;
    }

    socketService.socket?.emit('room:updateSettings', {
      roomId: parseInt(roomId),
      settings: tempSettings
    });
    setIsEditingSettings(false);
  };

  const handleSettingsChange = (changes) => {
    setTempSettings(prev => {
      const updated = {
        ...prev,
        ...changes
      };


      return updated;
    });
  };

  const handleNumericInputChange = (field, value) => {
    // Allow empty string for easier editing
    if (value === '') {
      setTempSettings(prev => ({ ...prev, [field]: '' }));
      return;
    }

    const numVal = parseInt(value);
    if (isNaN(numVal)) return;

    // Apply field-specific validation
    let validatedValue = numVal;
    switch (field) {
      case 'rounds':
        validatedValue = Math.min(Math.max(numVal, 1), 10);
        break;
      case 'playersLimit':
        validatedValue = Math.min(Math.max(numVal, 2), 10);
        break;
      case 'powerUps':
        validatedValue = Math.min(Math.max(numVal, 0), 100);
        break;
      default:
        break;
    }

    handleSettingsChange({ [field]: validatedValue });
  };

  const renderGameSettings = () => {
    if (!gameSettings) return null;

    if (isHost && isEditingSettings) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Rounds</label>
              <HandDrawnNumberInput
                value={tempSettings.rounds}
                onChange={(e) => handleNumericInputChange('rounds', e.target.value)}
                min="1"
                max="10"
                className="w-full hand-drawn-input"
              />
            </div>
            <div>
              <label className="block mb-2">Max Players</label>
              <HandDrawnNumberInput
                value={tempSettings.playersLimit}
                onChange={(e) => handleNumericInputChange('playersLimit', e.target.value)}
                min="2"
                max="10"
                className="w-full hand-drawn-input"
              />
            </div>
            <div>
              <label className="block mb-2 flex items-center gap-3">
                <span>Steals</span>
                <span className="inline-flex items-center justify-center cursor-help relative group select-none ml-1" aria-label="About steals">
                  <span className="material-symbols-outlined text-[24px] leading-none">help</span>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -mt-2 mb-2 w-64 bg-[#FAEBD7] text-black border-2 border-black text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal">
                    Steals let you take over another player's turn. After using a steal, there's a 5-second cooldown before you can steal again. Each unused steal grants a bonus points at the end of the game.
                    <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-black border-x-8 border-x-transparent" />
                  </span>
                </span>
              </label>
              <HandDrawnNumberInput
                value={tempSettings.powerUps}
                onChange={(e) => handleNumericInputChange('powerUps', e.target.value)}
                min="0"
                max={100}
                className="w-full hand-drawn-input"
              />
            </div>
            <div>
              <label className="block mb-2">Answer Time</label>
              <select
                value={tempSettings.answerTime}
                onChange={(e) => handleSettingsChange({ answerTime: parseInt(e.target.value) })}
                className="w-full hand-drawn-input"
              >
                {[10, 20, 30, 40, 50, 60].map(duration => (
                  <option key={duration} value={duration}>{duration}s</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 flex items-center gap-3">
                <span>Guess Accuracy Threshold</span>
                <span className="inline-flex items-center justify-center cursor-help relative group select-none ml-1" aria-label="About price match difficulty">
                  <span className="material-symbols-outlined text-[24px] leading-none">help</span>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -mt-2 mb-2 w-64 bg-[#FAEBD7] text-black border-2 border-black text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal">
                    Controls how close a player's guess must be to the actual car price to count as a correct hit. Lower percentages make the game harder; higher percentages make it more forgiving.
                    <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-black border-x-8 border-x-transparent" />
                  </span>
                </span>
              </label>
              <select
                value={tempSettings.correctGuessThreshold}
                onChange={(e) => handleSettingsChange({ correctGuessThreshold: parseInt(e.target.value) })}
                className="w-full hand-drawn-input"
              >
                {[5, 10, 15].map(percent => (
                  <option key={percent} value={percent}>{percent}%</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => { play('toggle'); setIsEditingSettings(false); setTempSettings(gameSettings); }}
              className="hand-drawn-btn px-4 py-2 opacity-70 hover:opacity-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSettingsUpdate}
              className="hand-drawn-btn px-4 py-2"
            >
              Save Changes
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 text-lg font-semibold">Room Name: {gameSettings.roomName}</div>
          <div>Rounds: {gameSettings.rounds}</div>
          <div>Max Players: {gameSettings.playersLimit}</div>
          <div className="flex items-center gap-3">
            <span>Steals: {gameSettings.powerUps}</span>
            <span className="inline-flex items-center justify-center cursor-help relative group select-none ml-1" aria-label="About steals">
              <span className="material-symbols-outlined text-[24px] leading-none">help</span>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -mt-2 mb-2 w-64 bg-[#FAEBD7] text-black border-2 border-black text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal">
                Steals let you take over another player's turn. After using a steal, there's a 5-second cooldown before you can steal again. Each unused steal grants a bonus points at the end of the game.
                <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-black border-x-8 border-x-transparent" />
              </span>
            </span>
          </div>
          <div>Answer Time: {gameSettings.answerTime}s</div>
          <div className="flex items-center gap-3">
            <span>Guess Accuracy Threshold: {gameSettings.correctGuessThreshold}%</span>
            <span className="inline-flex items-center justify-center cursor-help relative group select-none ml-1" aria-label="About price match difficulty">
              <span className="material-symbols-outlined text-[24px] leading-none">help</span>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -mt-2 mb-2 w-64 bg-[#FAEBD7] text-black border-2 border-black text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal">
                Controls how close a player's guess must be to the actual car price to count as a correct hit. Lower percentages make the game harder; higher percentages make it more forgiving.
                <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-black border-x-8 border-x-transparent" />
              </span>
            </span>
          </div>
          <div>Room Type: {gameSettings.visibility}</div>
        </div>
        {isHost && (
          <div className="flex justify-end">
            <button
              onClick={() => { play('toggle'); setIsEditingSettings(true); }}
              className="hand-drawn-btn px-4 py-2"
            >
              Edit Settings
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <PlayerList players={players} showReadyStatus={true} />
      <div className="flex-1 bg-transparent flex flex-col items-center justify-center overflow-auto">
        <div className="w-full max-w-4xl flex flex-col items-center justify-center">
          <div className="hand-drawn-panel p-4 sm:p-8 w-full">
            <div className="mb-4 text-lg font-semibold border-2 border-black p-2 rounded-lg flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <span>
                  Room Code: {' '}
                  <span className="font-mono tracking-wider select-all">
                    {showRoomCode ? (
                      gameSettings?.roomCode || '—'
                    ) : (
                      // Masked display when hidden
                      (gameSettings?.roomCode ? '••••••' : '—')
                    )}
                  </span>
                </span>
                <button
                  onClick={() => { play('toggle'); setShowRoomCode(v => !v); }}
                  title={showRoomCode ? 'Hide room code' : 'Show room code'}
                  className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-transparent focus:outline-none"
                  aria-label={showRoomCode ? 'Hide room code' : 'Show room code'}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {showRoomCode ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyRoomCode}
                  disabled={!gameSettings?.roomCode}
                  className={`hand-drawn-btn px-2 py-1 text-sm ${!gameSettings?.roomCode ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Copy
                </button>
              </div>
              {copiedNotice && (
                <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-4 sm:-top-5 z-20">
                  <div className="flex items-center gap-2 bg-[#FAEBD7] text-black text-sm px-3 py-1.5 rounded-full shadow-lg border-2 border-black fade-out-once">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-black">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-7.25 9.25a.75.75 0 01-1.128.06L3.17 9.079A.75.75 0 014.33 8.02l4.036 3.954 6.695-8.54a.75.75 0 011.052-.143z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium font-['Gloria_Hallelujah']">Room code copied!</span>
                  </div>
                </div>
              )}
              {/* SR-only live region for screen readers */}
              <span className="sr-only" role="status" aria-live="polite">
                {copiedNotice ? 'Room code copied to clipboard' : ''}
              </span>
            </div>
            <h3 className="text-xl font-bold mb-4">Game Settings</h3>
            {renderGameSettings()}
          </div>
          <div className="p-4 flex flex-wrap justify-center items-center space-x-0 sm:space-x-4 mt-8 gap-4">
            <button
              onClick={handleLeaveRoom}
              className="hand-drawn-btn px-6 py-3 font-bold"
            >
              Leave Room
            </button>
            <button
              onClick={handleReadyToggle}
              className={`hand-drawn-btn px-6 py-3 font-bold inline-flex items-center justify-center gap-2 ${isReady
                ? 'border-green-600 text-green-600'
                : ''
                }`}
              style={isReady ? { borderColor: '#16a34a', color: '#16a34a' } : {}}
            >
              {isReady && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z" />
                </svg>
              )}
              <span>{isReady ? "Ready!" : "Click to be Ready"}</span>
            </button>
            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!allPlayersReady}
                className={`hand-drawn-btn px-6 py-3 font-bold ${!allPlayersReady
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                  }`}
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
      <ChatBox
        messages={messages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
        forceScrollTrigger={scrollTrigger}
      />
    </div>
  );
};

export default GameLobby;