import React, { useState } from 'react';

const RegisterWindow = ({ onClose, onRegister }) => {
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      const res = await fetch('http://localhost:8080/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const user = await res.json();
        onRegister(user);  // callback do App
        onClose();
      } else {
        alert('Nie udało się zarejestrować');
      }
    } catch (err) {
      console.error(err);
      alert('Błąd');
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Rejestracja</h2>
        <input
          type="text"
          placeholder="Wpisz nick"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <button onClick={onClose}>Powrót(x)</button>
          <button onClick={handleSubmit}>Zarejestruj</button>
        </div>
      </div>
    </div>
  );
};

export default RegisterWindow;
