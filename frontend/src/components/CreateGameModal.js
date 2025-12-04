import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import socketService from '../services/socketService';
import HandDrawnNumberInput from './HandDrawnNumberInput';

const CreateGameModal = ({ onClose, user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    roomName: '',
    visibility: 'public',
    maxPlayers: 4,
    powerUps: 5,
    rounds: 5,
    roundDuration: 30,
    correctGuessThreshold: 5
  });
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDuplicateName, setIsDuplicateName] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const checkDuplicateRoomName = async (roomName) => {
    try {
      const existingRooms = await apiService.getRooms();
      return existingRooms.some(room => room.name === roomName);
    } catch (error) {
      console.error('Error checking room names:', error);
      throw new Error('Failed to validate room name');
    }
  };

  // Live validation: debounce duplicate name check when roomName changes
  React.useEffect(() => {
    const name = (formData.roomName || '').trim();
    if (!name) {
      setIsDuplicateName(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const dup = await checkDuplicateRoomName(name);
        setIsDuplicateName(dup);
        if (dup) {
          setError('A room with this name already exists');
        } else if (error === 'A room with this name already exists') {
          setError('');
        }
      } catch (_) {
        // Non-fatal: ignore live check errors
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.roomName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError('');

    if (!formData.roomName.trim()) {
      setError('Room name is required');
      return;
    }

    // Validate that all numeric fields have valid values
    if (formData.maxPlayers === '' || formData.rounds === '' || formData.powerUps === '' || formData.roundDuration === '' || formData.correctGuessThreshold === '') {
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
      <div className="hand-drawn-modal p-6 w-full max-w-md relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1 right-6 text-black hover:text-gray-600 focus:outline-none font-bold text-5xl leading-none"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4">Create New Game</h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block mb-2">Room Name</label>
            <input
              type="text"
              name="roomName"
              value={formData.roomName}
              onChange={handleChange}
              className="w-full hand-drawn-input"
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
              className="w-full hand-drawn-input"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="block mb-2">Maximum Players</label>
            <HandDrawnNumberInput
              name="maxPlayers"
              min="2"
              max="10"
              value={formData.maxPlayers}
              onChange={handleChange}
              className="w-full hand-drawn-input"
            />
          </div>

          <div>
            <label className="block mb-2">Number of Rounds</label>
            <HandDrawnNumberInput
              name="rounds"
              min="1"
              max="10"
              value={formData.rounds}
              onChange={handleChange}
              className="w-full hand-drawn-input"
            />
          </div>

          <div>
            <label className="block mb-2 flex items-center gap-3">
              <span>Steals</span>
              <span
                className="inline-flex items-center justify-center cursor-help relative group select-none ml-1"
                aria-label="About steals"
              >
                <span className="material-symbols-outlined text-[24px] leading-none">help</span>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -mt-2 mb-2 w-64 bg-[#FAEBD7] text-black border-2 border-black text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal">
                  Steals let you take over another player's turn. After using a steal, there's a 5-second cooldown before you can steal again. Each unused steal grants a bonus points at the end of the game.
                  <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-black border-x-8 border-x-transparent" />
                </span>
              </span>
            </label>
            <HandDrawnNumberInput
              name="powerUps"
              min="0"
              max={100}
              value={formData.powerUps}
              onChange={handleChange}
              className="w-full hand-drawn-input"
            />
          </div>

          <div>
            <label className="block mb-2">Answer Time</label>
            <select
              name="roundDuration"
              value={formData.roundDuration}
              onChange={handleChange}
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
              <span
                className="inline-flex items-center justify-center cursor-help relative group select-none ml-1"
                aria-label="About price match difficulty"
              >
                <span className="material-symbols-outlined text-[24px] leading-none">help</span>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -mt-2 mb-2 w-64 bg-[#FAEBD7] text-black border-2 border-black text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal">
                  Controls how close your guess must be to the actual car price to count as a correct hit. Lower percentages make the game harder; higher percentages make it more forgiving.
                  <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-black border-x-8 border-x-transparent" />
                </span>
              </span>
            </label>
            <select
              name="correctGuessThreshold"
              value={formData.correctGuessThreshold}
              onChange={handleChange}
              className="w-full hand-drawn-input"
            >
              {[5, 10, 15].map(percent => (
                <option key={percent} value={percent}>{percent}%</option>
              ))}
            </select>
          </div>

          {(() => {
            const nameEmpty = !(formData.roomName || '').trim();
            let msg = '';
            if (isDuplicateName) msg = 'A room with this name already exists';
            else if (error) msg = error;
            else if (submitAttempted && nameEmpty) msg = 'Room name is required';
            return msg ? (
              <div className="text-red-600 text-sm mt-2 font-bold">{msg}</div>
            ) : null;
          })()}

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="submit"
              className="hand-drawn-btn px-4 py-2"
              disabled={isCreating}
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