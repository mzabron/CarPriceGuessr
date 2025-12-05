const { getIo, getRooms, setCars, getCars, setCarPrice, getCarPrice, getRoomVotes, correctGuessThreshold } = require('./state');
const { initializePlayerQueue, shiftQueueForNextRound, getCurrentPlayerFromQueue, advanceQueueToNextPlayer, handleStealInQueue } = require('./queue');
const { getDeviation } = require('./utils');
const { sendSystemMessage } = require('./messaging');

function startNextTurn(room) {
  if (!room.players.length) return;

  if (typeof room.currentRoundTurns !== 'number') room.currentRoundTurns = 0;
  if (typeof room.stealUsedThisRound !== 'boolean') room.stealUsedThisRound = false;
  if (!room.playerQueue || room.playerQueue.length === 0) initializePlayerQueue(room);

  const currentPlayer = getCurrentPlayerFromQueue(room);
  if (!currentPlayer) return;
  room.currentRoundTurns++;

  const answerTime = room.settings.answerTime || 30;
  const deadline = Date.now() + answerTime * 1000;
  room.turnDeadline = deadline;
  room.currentTurnIndex = room.players.findIndex(p => p.id === currentPlayer.id);

  const io = getIo();
  io?.to(`room-${room.id}`).emit('game:turn', {
    playerId: currentPlayer.id,
    playerName: currentPlayer.name,
    deadline,
    answerTime,
    stealUsedThisRound: room.stealUsedThisRound,
    queuePosition: room.currentQueueIndex + 1,
    totalPlayers: room.playerQueue.length,
  });

  if (room.turnTimer) clearTimeout(room.turnTimer);

  const capturedRoomId = room.id;
  const capturedPlayerId = currentPlayer.id;

  room.turnTimer = setTimeout(() => {
    const roomsNow = getRooms();
    const roomNow = roomsNow.find(r => r.id === capturedRoomId);
    if (!roomNow) return;
    const currentPlayerNow = roomNow.players.find(p => p.id === capturedPlayerId);
    const ioNow = getIo();
    let priceToSend = 0;
    if (roomNow.pendingGuess && roomNow.pendingGuess.playerId === capturedPlayerId) {
      priceToSend = (roomNow.pendingGuess.price === null || roomNow.pendingGuess.price === undefined) ? 0 : roomNow.pendingGuess.price;
      const deviation = getDeviation(priceToSend, getCarPrice());
      ioNow?.to(`room-${roomNow.id}`).emit('game:guessConfirmed', {
        playerId: capturedPlayerId,
        playerName: currentPlayerNow?.name,
        price: priceToSend,
        deviation,
      });
      roomNow.pendingGuess = null;

      const threshold = typeof roomNow.settings?.correctGuessThreshold === 'number'
        ? roomNow.settings.correctGuessThreshold
        : correctGuessThreshold;
      if (deviation < threshold) {
        const accuracyPoints = Math.round(80 + (20 * (1 - Math.min(deviation, 5) / 5)));
        const turnBonus = roomNow.currentRoundTurns * 5;
        const totalPoints = accuracyPoints + turnBonus;
        if (currentPlayerNow) currentPlayerNow.points += totalPoints;
        ioNow?.to(`room-${roomNow.id}`).emit('playerList', roomNow.players);
        ioNow?.to(`room-${roomNow.id}`).emit('game:finishRound', {
          playerId: capturedPlayerId,
          playerName: currentPlayerNow?.name,
          price: priceToSend,
          actualPrice: getCarPrice(),
          pointsAwarded: totalPoints,
          accuracyPoints,
          turnBonus,
          turnsPlayed: roomNow.currentRoundTurns,
          deviation,
          currentRound: roomNow.currentRoundIndex,
          totalRounds: roomNow.settings.rounds,
          isLastRound: roomNow.currentRoundIndex >= roomNow.settings.rounds,
        });
        roomNow.nextRoundReady = new Set();
        roomNow.currentRoundTurns = 0;
        return;
      }
    } else {
      ioNow?.to(`room-${roomNow.id}`).emit('game:guessConfirmed', {
        playerId: capturedPlayerId,
        playerName: currentPlayerNow?.name,
        price: 0,
        deviation: 100,
      });
    }

    advanceQueueToNextPlayer(roomNow);
    startNextTurn(roomNow);
  }, answerTime * 1000);
}

