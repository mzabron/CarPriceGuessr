import React, { useState, useEffect } from 'react';

// Align color options with unified palette (PLAYER_BG_COLOR)
// Keys correspond to assignedColorKey/preferredColorKey stored on server.
export const COLOR_OPTIONS = [
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

const SetNameModal = ({ initialName = '', initialPreferredColorKey, onClose, onSubmit }) => {
  const [name, setName] = useState(initialName);
  const [colorIndex, setColorIndex] = useState(0); // default to 'random'

  useEffect(() => {
    setName(initialName || '');
  }, [initialName]);

  // When reopening modal with existing preferred color, sync selection
  useEffect(() => {
    if (initialPreferredColorKey) {
      const idx = COLOR_OPTIONS.findIndex(c => c.key === initialPreferredColorKey);
      if (idx >= 0) setColorIndex(idx);
    }
  }, [initialPreferredColorKey]);

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
      <div className="relative w-full max-w-sm hand-drawn-modal p-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1 right-6 text-black hover:text-gray-600 focus:outline-none font-bold text-5xl leading-none"
        >
          ×
        </button>

        <h3 className="text-xl font-semibold mb-1">
          {initialName ? 'Change your nickname' : 'Set your nickname'}
        </h3>
        <p className="text-sm mb-5">This name will be shown to other players.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="nickname"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your nickname"
              className="w-full hand-drawn-input"
              autoFocus
              maxLength={12}
            />
          </div>

          {/* Preferred color selector */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium mb-2">
              Preferred color
            </label>
            <div className="flex items-center justify-between gap-3">
              {/* Prev arrow */}
              <button
                type="button"
                onClick={() => setColorIndex((i) => (i - 1 + COLOR_OPTIONS.length) % COLOR_OPTIONS.length)}
                className="hand-drawn-btn p-2 border-2"
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
                  className={`inline-flex w-9 h-9 rounded-full border-2 border-black shadow-inner ${COLOR_OPTIONS[colorIndex].bgClass}`}
                  aria-label={`Selected color ${COLOR_OPTIONS[colorIndex].name}`}
                />
                <span className="text-sm font-medium min-w-[5.5rem]">
                  {COLOR_OPTIONS[colorIndex].name}
                </span>
              </div>

              {/* Next arrow */}
              <button
                type="button"
                onClick={() => setColorIndex((i) => (i + 1) % COLOR_OPTIONS.length)}
                className="hand-drawn-btn p-2 border-2"
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
            className="w-full hand-drawn-btn px-4 py-2.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetNameModal;
