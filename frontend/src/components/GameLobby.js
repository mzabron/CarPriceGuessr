import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socketService from '../services/socketService';
import PlayerList from './PlayerList';
import ChatBox from './ChatBox';

const GameLobby = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [gameSettings, setGameSettings] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(null);

  useEffect(() => {
    const currentUser = socketService.getCurrentUser();
    if (currentUser?.isHost) {
      setIsHost(true);
    }

    // Request current room state when component mounts
    socketService.socket?.emit('room:requestState', { roomId: parseInt(roomId) });

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
      navigate(`/game/${roomId}`);
    });

    socketService.socket?.on('chat:newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socketService.socket?.on('chat:history', (chatHistory) => {
      setMessages(chatHistory);
    });

    // Listen for chat clear event
    socketService.socket?.on('chat:clear', () => {
      setMessages([]);
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
    setIsReady(!isReady);
    socketService.socket?.emit('playerReady', !isReady);
  };

  const handleStartGame = () => {
    if (isHost && allPlayersReady) {
      socketService.startGame();
    }
  };

  const handleLeaveRoom = () => {
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
    if (!isHost || !tempSettings) return;
    
    // Validate that all fields have valid numeric values
    if (tempSettings.rounds === '' || tempSettings.playersLimit === '' || tempSettings.powerUps === '' || tempSettings.answerTime === '') {
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
    
    if (tempSettings.powerUps < 0 || tempSettings.powerUps > tempSettings.rounds) {
      alert('Power-ups must be between 0 and the number of rounds');
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
      
      // If rounds are being changed and powerUps exceed the new rounds count, adjust powerUps
      if (changes.rounds !== undefined && updated.powerUps > changes.rounds) {
        updated.powerUps = changes.rounds;
      }
      
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
        const maxPowerUps = typeof tempSettings.rounds === 'number' ? tempSettings.rounds : 10;
        validatedValue = Math.min(Math.max(numVal, 0), maxPowerUps);
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
              <input
                type="number"
                value={tempSettings.rounds}
                onChange={(e) => handleNumericInputChange('rounds', e.target.value)}
                min="1"
                max="10"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Max Players</label>
              <input
                type="number"
                value={tempSettings.playersLimit}
                onChange={(e) => handleNumericInputChange('playersLimit', e.target.value)}
                min="2"
                max="10"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Power-ups</label>
              <input
                type="number"
                value={tempSettings.powerUps}
                onChange={(e) => handleNumericInputChange('powerUps', e.target.value)}
                min="0"
                max={tempSettings.rounds}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Answer Time</label>
              <select
                value={tempSettings.answerTime}
                onChange={(e) => handleSettingsChange({ answerTime: parseInt(e.target.value) })}
                className="w-full p-2 border rounded"
              >
                {[10, 20, 30, 40, 50, 60].map(duration => (
                  <option key={duration} value={duration}>{duration}s</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setIsEditingSettings(false);
                setTempSettings(gameSettings);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSettingsUpdate}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
          <div>Power-ups: {gameSettings.powerUps}</div>
          <div>Answer Time: {gameSettings.answerTime}s</div>
          <div>Room Type: {gameSettings.visibility}</div>
        </div>
        {isHost && (
          <div className="flex justify-end">
            <button
              onClick={() => setIsEditingSettings(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
      <div className="flex-1 bg-white flex flex-col items-center justify-center overflow-auto">
        <div className="w-full max-w-4xl flex flex-col items-center justify-center">
          <div className="bg-gray-100 p-4 sm:p-8 w-full rounded-xl shadow-lg">
            <div className="mb-4 text-lg font-semibold bg-gray-200 p-2 rounded flex items-center justify-between">
              <span>Room Code: <span className="font-mono">{gameSettings?.roomCode}</span></span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(gameSettings?.roomCode);
                }}
                className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Copy
              </button>
            </div>
            <h3 className="text-xl font-bold mb-4">Game Settings</h3>
            {renderGameSettings()}
          </div>
          <div className="p-4 flex flex-wrap justify-center items-center space-x-0 sm:space-x-4 mt-8 gap-4">
            <button
              onClick={handleLeaveRoom}
              className="px-6 py-3 rounded-lg font-bold bg-red-500 text-white hover:bg-red-600"
            >
              Leave Room
            </button>
            <button
              onClick={handleReadyToggle}
              className={`px-6 py-3 rounded-lg font-bold ${
                isReady
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-700'
              }`}
            >
              {isReady ? "Ready!" : "Click to be Ready"}
            </button>
            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!allPlayersReady}
                className={`px-6 py-3 rounded-lg font-bold ${
                  allPlayersReady
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
      />
    </div>
  );
};

export default GameLobby;