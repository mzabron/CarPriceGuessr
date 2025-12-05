import React, { useState } from 'react';
import { useSfx } from '../services/soundService';
import { useNavigate } from 'react-router-dom';

const CreateSingleGameModal = ({ onClose }) => {
  const navigate = useNavigate();
  const { play } = useSfx();
  const [difficulty, setDifficulty] = useState('medium'); // default to medium (15%)

  const handleSubmit = (e) => {
    e.preventDefault();
    // Map difficulty to threshold
    let threshold = 15;
    if (difficulty === 'easy') threshold = 25;
    if (difficulty === 'hard') threshold = 5;

    play('toggle');
    onClose();
    navigate('/single-player', { state: { difficulty: threshold } });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="hand-drawn-modal p-6 w-full max-w-md relative">
        <button
          type="button"
          onClick={() => { play('toggle'); onClose(); }}
          aria-label="Close"
          className="absolute top-1 right-6 text-black hover:text-gray-600 focus:outline-none font-bold text-5xl leading-none"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4">Single Player Mode</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 font-semibold">Select Difficulty</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border-2 border-black rounded-lg cursor-pointer hover:bg-black/5 transition-colors group">
                <input
                  type="radio"
                  name="difficulty"
                  value="easy"
                  checked={difficulty === 'easy'}
                  onChange={(e) => { play('toggle'); setDifficulty(e.target.value); }}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 border-black flex-shrink-0 transition-colors ${difficulty === 'easy' ? 'bg-black' : 'bg-transparent group-hover:bg-black/10'}`} />
                <div>
                  <span className="font-bold block">Easy</span>
                  <span className="text-sm">25% margin of error</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border-2 border-black rounded-lg cursor-pointer hover:bg-black/5 transition-colors group">
                <input
                  type="radio"
                  name="difficulty"
                  value="medium"
                  checked={difficulty === 'medium'}
                  onChange={(e) => { play('toggle'); setDifficulty(e.target.value); }}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 border-black flex-shrink-0 transition-colors ${difficulty === 'medium' ? 'bg-black' : 'bg-transparent group-hover:bg-black/10'}`} />
                <div>
                  <span className="font-bold block">Medium</span>
                  <span className="text-sm">15% margin of error</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border-2 border-black rounded-lg cursor-pointer hover:bg-black/5 transition-colors group">
                <input
                  type="radio"
                  name="difficulty"
                  value="hard"
                  checked={difficulty === 'hard'}
                  onChange={(e) => { play('toggle'); setDifficulty(e.target.value); }}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 border-black flex-shrink-0 transition-colors ${difficulty === 'hard' ? 'bg-black' : 'bg-transparent group-hover:bg-black/10'}`} />
                <div>
                  <span className="font-bold block">Hard</span>
                  <span className="text-sm">5% margin of error</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="submit"
              className="hand-drawn-btn px-6 py-2 font-bold"
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
