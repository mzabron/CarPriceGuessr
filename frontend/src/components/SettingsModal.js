import React from 'react';
import { useSfx } from '../services/soundService';

const SettingsModal = ({ onClose }) => {
  const { play } = useSfx();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-30"
        onClick={() => {
          play('toggle');
          onClose();
        }}
      />
      <div className="relative w-full max-w-sm hand-drawn-modal p-6">
        <button
          onClick={() => { play('toggle'); onClose(); }}
          className="absolute top-1 right-6 text-black hover:text-gray-600 focus:outline-none font-bold text-5xl leading-none"
          aria-label="Close"
          title="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-semibold mb-4">Settings</h2>
        <div className="text-sm">
          <p className="opacity-80">No settings yet — coming soon.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
