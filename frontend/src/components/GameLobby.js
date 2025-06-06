import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socketService from '../services/socketService';

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
  const chatContainerRef = useRef(null);

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
    });

    // Listen for player left event
    socketService.socket?.on('rooms:playerLeft', ({ playerName, players: updatedPlayers }) => {
      console.log('Player left:', playerName, 'Updated players:', updatedPlayers);
      const sortedPlayers = [...updatedPlayers].sort((a, b) => b.points - a.points);
      setPlayers(sortedPlayers);
      checkAllPlayersReady(sortedPlayers);
    });

    // Listen for player joined event
    socketService.socket?.on('rooms:playerJoined', ({ playerName, players: updatedPlayers }) => {
      console.log('Player joined:', playerName, 'Updated players:', updatedPlayers);
      const sortedPlayers = [...updatedPlayers].sort((a, b) => b.points - a.points);
      setPlayers(sortedPlayers);
      checkAllPlayersReady(sortedPlayers);
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
      socketService.socket?.off('rooms:playerJoined');
      socketService.socket?.off('chat:newMessage');
      socketService.socket?.off('room:settings');
      socketService.socket?.off('room:settingsUpdated');
      socketService.socket?.off('hostStatus');
    };
  }, []);

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = chatContainerRef.current;
      const isScrolledNearBottom = scrollHeight - clientHeight - scrollTop < 100;
      
      if (isScrolledNearBottom) {
        chatContainerRef.current.scrollTop = scrollHeight;
      }
    }
  }, [messages]);

  const checkAllPlayersReady = (playerList) => {
    setAllPlayersReady(playerList.every(player => player.isReady));
  };

  const handleReadyToggle = () => {
    setIsReady(!isReady);
    socketService.socket?.emit('playerReady', !isReady);
  };

  const handleStartGame = () => {
    socketService.socket?.emit('startGame');
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
      // Force scroll to bottom when user sends a message
      if (chatContainerRef.current) {
        setTimeout(() => {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }, 100);
      }
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
      {/* Players List - Left Side */}
      <div className="w-1/4 bg-gray-800 p-4 overflow-y-auto">
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
                {player.isReady && (
                  <span className="text-green-400">Ready</span>
                )}
              </div>
              <div className="mt-2 text-gray-300">
                Points: {player.points || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Section */}
      <div className="flex-1 flex flex-col">
        {/* Game Settings */}
        <div className="bg-gray-100 p-4">
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

        {/* Game Controls */}
        <div className="mt-auto p-4 flex justify-center items-center space-x-4">
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
            {isReady ? "I'm Ready!" : "Not Ready"}
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

      {/* Chat - Right Side */}
      <div className="w-1/4 bg-gray-100 flex flex-col">
        <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`p-2 rounded shadow ${
                  msg.type === 'system' 
                    ? msg.text.includes('joined')
                      ? 'bg-green-50 text-green-600 italic'
                      : msg.text.includes('left') || msg.text.includes('disconnected')
                        ? 'bg-red-50 text-red-600 italic'
                        : 'bg-gray-100 text-gray-600 italic'
                    : 'bg-white'
                }`}
              >
                {msg.type === 'system' ? (
                  <div>{msg.text}</div>
                ) : (
                  <>
                    <span className="font-bold">{msg.player}: </span>
                    <span>{msg.text}</span>
                  </>
                )}
                <div className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
        <form onSubmit={handleSendMessage} className="p-4 bg-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 rounded border"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GameLobby; 