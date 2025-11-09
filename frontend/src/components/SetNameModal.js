import React, { useState, useEffect } from 'react';

// Align color options with unified palette (PLAYER_BG_COLOR)
// Keys correspond to assignedColorKey/preferredColorKey stored on server.
const COLOR_OPTIONS = [
  { key: 'random', name: 'Random', bgClass: 'bg-gradient-to-r from-pink-200 via-yellow-200 to-green-200' },
  { key: 'red', name: 'Red', bgClass: 'bg-red-600' },
  { key: 'blue', name: 'Blue', bgClass: 'bg-blue-500' },
  { key: 'green', name: 'Green', bgClass: 'bg-lime-500' },
  { key: 'yellow', name: 'Yellow', bgClass: 'bg-yellow-400' },
  { key: 'purple', name: 'Purple', bgClass: 'bg-violet-500' },
  { key: 'pink', name: 'Pink', bgClass: 'bg-fuchsia-400' },
  { key: 'cyan', name: 'Cyan', bgClass: 'bg-cyan-400' },
  { key: 'amber', name: 'Brown', bgClass: 'bg-amber-800' },
  { key: 'orange', name: 'Orange', bgClass: 'bg-orange-500' },
  { key: 'gray', name: 'Gray', bgClass: 'bg-stone-500' },
];

const SetNameModal = ({ initialName = '', onClose, onSubmit }) => {
  const [name, setName] = useState(initialName);
  const [colorIndex, setColorIndex] = useState(0); // default to 'random'

  useEffect(() => {
    setName(initialName || '');
  }, [initialName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length > 15) return;
    const selected = COLOR_OPTIONS[colorIndex] || COLOR_OPTIONS[0];
    onSubmit?.({ name: trimmed, preferredColor: selected });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          ×
        </button>

        <h3 className="text-xl font-semibold text-gray-900 mb-1">
          {initialName ? 'Change your nickname' : 'Set your nickname'}
        </h3>
        <p className="text-sm text-gray-500 mb-5">This name will be shown to other players.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="nickname"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your nickname"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
              maxLength={12}
            />
          </div>

          {/* Preferred color selector */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
              Preferred color
            </label>
            <div className="flex items-center justify-between gap-3">
              {/* Prev arrow */}
              <button
                type="button"
                onClick={() => setColorIndex((i) => (i - 1 + COLOR_OPTIONS.length) % COLOR_OPTIONS.length)}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
                aria-label="Previous color"
                title="Previous color"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              {/* Color sample and name */}
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex w-9 h-9 rounded-full border border-gray-300 shadow-inner ${COLOR_OPTIONS[colorIndex].bgClass}`}
                  aria-label={`Selected color ${COLOR_OPTIONS[colorIndex].name}`}
                />
                <span className="text-sm font-medium text-gray-800 min-w-[5.5rem]">
                  {COLOR_OPTIONS[colorIndex].name}
                </span>
              </div>

              {/* Next arrow */}
              <button
                type="button"
                onClick={() => setColorIndex((i) => (i + 1) % COLOR_OPTIONS.length)}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
                aria-label="Next color"
                title="Next color"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full inline-flex justify-center items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-white font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetNameModal;
