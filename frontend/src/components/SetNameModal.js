import React, { useState, useEffect } from 'react';

const SetNameModal = ({ initialName = '', onClose, onSubmit }) => {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName || '');
  }, [initialName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length > 15) return;
    onSubmit?.(trimmed);
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

        <h3 className="text-xl font-semibold text-gray-900 mb-1">Set your nickname</h3>
        <p className="text-sm text-gray-500 mb-5">This name will be shown to other players.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Speedster42"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
              maxLength={15}
            />
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
