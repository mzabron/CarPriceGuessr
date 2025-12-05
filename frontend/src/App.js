import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import SinglePlayerGame from './pages/SinglePlayerGame';
import Results from './pages/Results';
import GameLobby from './components/GameLobby';
import { SoundProvider } from './services/soundService';

function App() {
  return (
    <Router>
      <SoundProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<GameLobby />} />
          <Route path="/game" element={<Game />} />
          <Route path="/single-player" element={<SinglePlayerGame />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </SoundProvider>
    </Router>
  );
}

export default App;
