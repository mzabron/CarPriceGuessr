import React from 'react';
import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const GameContent = ({ gameSettings }) => {
  const [cars, setCars] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchCars().then((res) => {
      console.log('Cars data:', res.itemSummaries[0]);
      setCars(res.itemSummaries);
      setCurrentImageIndex(0);
    });
  }, [currentRound]);

  const handlePrevImage = () => {
    if (!cars[0]?.thumbnailImages) return;
    setCurrentImageIndex((prev) => 
      prev === 0 ? cars[0].thumbnailImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!cars[0]?.thumbnailImages) return;
    setCurrentImageIndex((prev) => 
      prev === cars[0].thumbnailImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="flex-1 bg-white p-4">
      <div className="h-full flex flex-col">
        <h1 className="text-3xl font-bold mb-4">Game in Progress</h1>
        <div className="flex-1 bg-gray-100 rounded-lg p-4">
          {cars[0] && (
            <div className="flex flex-col items-center">
              {/* Car Title and Description */}
              <div className="text-2xl font-bold mb-2 text-center max-w-4xl">
                {cars[0].title || 'No Title'}
              </div>
              <div className="text-lg mb-4 text-center max-w-4xl text-gray-600">
                {cars[0].shortDescription || 'No Description Available'}
              </div>

              {/* Image Carousel */}
              <div className="w-full max-w-4xl mb-4 relative">
                <div className="aspect-[16/9] relative">
                  <button 
                    onClick={handlePrevImage}
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-4 rounded-l hover:bg-opacity-75 z-10"
                  >
                    ←
                  </button>
                  <img 
                    src={cars[0].thumbnailImages?.[currentImageIndex]?.imageUrl} 
                    alt="Car" 
                    className="absolute inset-0 w-full h-full object-contain bg-black rounded-lg"
                  />
                  <button 
                    onClick={handleNextImage}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-4 rounded-r hover:bg-opacity-75 z-10"
                  >
                    →
                  </button>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {cars[0].thumbnailImages?.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-3 h-3 rounded-full ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Car Details Grid */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-4 text-lg">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Year:</span>
                  <span>{cars[0].year || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Make:</span>
                  <span>{cars[0].make || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Model:</span>
                  <span>{cars[0].model || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Car Type:</span>
                  <span>{cars[0].carType || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Mileage:</span>
                  <span>{cars[0].mileage || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Engine:</span>
                  <span>{cars[0].engine || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Fuel Type:</span>
                  <span>{cars[0].fuelType || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">For Sale By:</span>
                  <span>{cars[0].forSaleBy || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Condition:</span>
                  <span>{cars[0].condition || 'No Information'}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">Condition Description:</span>
                  <span className="ml-2">{cars[0].conditionDescription || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Price:</span>
                  <span>{cars[0].price || 'No Information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Location:</span>
                  <span>
                    {cars[0].itemLocation?.city ? `${cars[0].itemLocation.city}, ` : ''}
                    {cars[0].itemLocation?.country || 'No Information'}
                  </span>
                </div>
              </div>
            </div>
          )}
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