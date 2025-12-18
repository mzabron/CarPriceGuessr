import React, { useState } from 'react';
import { useSfx } from '../services/soundService';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import socketService from '../services/socketService';
import HandDrawnNumberInput from './HandDrawnNumberInput';

const CreateGameModal = ({ onClose, user }) => {
  const { play } = useSfx();
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
  const [isScrolled, setIsScrolled] = useState(false);

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
      // Navigate to the lobby without exposing room ID in URL
      navigate(`/lobby`);
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

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setIsScrolled(scrollTop > 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-x-hidden">
      <div className="hand-drawn-modal w-full max-w-md relative max-h-[90vh] sm:max-h-none overflow-hidden flex flex-col">
        {/* Sticky Header */}
        <div className={`relative p-4 sm:p-6 pb-3 sm:pb-4 transition-all duration-200 ${isScrolled ? 'border-b-2 border-[color:var(--text-color)]' : ''}`}>
          <button
            type="button"
            onClick={() => { play('toggle'); onClose(); }}
            aria-label="Close"
            className="absolute top-0 right-4 sm:right-6 focus:outline-none font-bold text-5xl leading-none hover:opacity-70"
          >
            ×
          </button>
          <h2 className="text-xl sm:text-2xl font-bold">Create New Game</h2>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto sm:overflow-y-visible overflow-x-hidden p-4 sm:p-6 pt-3 sm:pt-4" onScroll={handleScroll}>
          <form onSubmit={(e) => { play('toggle'); handleSubmit(e); }} noValidate className="space-y-3 sm:space-y-4">
          <div>
            <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base">Room Name</label>
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
            <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base">Visibility</label>
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
            <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base">Maximum Players</label>
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
            <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base">Number of Rounds</label>
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
            <label className="block mb-1.5 sm:mb-2 flex items-center gap-2 text-sm sm:text-base">
              <span>Steals</span>
              <span
                className="inline-flex items-center justify-center cursor-help relative group select-none ml-1"
                aria-label="About steals"
              >
                <span className="material-symbols-outlined text-[24px] leading-none">help</span>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -mt-2 mb-2 w-64 bg-[color:var(--bg-color)] text-[color:var(--text-color)] border-2 border-[color:var(--text-color)] text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal">
                  Steals let you take over another player's turn. After using a steal, there's a 5-second cooldown before you can steal again. Each unused steal grants a bonus points at the end of the game.
                  <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-[color:var(--text-color)] border-x-8 border-x-transparent" />
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
            <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base">Answer Time</label>
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
            <label className="block mb-1.5 sm:mb-2 flex items-center gap-2 text-sm sm:text-base">
              <span>Guess Accuracy Threshold</span>
              <span
                className="inline-flex items-center justify-center cursor-help relative group select-none ml-1"
                aria-label="About price match difficulty"
              >
                <span className="material-symbols-outlined text-[24px] leading-none">help</span>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -mt-2 mb-2 w-64 bg-[color:var(--bg-color)] text-[color:var(--text-color)] border-2 border-[color:var(--text-color)] text-xs rounded px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal">
                  Controls how close your guess must be to the actual car price to count as a correct hit. Lower percentages make the game harder; higher percentages make it more forgiving.
                  <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-[color:var(--text-color)] border-x-8 border-x-transparent" />
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

          <div className="flex justify-end space-x-4 mt-4 sm:mt-6">
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
    </div>
  );
};

export default CreateGameModal; 