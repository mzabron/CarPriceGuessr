import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import apiService from '../services/apiService';
import { useNavigate } from 'react-router-dom';

const RoomList = ({ onClose, user }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const fetchedRooms = await apiService.getRooms();
      console.log('Fetched rooms:', fetchedRooms);
      // Store all rooms for code search
      setAllRooms(fetchedRooms);
      // Filter out private rooms for display
      const publicRooms = fetchedRooms.filter(room => room.settings.visibility === 'public');
      setRooms(publicRooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setError('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      // First connect to socket
      socketService.connect();
      
      if (user) {
        socketService.setCurrentUser(user);
      } else {
        const guestUser = {
          name: `Guest_${Math.floor(Math.random() * 10000)}`
        };
        socketService.setCurrentUser(guestUser);
      }
      await socketService.joinRoom(roomId);
      onClose();
      navigate(`/lobby/${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room');
      socketService.disconnect();
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!joinCode.trim()) {
      setError('Room code is required');
      return;
    }

    try {
      // Find room with matching code from all rooms (including private)
      const room = allRooms.find(r => r.code === joinCode.trim().toUpperCase());
      
      if (!room) {
        setError('Room not found');
        return;
      }

      if (room.players.length >= room.settings.playersLimit) {
        setError('Room is full');
        return;
      }

      // First connect to socket
      socketService.connect();
      
      if (user) {
        socketService.setCurrentUser(user);
      } else {
        const guestUser = {
          name: `Guest_${Math.floor(Math.random() * 10000)}`
        };
        socketService.setCurrentUser(guestUser);
      }

      await socketService.joinRoom(room.id);
      onClose();
      navigate(`/lobby/${room.id}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room');
      socketService.disconnect();
    }
  };

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

        {!user && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-700">
              You are not logged in but you can still join as a guest.
            </p>
          </div>
        )}

        {/* Join by Code Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Join room by code</h3>
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
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Available Rooms</h3>
            <button
              onClick={fetchRooms}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
            >
              <svg 
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {loading ? (
            <p className="text-gray-500">Loading rooms...</p>
          ) : rooms.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 border rounded-lg flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-semibold">{room.name}</h4>
                    <p className="text-sm text-gray-500">
                      Players: {room.players.length}/{room.settings.playersLimit}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    disabled={room.players.length >= room.settings.playersLimit}
                  >
                    {room.players.length >= room.settings.playersLimit ? 'Full' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No rooms available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomList; 