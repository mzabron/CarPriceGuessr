import React, { useState, useEffect } from 'react';
import RegisterModal from '../components/RegisterModal';
import CreateGameModal from '../components/CreateGameModal';
import RoomList from '../components/RoomList';
import socketService from '../services/socketService';

const Home = () => {
  const [showRegister, setShowRegister] = useState(false);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Connect to Socket.IO when component mounts
    socketService.connect();

    return () => {
      // Cleanup Socket.IO connection when component unmounts
      socketService.disconnect();
    };
  }, []);

  // Update socket service when user changes
  useEffect(() => {
    socketService.setCurrentUser(user);
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Register button */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Car Price Guessr</h1>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Playing as:</span>
                <span className="font-semibold text-gray-800">{user.name}</span>
              </div>
            ) : (
              <button
                onClick={() => setShowRegister(true)}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Register
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
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
            setUser(newUser);
            setShowRegister(false);
          }}
        />
      )}

      {showCreateGame && (
        <CreateGameModal
          onClose={() => setShowCreateGame(false)}
        />
      )}

      {showRoomList && (
        <RoomList
          onClose={() => setShowRoomList(false)}
        />
      )}
    </div>
  );
};

export default Home;
