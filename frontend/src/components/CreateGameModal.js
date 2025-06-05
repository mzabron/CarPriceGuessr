import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import socketService from '../services/socketService';

const CreateGameModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    roomName: '',
    visibility: 'public',
    maxPlayers: 4,
    powerUps: 2,
    rounds: 5,
    roundDuration: 30
  });
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const checkDuplicateRoomName = async (roomName) => {
    try {
      const existingRooms = await apiService.getRooms();
      return existingRooms.some(room => room.name === roomName);
    } catch (error) {
      console.error('Error checking room names:', error);
      throw new Error('Failed to validate room name');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.roomName.trim()) {
      setError('Room name is required');
      return;
    }

    // Validate powerUps against rounds
    if (formData.powerUps > formData.rounds) {
      setError('Number of power-ups cannot exceed number of rounds');
      return;
    }

    setIsCreating(true);
    try {
      const isDuplicate = await checkDuplicateRoomName(formData.roomName);
      if (isDuplicate) {
        setError('A room with this name already exists');
        setIsCreating(false);
        return;
      }

      const response = await apiService.createRoom(formData);
      console.log('Room created:', response);
      
      // Connect to socket
      socketService.connect();
      
      // Set current user as host
      const hostUser = {
        name: `Host_${Math.floor(Math.random() * 10000)}`,
        isHost: true
      };
      socketService.setCurrentUser(hostUser);
      
      // Join the room
      await socketService.joinRoom(response.room.id);
      
      onClose();
      // Navigate to the lobby with the new room ID
      navigate(`/lobby/${response.room.id}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      setError(error.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'visibility' ? value : 
              name === 'roomName' ? value :
              Number(value)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2">Room Name</label>
            <input
              type="text"
              name="roomName"
              value={formData.roomName}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded"
              placeholder="Enter room name"
              minLength="3"
              maxLength="30"
            />
          </div>

          <div>
            <label className="block mb-2">Visibility</label>
            <select
              name="visibility"
              value={formData.visibility}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="block mb-2">Maximum Players</label>
            <input
              type="number"
              name="maxPlayers"
              min="2"
              max="10"
              value={formData.maxPlayers}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block mb-2">Number of Rounds</label>
            <input
              type="number"
              name="rounds"
              min="1"
              max="10"
              value={formData.rounds}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block mb-2">Power-ups</label>
            <input
              type="number"
              name="powerUps"
              min="0"
              max={formData.rounds}
              value={formData.powerUps}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            <small className="text-gray-500">Cannot exceed number of rounds</small>
          </div>

          <div>
            <label className="block mb-2">Round Duration (seconds)</label>
            <select
              name="roundDuration"
              value={formData.roundDuration}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              {[10, 20, 30, 40, 50, 60].map(duration => (
                <option key={duration} value={duration}>{duration}s</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
              disabled={!formData.roomName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGameModal; 