import React, { useEffect, useState } from 'react';
import socketService from '../services/socketService';

const RoomList = ({ onClose }) => {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('rooms:list', (roomsList) => {
      setRooms(roomsList.filter(room => room.visibility === 'public'));
    });

    socketService.getRoomsList();

    return () => {
      socket.off('rooms:list');
    };
  }, []);

  const handleJoinRoom = (roomId) => {
    socketService.joinRoom(roomId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Available Rooms</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

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
                  <h3 className="font-semibold">Room #{room.id}</h3>
                  <p className="text-sm text-gray-600">
                    Players: {room.players.length}/{room.maxPlayers}
                  </p>
                  <p className="text-sm text-gray-600">
                    Rounds: {room.rounds} | Duration: {room.roundDuration}s
                  </p>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={room.players.length >= room.maxPlayers}
                  className={`px-4 py-2 rounded ${
                    room.players.length >= room.maxPlayers
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {room.players.length >= room.maxPlayers ? 'Full' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomList; 