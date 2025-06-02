import React, { useState } from 'react';
import RegisterWindow from '../components/RegisterWindow';

const Home = () => {
  const [showRegister, setShowRegister] = useState(false);
  const [user, setUser] = useState(null);

  return (
    <div>
      <h1>Witaj w Car Price Guessr!</h1>

      {!user && (
        <button onClick={() => setShowRegister(true)}>
          Zarejestruj się
        </button>
      )}

      {user && (
        <p>Zarejestrowany jako: <strong>{user.name}</strong></p>
      )}

      {showRegister && (
        <RegisterWindow
          onClose={() => setShowRegister(false)}
          onRegister={(newUser) => {
            setUser(newUser);
            setShowRegister(false);
          }}
        />
      )}
    </div>
  );
};

export default Home;
