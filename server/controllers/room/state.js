// Shared in-memory state for rooms and voting
let rooms = [];
let cars = null; // Last fetched cars list (global across rooms currently)
let carPrice = null; // Winning car price of current round
const correctGuessThreshold = 5; // % deviation required to finish round
let ioInstance = null; // Socket.IO server instance reference
const roomVotes = {}; // { roomId: { votes: {playerName: carIndex}, timer: Timeout, carCount: N } }

module.exports = {
  getRooms: () => rooms,
  setRooms: (next) => { rooms = next; },
  getCars: () => cars,
  setCars: (next) => { cars = next; },
  getCarPrice: () => carPrice,
  setCarPrice: (price) => { carPrice = price; },
  getIo: () => ioInstance,
  setIo: (io) => { ioInstance = io; },
  getRoomVotes: () => roomVotes,
  correctGuessThreshold,
};
