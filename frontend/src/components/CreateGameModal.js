import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import socketService from '../services/socketService';

const CreateGameModal = ({ onClose, user }) => {
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

    // Validate that all numeric fields have valid values
    if (formData.maxPlayers === '' || formData.rounds === '' || formData.powerUps === '' || formData.roundDuration === '') {
      setError('All fields must be filled out');
      return;
    }

    // Validate powerUps range (decoupled from rounds)
    if (formData.powerUps < 0 || formData.powerUps > 100) {
      setError('Steals must be between 0 and 100');
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
      
      // ... existing code ...
      // Set current user as host
      const hostUser = {
        name: user ? user.name : `Guest_${Math.floor(Math.random() * 10000)}`,
        isHost: true,
        preferredColor: user?.preferredColor,
      };
      socketService.setCurrentUser(hostUser);
      
      // Join the room
// ... existing code ...
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
    
    // Handle numeric fields properly - allow empty strings for easier editing
    let processedValue;
    if (name === 'visibility' || name === 'roomName') {
      processedValue = value;
    } else {
      // For numeric fields, preserve empty string instead of converting to 0
      if (value === '') {
        processedValue = '';
      } else {
        const numVal = Number(value);
        processedValue = isNaN(numVal) ? '' : numVal;
      }
    }
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: processedValue
      };
      

      
      return updated;
    });
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
            <label className="block mb-2 flex items-center gap-3">
              <span>Steals</span>
              <span
                className="inline-flex items-center justify-center cursor-help relative group select-none ml-1"
                aria-label="About steals"
              >
                <span className="material-symbols-outlined text-[24px] leading-none text-gray-600">help</span>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -mt-2 mb-2 w-64 bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal">
                  Steals let you take over another player's turn. After using a steal, there's a 5-second cooldown before you can steal again. Each unused steal grants a bonus points at the end of the game.
                  <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-gray-900 border-x-8 border-x-transparent" />
                </span>
              </span>
            </label>
            <input
              type="number"
              name="powerUps"
              min="0"
              max={100}
              value={formData.powerUps}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block mb-2">Answer Time</label>
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
              disabled={!formData.roomName.trim() || isCreating || formData.maxPlayers === '' || formData.rounds === '' || formData.powerUps === '' || formData.roundDuration === ''}
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