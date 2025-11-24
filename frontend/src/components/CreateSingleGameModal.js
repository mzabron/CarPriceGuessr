import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateSingleGameModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState('medium'); // default to medium (15%)

  const handleSubmit = (e) => {
    e.preventDefault();
    // Map difficulty to threshold
    let threshold = 15;
    if (difficulty === 'easy') threshold = 25;
    if (difficulty === 'hard') threshold = 5;

    onClose();
    navigate('/single-player', { state: { difficulty: threshold } });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Single Player Mode</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 font-semibold">Select Difficulty</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="difficulty"
                  value="easy"
                  checked={difficulty === 'easy'}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="h-4 w-4 text-blue-600"
                />
                <div>
                  <span className="font-bold block">Easy</span>
                  <span className="text-sm text-gray-500">25% margin of error</span>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="difficulty"
                  value="medium"
                  checked={difficulty === 'medium'}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="h-4 w-4 text-blue-600"
                />
                <div>
                  <span className="font-bold block">Medium</span>
                  <span className="text-sm text-gray-500">15% margin of error</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="difficulty"
                  value="hard"
                  checked={difficulty === 'hard'}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="h-4 w-4 text-blue-600"
                />
                <div>
                  <span className="font-bold block">Hard</span>
                  <span className="text-sm text-gray-500">5% margin of error</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-bold shadow"
            >
              Start Game
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSingleGameModal;
