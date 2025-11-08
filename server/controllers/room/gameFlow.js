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

  room.turnTimer = setTimeout(() => {
    let priceToSend = 0;
    if (room.pendingGuess && room.pendingGuess.playerId === currentPlayer.id) {
      priceToSend = (room.pendingGuess.price === null || room.pendingGuess.price === undefined) ? 0 : room.pendingGuess.price;
      const deviation = getDeviation(priceToSend, getCarPrice());
      io?.to(`room-${room.id}`).emit('game:guessConfirmed', {
        playerName: currentPlayer.name,
        price: priceToSend,
        deviation,
      });
      room.pendingGuess = null;

      if (deviation < correctGuessThreshold) {
        const accuracyPoints = Math.round(80 + (20 * (1 - Math.min(deviation, 5) / 5)));
        const turnBonus = room.currentRoundTurns * 5;
        const totalPoints = accuracyPoints + turnBonus;
        currentPlayer.points += totalPoints;
        io?.to(`room-${room.id}`).emit('playerList', room.players);
        io?.to(`room-${room.id}`).emit('game:finishRound', {
          playerName: currentPlayer.name,
          price: priceToSend,
          actualPrice: getCarPrice(),
          pointsAwarded: totalPoints,
          accuracyPoints,
          turnBonus,
          turnsPlayed: room.currentRoundTurns,
          deviation,
          currentRound: room.currentRoundIndex,
          totalRounds: room.settings.rounds,
          isLastRound: room.currentRoundIndex >= room.settings.rounds,
        });
        room.currentRoundTurns = 0;
        return;
      }
    } else {
      io?.to(`room-${room.id}`).emit('game:guessConfirmed', {
        playerName: currentPlayer.name,
        price: 0,
        deviation: 100,
      });
    }

    advanceQueueToNextPlayer(room);
    startNextTurn(room);
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
