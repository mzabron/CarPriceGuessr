import React from 'react';
import { useSfx } from '../services/soundService';

const SettingsModal = ({ onClose }) => {
  const { play, volume, setVolume, enabled, setEnabled } = useSfx();

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleVolumeRelease = () => {
    play('toggle');
  };

  const toggleMute = () => {
    setEnabled(!enabled);
    play('toggle');
  };

  const volumePercentage = volume * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-30"
        onClick={() => {
          play('toggle');
          onClose();
        }}
      />
      <div className="relative w-full max-w-sm hand-drawn-modal p-6 flex flex-col">
        <button
          onClick={() => { play('toggle'); onClose(); }}
          className="absolute top-1 right-6 text-black hover:text-gray-600 focus:outline-none font-bold text-5xl leading-none"
          aria-label="Close"
          title="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-semibold mb-6 text-center">Settings</h2>

        <div className="flex flex-col gap-6 px-2">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleMute}
              className="focus:outline-none hover:scale-110 transition-transform p-1"
              title={enabled ? "Mute" : "Unmute"}
              aria-label={enabled ? "Mute sounds" : "Unmute sounds"}
            >
              {enabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              )}
            </button>
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold">Sound Volume</label>
                <span className="text-sm font-bold">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                onMouseUp={handleVolumeRelease}
                onTouchEnd={handleVolumeRelease}
                className="w-full hand-drawn-slider h-3 border-2 border-black rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #000000 0%, #000000 ${volumePercentage}%, transparent ${volumePercentage}%, transparent 100%)`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