function finishGame(room) {
  const io = getIo();
  room.currentRoundIndex = 0;
  room.players.forEach(player => {
    const stealBonus = player.stealsRemaining * 5;
    player.points += stealBonus;
  });
  room.chatHistory = [];
  io?.to(`room-${room.id}`).emit('chat:clear');
  io?.to(`room-${room.id}`).emit('game:finishGame', {
    message: `Game finished! Final scores: ${room.players.map(p => `${p.name}: ${p.points}`).join(', ')}`,
    players: room.players,
    roomId: room.id,
    roomCode: room.code,
    roomName: room.name,
    gameHistory: room.gameHistory || [],
  });
}

function startVotingPhase(io, socket) {
  const rooms = getRooms();
  const room = rooms.find(r => r.id === socket.roomId);
  const cars = getCars();
  const carCount = cars?.itemSummaries ? cars.itemSummaries.length : 0;
  const roomVotes = getRoomVotes();
  roomVotes[socket.roomId] = { votes: {}, carCount };
  roomVotes[socket.roomId].timer = setTimeout(() => finishVoting(socket.roomId), 15000);
  // Initialize collective skip voting readiness tracking
  if (room) {
    room.skipVotingReady = new Set();
    io.to(`room-${socket.roomId}`).emit('game:skipVotingProgress', {
      readyCount: 0,
      totalPlayers: room.players.length,
    });
  }
  io.to(`room-${socket.roomId}`).emit('game:votingStarted');
}

function finishVoting(roomId) {
  const io = getIo();
  const rooms = getRooms();
  const room = rooms.find(r => r.id === roomId);
  const roomVotes = getRoomVotes();
  const votes = roomVotes[roomId]?.votes || {};
  const cars = getCars();
  const carCount = roomVotes[roomId]?.carCount || 0;
  const tally = Array(carCount).fill(0);
  Object.values(votes).forEach(idx => { if (typeof idx === 'number') tally[idx]++; });
  const maxVotes = Math.max(...tally);
  const topIndexes = tally.map((v, i) => v === maxVotes ? i : -1).filter(i => i !== -1);
  const winningIndex = topIndexes.length > 0 ? topIndexes[Math.floor(Math.random() * topIndexes.length)] : Math.floor(Math.random() * carCount);
  io?.to(`room-${roomId}`).emit('game:votingResult', { winningIndex, votes: tally });
  // Persist chosen index on the room for late joiners
  if (room) room.currentWinningIndex = winningIndex;
  const chosenPrice = cars?.itemSummaries?.[winningIndex]?.price || 0;
  setCarPrice(chosenPrice);

  if (room && cars?.itemSummaries?.[winningIndex]) {
    const chosenCar = cars.itemSummaries[winningIndex];
    room.gameHistory.push({
      round: room.currentRoundIndex,
      car: {
        title: chosenCar.title,
        itemWebUrl: chosenCar.itemWebUrl,
        price: chosenCar.price,
        thumbnailImages: chosenCar.thumbnailImages,
        make: chosenCar.make,
        model: chosenCar.model,
        year: chosenCar.year,
      },
    });
  }

  clearTimeout(roomVotes[roomId]?.timer);
  delete roomVotes[roomId];
  // Reset skip voting readiness tracking after voting ends
  if (room) room.skipVotingReady = new Set();

  setTimeout(() => {
    const room = rooms.find(r => r.id === roomId);
    if (room) startNextTurn(room);
  }, 2000);
}

module.exports = {
  startNextTurn,
  finishGame,
  startVotingPhase,
  finishVoting,
  initializePlayerQueue,
  shiftQueueForNextRound,
  getCurrentPlayerFromQueue,
  advanceQueueToNextPlayer,
  handleStealInQueue,
};
