import React, { useState, useEffect } from 'react';
import RegisterModal from '../components/RegisterModal';
import CreateGameModal from '../components/CreateGameModal';
import RoomList from '../components/RoomList';

const Home = () => {
  const [showRegister, setShowRegister] = useState(false);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [user, setUser] = useState(null);

  // Sprawdzenie localStorage przy starcie
  useEffect(() => {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Car Price Guessr</h1>
            {user ? (
              <div className="flex space-x-4 items-center">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowRegister(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-800">
              {user ? `Welcome, ${user.name}!` : 'Welcome, Guest!'}
            </h2>
            <p className="text-gray-600">
              Join an existing game or create your own room to start playing
            </p>
          </div>

          <div className="flex justify-center space-x-6">
            <button
              onClick={() => setShowCreateGame(true)}
              className="px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-lg shadow-md transition-colors"
            >
              Create New Game
            </button>
            <button
              onClick={() => setShowRoomList(true)}
              className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-lg shadow-md transition-colors"
            >
              Join Game
            </button>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onRegister={(newUser) => {
            localStorage.setItem('loggedInUser', JSON.stringify(newUser));
            setUser(newUser);
            setShowRegister(false);
          }}
          onLogin={(loggedUser) => {
            localStorage.setItem('loggedInUser', JSON.stringify(loggedUser));
            setUser(loggedUser);
            setShowRegister(false);
          }}
        />
      )}

      {showCreateGame && (
        <CreateGameModal onClose={() => setShowCreateGame(false)} user={user} />
      )}

      {showRoomList && (
        <RoomList onClose={() => setShowRoomList(false)} user={user} />
      )}
    </div>
  );
};

export default Home;
