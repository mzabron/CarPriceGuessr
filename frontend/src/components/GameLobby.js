import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socketService from '../services/socketService';
import PlayerList from './PlayerList';
import ChatBox from './ChatBox';
import apiService from '../services/apiService';

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
    // Set initial host status from socket service
    const currentUser = socketService.getCurrentUser();
    if (currentUser?.isHost) {
      setIsHost(true);
    }

    // Listen for player updates
    socketService.socket?.on('playerList', (updatedPlayers) => {
      console.log('Received updated player list:', updatedPlayers);
      const sortedPlayers = [...updatedPlayers].sort((a, b) => b.points - a.points);
      setPlayers(sortedPlayers);
      checkAllPlayersReady(sortedPlayers);
      
      // Update local ready state based on current player's status
      const currentPlayer = updatedPlayers.find(p => p.id === socketService.socket?.id);
      if (currentPlayer) {
        setIsReady(currentPlayer.isReady);
      }
    });

    // Listen for player left event
    socketService.socket?.on('rooms:playerLeft', ({ playerName, players: updatedPlayers }) => {
      console.log('Player left:', playerName, 'Updated players:', updatedPlayers);
      const sortedPlayers = [...updatedPlayers].sort((a, b) => b.points - a.points);
      setPlayers(sortedPlayers);
      checkAllPlayersReady(sortedPlayers);
    });

    // Listen for game start
    socketService.socket?.on('game:start', ({ roomId }) => {
      navigate(`/game/${roomId}`);
    });

    // Listen for chat messages
    socketService.socket?.on('chat:newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for initial room settings
    socketService.socket?.on('room:settings', (settings) => {
      setGameSettings(settings);
      setTempSettings(settings);
    });

    // Listen for settings updates
    socketService.socket?.on('room:settingsUpdated', (settings) => {
      setGameSettings(settings);
      setTempSettings(settings);
    });

    // Listen for host status changes
    socketService.socket?.on('hostStatus', (status) => {
      setIsHost(status);
    });

    return () => {
      socketService.socket?.off('playerList');
      socketService.socket?.off('rooms:playerLeft');
      socketService.socket?.off('game:start');
      socketService.socket?.off('chat:newMessage');
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
    
    socketService.socket?.emit('room:updateSettings', {
      roomId: parseInt(roomId),
      settings: tempSettings
    });
    setIsEditingSettings(false);
  };

  const handleSettingsChange = (changes) => {
    setTempSettings(prev => ({
      ...prev,
      ...changes
    }));
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
                onChange={(e) => handleSettingsChange({ rounds: parseInt(e.target.value) })}
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
                onChange={(e) => handleSettingsChange({ playersLimit: parseInt(e.target.value) })}
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
                onChange={(e) => handleSettingsChange({ powerUps: parseInt(e.target.value) })}
                min="0"
                max={tempSettings.rounds}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Answer Time</label>
              <select
                value={tempSettings.roundDuration}
                onChange={(e) => handleSettingsChange({ roundDuration: parseInt(e.target.value) })}
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
          <div>Answer Time: {gameSettings.roundDuration}s</div>
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
    <div className="h-screen flex">
      <PlayerList players={players} showReadyStatus={true} />
      
      <div className="flex-1 bg-white flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl flex flex-col items-center justify-center">
          <div className="bg-gray-100 p-8 w-full rounded-xl shadow-lg">
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
          <div className="p-4 flex justify-center items-center space-x-4 mt-8">
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