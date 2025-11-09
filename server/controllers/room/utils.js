// Utility functions for room data shaping and calculations

function getSafeRooms(rooms) {
  return rooms.map(getSafeRoom);
}

function getSafeRoom(room) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    players: room.players,
    settings: room.settings,
    currentTurnIndex: room.currentTurnIndex,
    currentRoundIndex: room.currentRoundIndex,
  };
}

// Generate a unique 6-character room code
function generateRoomCode(existingRooms) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (existingRooms.some(room => room.code === code));
  return code;
}

// Calculate percentage deviation between guess and actual price
function getDeviation(guess, actualPrice) {
  if (actualPrice && typeof actualPrice === 'string') {
    const match = actualPrice.match(/([\d,.]+)/);
    if (match) actualPrice = match[1].replace(/,/g, '');
  }
  actualPrice = Number(actualPrice);
  guess = Number(guess);
  if (actualPrice === 0) return 0;
  return Math.abs((guess - actualPrice) / actualPrice) * 100;
}

module.exports = {
  getSafeRooms,
  getSafeRoom,
  generateRoomCode,
  getDeviation
};
