import React from 'react';
import socketService from '../services/socketService';
import { useEffect } from 'react';
import { useState } from 'react';
import apiService from '../services/apiService';
import { useNavigate } from 'react-router-dom';

const GameContent = () => {
  const { navigate } = useNavigate();
  const [carJson, setCarJson] = useState(null);
  // const [carImage, setCarImage] = useState(null);

  useEffect(() => {
    socketService.connect();
    socketService.socket?.on('game:start', fetchCars);
  },);

  const fetchCars = async () => {
      const fetchedCars = await apiService.getCars();
      console.log(fetchedCars);
      setCarJson = fetchCars
        // setCarJson = await fetchedCars.json();
    };

  return (
    <div className="flex-1 bg-white p-4">
      <div className="h-full flex flex-col">
        <h1 className="text-3xl font-bold mb-4">Game in Progress</h1>
        <div className="flex-1 bg-gray-100 rounded-lg p-4">
          {/* Game content coming soon...
           */
           carJson}
        </div>
      </div>
    </div>
  );
};

export default GameContent; 