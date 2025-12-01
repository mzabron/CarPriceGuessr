import React, { useState, useEffect } from 'react';
import CreateGameModal from '../components/CreateGameModal';
import CreateSingleGameModal from '../components/CreateSingleGameModal';
import RoomList from '../components/RoomList';
import SetNameModal, { COLOR_OPTIONS } from '../components/SetNameModal';
import handDrawnLogo from '../assets/logo_handdrawn.png';

const Home = () => {
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showSingleGame, setShowSingleGame] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [user, setUser] = useState(null);
  const [showSetName, setShowSetName] = useState(false);

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
          <div className="flex justify-between items-center">
            <div className="flex items-center h-20">
              <img
                src={handDrawnLogo}
                alt="CarPriceGuessr Logo"
                className="hand-drawn-logo"
              />
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setShowSetName(true)}
                className={`hand-drawn-btn inline-flex items-center gap-3 px-5 py-2.5`}
                title={user?.name ? 'Change name' : 'Set name'}
              >
                {user?.name ? (
                  <>
                    {/* Avatar: if preferredColor exists (including 'random'), show solid/gradient swatch without letters; otherwise fallback to initials */}
                    {user?.preferredColor ? (
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${user.preferredColor.bgClass} border-2 border-black`}
                        aria-hidden="true"
                        title={user?.preferredColor?.name || 'Avatar'}
                      />
                    ) : (
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-transparent border-2 border-black text-black text-sm font-semibold uppercase`}
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
                      className="w-4 h-4 text-black opacity-80"
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
                      className="w-5 h-5 text-black"
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

          <div className="flex justify-center space-x-6">
            <button
              onClick={() => setShowSingleGame(true)}
              className="hand-drawn-btn px-8 py-4 text-lg"
            >
              Single Player Mode
            </button>
            <button
              onClick={() => setShowCreateGame(true)}
              className="hand-drawn-btn px-8 py-4 text-lg"
            >
              Create New Game
            </button>
            <button
              onClick={() => setShowRoomList(true)}
              className="hand-drawn-btn px-8 py-4 text-lg"
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
    </div>
  );
};

export default Home;
