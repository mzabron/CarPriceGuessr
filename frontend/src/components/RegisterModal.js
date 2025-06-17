import React, { useState } from 'react';

const RegisterModal = ({ onClose, onRegister, onLogin }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');

    if (!name.trim()) return setError('Nickname is required');
    if (!password.trim()) return setError('Password is required');

    try {
      // const response = await fetch('http://localhost:8080/api/users', {
      const response = await fetch('https://api-tlarysz.lab.kis.agh.edu.pl/api/users', {
      method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (response.status === 201) {
        if (typeof onRegister === 'function') onRegister(data);
      } else {
        throw new Error(data.message || 'Failed to register');
      }
    } catch (err) {
      setError(err.message || 'Failed to register. Please try again.');
    }
  };

  const handleLogin = async () => {
    setError('');

    if (!name.trim()) return setError('Nickname is required');
    if (!password.trim()) return setError('Password is required');

    try {
      const response = await fetch('https://api-tlarysz.lab.kis.agh.edu.pl/api/users/login', {
      // const response = await fetch('http://localhost:8080/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (response.status === 200) {
        if (typeof onLogin === 'function') onLogin(data);
      } else {
        throw new Error(data.message || 'Invalid login or password');
      }
    } catch (err) {
      setError(err.message || 'Failed to login. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
        {/* Cancel button in top right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-500 text-3xl font-bold text-gray-600 hover:text-white shadow transition focus:outline-none focus:ring-2 focus:ring-red-400 leading-none p-0"
          aria-label="Close"
        >
          <span style={{ transform: 'translateY(-2px)' }}>×</span>
        </button>
        <h2 className="text-2xl font-bold mb-4">Login or Register</h2>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter your login"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter your password"
          />

          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

          <div className="flex justify-center space-x-4 mt-6">
            <button
              type="button"
              onClick={handleLogin}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={!name.trim() || !password.trim()}
            >
              Login
            </button>
            <button
              type="button"
              onClick={handleRegister}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!name.trim() || !password.trim()}
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
