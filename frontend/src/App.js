import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import SinglePlayerGame from './pages/SinglePlayerGame';
import Results from './pages/Results';
import GameLobby from './components/GameLobby';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:roomId" element={<GameLobby />} />
        <Route path="/game/:roomId" element={<Game />} />
        <Route path="/single-player" element={<SinglePlayerGame />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;
