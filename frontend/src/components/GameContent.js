import React from 'react';
import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const GameContent = ({ gameSettings }) => {
  const [cars, setCars] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);

  useEffect(() => {
    fetchCars().then((res) => {
      setCars(res.itemSummaries);
    });
  }, [currentRound]);

  return (
    <div className="flex-1 bg-white p-4">
      <div className="h-full flex flex-col">
        <h1 className="text-3xl font-bold mb-4">Game in Progress</h1>
        <div className="flex-1 bg-gray-100 rounded-lg p-4">
          {/* Game content coming soon... */}
          <img src={cars[0]?.imageUrl}></img>
          {/* {cars[0].} */}
        </div>
      </div>
    </div>
  );
};

const fetchCars = async () => {
      const fetchedCars = await apiService.getCars();
      return fetchedCars;
    };

export default GameContent; 