import React, { useState, useEffect } from 'react';
import CreateGameModal from '../components/CreateGameModal';
import RoomList from '../components/RoomList';

const Home = () => {
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [user, setUser] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Car Price Guessr</h1>
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
