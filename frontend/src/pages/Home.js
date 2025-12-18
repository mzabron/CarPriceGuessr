import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSfx } from '../services/soundService';
import CreateGameModal from '../components/CreateGameModal';
import CreateSingleGameModal from '../components/CreateSingleGameModal';
import RoomList from '../components/RoomList';
import SetNameModal, { COLOR_OPTIONS } from '../components/SetNameModal';
import handDrawnLogo from '../assets/logo_handdrawn.png';
import SettingsModal from '../components/SettingsModal';
import AboutModal from '../components/AboutModal';

const Home = () => {
  const { play } = useSfx();
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showSingleGame, setShowSingleGame] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [user, setUser] = useState(null);
  const [showSetName, setShowSetName] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    // Rehydrate saved nickname & preferred color from localStorage (Home page persistence only)
    try {
      const storedName = localStorage.getItem('cpg:nickname');
      const storedColorKey = localStorage.getItem('cpg:preferredColorKey');
      if (storedName) {
        let preferredColor = null;
        if (storedColorKey) {
          preferredColor = COLOR_OPTIONS.find(c => c.key === storedColorKey) || null;
        }
        setUser({ name: storedName, preferredColor });
      }
    } catch (_) {
      // Non-fatal: ignore storage issues
    }
  }, []);

  return (
    <div className="home-refactor-container min-h-screen">
      <header className="home-refactor-header">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
            <div className="flex items-center h-20 justify-center sm:justify-start w-full sm:w-auto">
              <Link to="/" onClick={() => play('toggle')}>
                <img
                  src={handDrawnLogo}
                  alt="CarPriceGuessr Logo"
                  className="hand-drawn-logo cursor-pointer"
                />
              </Link>
            </div>
            <div className="flex flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => { play('toggle'); setShowSetName(true); }}
                className={`hand-drawn-btn inline-flex items-center justify-center gap-2 sm:gap-3 px-5 py-2.5 h-12`}
                title={user?.name ? 'Change name' : 'Set name'}
              >
                {user?.name ? (
                  <>
                    {/* Avatar: if preferredColor exists (including 'random'), show solid/gradient swatch without letters; otherwise fallback to initials */}
                    {user?.preferredColor ? (
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${user.preferredColor.bgClass} border-2 border-[color:var(--text-color)]`}
                        aria-hidden="true"
                        title={user?.preferredColor?.name || 'Avatar'}
                      />
                    ) : (
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-transparent border-2 border-[color:var(--text-color)] text-[color:var(--text-color)] text-sm font-semibold uppercase`}
                        aria-hidden="true"
                        title="Avatar"
                      >
                        {(user.name || '')
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map(s => s[0])
                          .join('')
                          .toUpperCase() || 'U'}
                      </span>
                    )}
                    <span className="max-w-[11rem] truncate font-semibold leading-normal pb-0.5">{user.name}</span>
                    {/* Minimal outline pencil icon */}
                    <svg
                      className="w-4 h-4 text-[color:var(--text-color)] opacity-80"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 113 3L8 18l-4 1 1-4 11.5-11.5z" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span className="text-base font-medium leading-none">Set name</span>
                    {/* Minimal standalone person icon */}
                    <svg
                      className="w-5 h-5 text-[color:var(--text-color)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 21a8 8 0 10-16 0" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </>
                )}
              </button>
              <button
                onClick={() => { play('toggle'); setShowSettings(true); }}
                className="hand-drawn-btn inline-flex items-center justify-center gap-2 sm:gap-3 px-5 py-2.5 h-12"
                title="Settings"
              >
                <span className="text-base font-medium leading-none hidden sm:block">Settings</span>
                <svg
                  className="w-5 h-5 text-[color:var(--text-color)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009.4 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004 15.4 1.65 1.65 0 002.49 14H2a2 2 0 110-4h.49A1.65 1.65 0 004 9.4a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 007.4 4.6 1.65 1.65 0 009 3.49V3a2 2 0 114 0v.49A1.65 1.65 0 0014.6 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9.4 1.65 1.65 0 0020.51 11H21a2 2 0 110 4h-.49A1.65 1.65 0 0019.4 15z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              {user ? `Welcome, ${user.name}!` : 'Welcome, Guest!'}
            </h2>
            <p className="text-xl">
              Join an existing game or create your own room to start playing
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button
              onClick={() => { play('toggle'); setShowSingleGame(true); }}
              className="hand-drawn-btn w-full sm:w-auto px-8 py-4 text-lg"
            >
              Single Player Mode
            </button>
            <button
              onClick={() => { play('toggle'); setShowCreateGame(true); }}
              className="hand-drawn-btn w-full sm:w-auto px-8 py-4 text-lg"
            >
              Create New Game
            </button>
            <button
              onClick={() => { play('toggle'); setShowRoomList(true); }}
              className="hand-drawn-btn w-full sm:w-auto px-8 py-4 text-lg"
            >
              Join Game
            </button>
          </div>
        </div>
      </main>

      {/* Modals */}

      {showSingleGame && (
        <CreateSingleGameModal onClose={() => setShowSingleGame(false)} />
      )}

      {showCreateGame && (
        <CreateGameModal onClose={() => setShowCreateGame(false)} user={user} />
      )}

      {showRoomList && (
        <RoomList onClose={() => setShowRoomList(false)} user={user} />
      )}

      {showSetName && (
        <SetNameModal
          initialName={user?.name || ''}
          initialPreferredColorKey={user?.preferredColor?.key}
          onClose={() => setShowSetName(false)}
          onSubmit={(payload) => {
            if (payload && typeof payload === 'object') {
              const { name, preferredColor } = payload;
              setUser({ name, preferredColor });
              // Persist locally so a simple browser refresh retains choices on Home page
              try {
                localStorage.setItem('cpg:nickname', name);
                // Store only the key; 'random' stored so user sees avatar gradient again after refresh
                localStorage.setItem('cpg:preferredColorKey', preferredColor?.key || '');
              } catch (_) {
                // Ignore quota / privacy mode errors
              }
            }
            setShowSetName(false);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* About Button - Bottom Left */}
      <button
        onClick={() => { play('toggle'); setShowAbout(true); }}
        className="fixed bottom-6 left-6 hand-drawn-btn px-6 py-3 text-lg font-bold z-40 hidden md:block"
        title="About & Donate"
      >
        About
      </button>

      {/* Mobile About Button (Icon only) - positioned slightly differently to avoid overlap if needed, or same */}
      {!showCreateGame && !showSingleGame && !showRoomList && !showSetName && !showSettings && !showAbout && (
        <button
          onClick={() => { play('toggle'); setShowAbout(true); }}
          className="fixed bottom-4 left-4 hand-drawn-btn w-12 h-12 flex items-center justify-center rounded-full z-10 md:hidden"
          title="About & Donate"
        >
          <span className="text-xl font-bold">?</span>
        </button>
      )}

      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}
    </div>
  );
};

export default Home;
