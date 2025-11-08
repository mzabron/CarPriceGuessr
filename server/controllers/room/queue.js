// Turn queue management helpers

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function initializePlayerQueue(room) {
  const playerIds = room.players.map(p => p.id);
  room.playerQueue = shuffleArray([...playerIds]);
  room.currentQueueIndex = 0;
}

function shiftQueueForNextRound(room) {
  if (room.playerQueue && room.playerQueue.length > 0) {
    const firstPlayer = room.playerQueue.shift();
    room.playerQueue.push(firstPlayer);
    room.currentQueueIndex = 0;
  }
}

function handleStealInQueue(room, stealingPlayerId) {
  const idx = room.playerQueue.indexOf(stealingPlayerId);
  if (idx !== -1) {
    room.playerQueue.splice(idx, 1);
    room.playerQueue.push(stealingPlayerId);
    if (idx < room.currentQueueIndex) {
      room.currentQueueIndex--;
    }
  }
}

function getCurrentPlayerFromQueue(room) {
  if (!room.playerQueue || room.playerQueue.length === 0) return null;
  const currentPlayerId = room.playerQueue[room.currentQueueIndex];
  return room.players.find(p => p.id === currentPlayerId) || null;
}

function advanceQueueToNextPlayer(room) {
  if (!room.playerQueue || room.playerQueue.length === 0) return null;
  room.currentQueueIndex = (room.currentQueueIndex + 1) % room.playerQueue.length;
  return getCurrentPlayerFromQueue(room);
}

module.exports = {
  shuffleArray,
  initializePlayerQueue,
  shiftQueueForNextRound,
  handleStealInQueue,
  getCurrentPlayerFromQueue,
  advanceQueueToNextPlayer,
};
