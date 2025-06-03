import React, { useEffect, useState } from 'react';
import socketService from '../services/socketService';
import apiService from '../services/apiService';

const RoomList = ({ onClose }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const socket = socketService.connect();

    // Listen for room list updates
    const handleRoomsList = (roomsList) => {
      console.log('Received rooms list:', roomsList);
      setRooms(roomsList);
      setLoading(false);
    };

    socket.on('rooms:list', handleRoomsList);

    // Initial data loading
    const loadInitialData = async () => {
      try {
        const initialRooms = await apiService.getRooms();
        console.log('Initial rooms from API:', initialRooms);
        setRooms(initialRooms);
      } catch (error) {
        console.error('Error loading initial rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
    socketService.getRoomsList();

    return () => {
      socket.off('rooms:list', handleRoomsList);
    };
  }, []);

  const handleJoinRoom = (roomId) => {
    socketService.joinRoom(roomId);
    onClose();
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    setError('');

    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    // For now, just show an info message since backend isn't ready
    alert('Join by code feature coming soon!');
    setJoinCode('');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6">
          <p>Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Join Game</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Join by Code Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Join Private Room</h3>
          <form onSubmit={handleJoinByCode} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="flex-1 p-2 border rounded uppercase"
              maxLength={6}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Join
            </button>
          </form>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Public Rooms Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Available Rooms</h3>
          {rooms.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No rooms available</p>
          ) : (
            <div className="space-y-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-semibold">{room.name}</h3>
                    <p className="text-sm text-gray-600">
                      Players: {room.players.length}/{room.playersLimit}
                    </p>
                    <p className="text-sm text-gray-600">
                      Rounds: {room.rounds} | Duration: {room.answerTime}s
                    </p>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.players.length >= room.playersLimit}
                    className={`px-4 py-2 rounded ${
                      room.players.length >= room.playersLimit
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {room.players.length >= room.playersLimit ? 'Full' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomList; 