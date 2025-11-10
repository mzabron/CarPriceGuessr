const { setIo, getIo, getRooms, setRooms, getRoomVotes, correctGuessThreshold } = require('./state');
const { getSafeRooms, getSafeRoom, generateRoomCode, getDeviation } = require('./utils');
const { sendSystemMessage } = require('./messaging');
const { startNextTurn, finishGame, startVotingPhase, initializePlayerQueue, shiftQueueForNextRound, getCurrentPlayerFromQueue, advanceQueueToNextPlayer, handleStealInQueue } = require('./gameFlow');

function setupRoomSocketHandlers(io) {
  setIo(io);
  const roomsAccessor = { getRooms, setRooms };

  io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id);
    socket.emit('rooms:list', getSafeRooms(getRooms()));

    socket.on('playerReady', (isReady) => {
      if (socket.roomId) {
        const rooms = getRooms();
        const room = rooms.find(r => r.id === socket.roomId);
        if (room) {
          const player = room.players.find(p => p.id === socket.id);
          if (player) {
            player.isReady = isReady;
            io.to(`room-${socket.roomId}`).emit('playerList', room.players);
          }
        }
      }
    });

    socket.on('game:startRound', () => {
      if (!socket.roomId) return;
      const rooms = getRooms();
      const room = rooms.find(r => r.id === socket.roomId);
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (player && player.isHost && room.players.every(p => p.isReady)) {
        if (room.currentRoundIndex >= room.settings.rounds) {
          finishGame(room);
          return;
        }
        room.gameStarted = true;
        if (room.currentRoundIndex === 0) {
          room.players.forEach(player => { player.points = 0; });
          initializePlayerQueue(room);
        } else {
          shiftQueueForNextRound(room);
        }
        room.currentRoundTurns = 0;
        room.stealUsedThisRound = false;
        if (!room.gameHistory) room.gameHistory = [];

        io.to(`room-${socket.roomId}`).emit('game:startRound', { roomId: socket.roomId });
        room.currentRoundIndex += 1;
        sendSystemMessage(socket.roomId, `Round ${room.currentRoundIndex}/${room.settings.rounds}`, 'round');

        const ebayController = require('../ebayController');
        ebayController.getCars(
          { query: {} },
          {
            json: (carList) => {
              io.to(`room-${socket.roomId}`).emit('game:cars', carList);
              const { setCars } = require('./state');
              setCars(carList || { itemSummaries: [] });
              startVotingPhase(io, socket);
            },
            status: () => ({ json: () => {} })
          }
        );
      }
    });

    socket.on('game:guess', (data) => {
      const rooms = getRooms();
      const room = rooms.find(r => r.id === socket.roomId);
      if (!room) return;
      const currentPlayer = room.players[room.currentTurnIndex];
      if (socket.id !== currentPlayer?.id) {
        return socket.emit('error', { message: 'Not your turn!' });
      }
      startNextTurn(room);
    });

    socket.on('room:updateSettings', ({ roomId, settings }) => {
      const rooms = getRooms();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;
      const oldPowerUps = room.settings.powerUps;
      const updatedSettings = { ...room.settings, ...settings };
      if (updatedSettings.powerUps > updatedSettings.rounds) {
        updatedSettings.powerUps = updatedSettings.rounds;
      }
      room.settings = updatedSettings;
      if (oldPowerUps !== updatedSettings.powerUps) {
        room.players.forEach(p => { p.stealsRemaining = updatedSettings.powerUps; });
        io.to(`room-${roomId}`).emit('playerList', room.players);
      }
      io.to(`room-${roomId}`).emit('room:settingsUpdated', room.settings);
    });

    socket.on('chat:message', ({ roomId, message, playerName }) => {
      const rooms = getRooms();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;
      const chatMessage = { player: playerName, text: message, timestamp: new Date() };
      if (!room.chatHistory) room.chatHistory = [];
      room.chatHistory.push(chatMessage);
      io.to(`room-${roomId}`).emit('chat:newMessage', chatMessage);
    });

    socket.on('rooms:join', (data) => {
      if (!data || !data.roomId) return socket.emit('error', { message: 'Room ID is required' });
      const roomId = typeof data.roomId === 'string' ? parseInt(data.roomId) : data.roomId;
      const rooms = getRooms();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return socket.emit('error', { message: `Room with id ${roomId} not found` });

      if (data.rejoin) {
        socket.join(`room-${roomId}`);
        socket.roomId = roomId;
        io.to(`room-${roomId}`).emit('playerList', room.players);
        socket.emit('room:settings', room.settings);
        if (room.chatHistory?.length) socket.emit('chat:history', room.chatHistory);
        return;
      }

      if (room.players.length >= room.settings.playersLimit) {
        return socket.emit('error', { message: `Room with id ${roomId} is currently full` });
      }

      // Collect already assigned colors in this room
      const assignedColorsInUse = new Set(room.players.map(p => p.assignedColorKey).filter(Boolean));
      const COLOR_POOL = ['red','blue','green','yellow','purple','pink','cyan','amber','orange','gray'];
      function pickAssignedColor(preferredColorKey) {
        let chosen = null;
        if (preferredColorKey && COLOR_POOL.includes(preferredColorKey) && !assignedColorsInUse.has(preferredColorKey)) {
          chosen = preferredColorKey;
        } else {
          const available = COLOR_POOL.filter(c => !assignedColorsInUse.has(c));
          chosen = available.length ? available[Math.floor(Math.random() * available.length)] : COLOR_POOL[0];
        }
        return chosen;
      }
      const preferredColorKey = (data.preferredColorKey && COLOR_POOL.includes(data.preferredColorKey)) ? data.preferredColorKey : null;

      if (room.gameStarted && !data.rejoin) {
        const assignedColorKey = pickAssignedColor(preferredColorKey);
        const player = { id: socket.id, name: data.playerName, points: 0, isReady: true, isHost: data.isHost || false, stealsRemaining: room.settings.powerUps || 2, preferredColorKey, assignedColorKey };
        room.players.push(player);
        if (room.playerQueue) room.playerQueue.push(player.id);
        socket.join(`room-${roomId}`);
        socket.roomId = roomId;
        socket.emit('room:settings', room.settings);
        if (room.chatHistory?.length) socket.emit('chat:history', room.chatHistory);
        io.to(`room-${roomId}`).emit('playerList', room.players);
        try {
          console.log(`[room ${roomId}] Players after join (in-game):`, room.players.map(p => ({ name: p.name, preferredColorKey: p.preferredColorKey, assignedColorKey: p.assignedColorKey })));
        } catch (e) {}
        socket.emit('game:startRound', { roomId });
        sendSystemMessage(roomId, `${data.playerName} has joined the game`);
        return;
      }

      const playerName = data.playerName;
      const roomChannel = `room-${roomId}`;
      const assignedColorKey = pickAssignedColor(preferredColorKey);
      const player = { id: socket.id, name: playerName, points: 0, isReady: false, isHost: data.isHost || false, stealsRemaining: room.settings.powerUps || 2, preferredColorKey, assignedColorKey };
      room.players.push(player);
      socket.join(roomChannel);
      socket.roomId = roomId;
      socket.emit('room:settings', room.settings);
      if (room.chatHistory?.length) socket.emit('chat:history', room.chatHistory);
      io.to(roomChannel).emit('playerList', room.players);
      try {
        console.log(`[room ${roomId}] Players after join:`, room.players.map(p => ({ name: p.name, preferredColorKey: p.preferredColorKey, assignedColorKey: p.assignedColorKey })));
      } catch (e) {}
      sendSystemMessage(roomId, `${playerName} has joined the room`);
      socket.emit('rooms:joined', { room: getSafeRoom(room), player });
      io.to(roomChannel).emit('rooms:playerJoined', { roomId, playerName, players: room.players });
      socket.emit('rooms:list', getSafeRooms(getRooms()));
    });

    socket.on('rooms:leave', (data) => {
      if (!data || !data.roomId) return socket.emit('error', { message: 'Room ID is required' });
      const roomId = typeof data.roomId === 'string' ? parseInt(data.roomId) : data.roomId;
      const rooms = getRooms();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return socket.emit('error', { message: `Room with id ${roomId} not found` });

      const roomChannel = `room-${roomId}`;
      const playerName = data.playerName;
      const playerIndex = room.players.findIndex(player => player.id === socket.id);
      if (playerIndex === -1) return socket.emit('error', { message: `${playerName} is not in room with id: ${roomId}` });
      const player = room.players[playerIndex];
      const wasHost = player.isHost;
      socket.leave(roomChannel);
      room.players.splice(playerIndex, 1);
      // Remove from next-round readiness and update progress
      if (room.nextRoundReady) {
        room.nextRoundReady.delete(socket.id);
        const readyCount = room.nextRoundReady.size;
        const totalPlayers = room.players.length;
        io.to(roomChannel).emit('game:nextRoundProgress', { readyCount, totalPlayers });
      }
      if (wasHost && room.players.length > 0) {
        room.players[0].isHost = true;
        io.to(room.players[0].id).emit('hostStatus', true);
      }
      sendSystemMessage(roomId, `${playerName} has left the room`);
      if (room.players.length === 0) {
        if (room.turnTimer) clearTimeout(room.turnTimer);
        const roomVotes = getRoomVotes();
        if (roomVotes[roomId]) { clearTimeout(roomVotes[roomId].timer); delete roomVotes[roomId]; }
        room.pendingGuess = null;
        room.currentRoundIndex = 0;
        room.gameHistory = [];
        const next = rooms.filter(r => r.id !== roomId);
        setRooms(next);
      }
      socket.emit('rooms:left', { room: getSafeRoom(room), playerName });
      io.to(roomChannel).emit('rooms:playerLeft', { roomId, playerName, players: room.players });
      try {
        console.log(`[room ${roomId}] Players after leave:`, room.players.map(p => ({ name: p.name, preferredColorKey: p.preferredColorKey, assignedColorKey: p.assignedColorKey })));
      } catch (e) {}
      socket.roomId = null;
      io.emit('rooms:list', getSafeRooms(getRooms()));
    });

    socket.on('disconnect', () => {
      if (!socket.roomId) return;
      const rooms = getRooms();
      const roomId = socket.roomId;
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx === -1) return;
      const player = room.players[idx];
      const wasHost = player.isHost;
  room.players.splice(idx, 1);
      // Remove from next-round readiness and update progress
      if (room.nextRoundReady) {
        room.nextRoundReady.delete(socket.id);
        const readyCount = room.nextRoundReady.size;
        const totalPlayers = room.players.length;
        io.to(`room-${roomId}`).emit('game:nextRoundProgress', { readyCount, totalPlayers });
      }
      if (wasHost && room.players.length > 0) {
        room.players[0].isHost = true;
        io.to(room.players[0].id).emit('hostStatus', true);
      }
      sendSystemMessage(roomId, `${player.name} has disconnected`);
      if (room.players.length === 0) {
        if (room.turnTimer) clearTimeout(room.turnTimer);
        const roomVotes = getRoomVotes();
        if (roomVotes[roomId]) { clearTimeout(roomVotes[roomId].timer); delete roomVotes[roomId]; }
        room.pendingGuess = null;
        room.gameHistory = [];
        const next = rooms.filter(r => r.id !== roomId);
        setRooms(next);
      }
      io.to(`room-${roomId}`).emit('rooms:playerLeft', { roomId, playerId: socket.id, playerName: player.name, players: room.players });
      try {
        console.log(`[room ${roomId}] Players after disconnect:`, room.players.map(p => ({ name: p.name, preferredColorKey: p.preferredColorKey, assignedColorKey: p.assignedColorKey })));
      } catch (e) {}
      io.emit('rooms:list', getSafeRooms(getRooms()));
    });

    socket.on('game:startVoting', ({ roomId, carCount }) => {
      const roomVotes = getRoomVotes();
      roomVotes[roomId] = { votes: {}, carCount };
      roomVotes[roomId].timer = setTimeout(() => {
        const { finishVoting } = require('./gameFlow');
        finishVoting(roomId);
      }, 15000);
      io.to(`room-${roomId}`).emit('game:votingStarted');
    });

    socket.on('game:vote', ({ roomId, playerId, playerName, carIndex }) => {
      const roomVotes = getRoomVotes();
      if (!roomVotes[roomId]) return;
      // Prefer playerId; fall back to resolving by name for backward compatibility
      let key = playerId;
      if (!key && playerName) {
        const rooms = getRooms();
        const room = rooms.find(r => r.id === roomId);
        const player = room?.players?.find(p => p.name === playerName);
        key = player?.id || playerName;
      }
      if (!key) return;
      roomVotes[roomId].votes[key] = carIndex;
      io.to(`room-${roomId}`).emit('game:votesUpdate', roomVotes[roomId].votes);
    });

    socket.on('game:confirmGuess', (data) => {
      const rooms = getRooms();
      const room = rooms.find(r => r.id === socket.roomId);
      if (!room) return;
      const currentPlayer = getCurrentPlayerFromQueue(room);
      if (!currentPlayer || socket.id !== currentPlayer.id) {
        return socket.emit('error', { message: 'Not your turn!' });
      }
      if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer = null; }
      if (typeof room.currentRoundTurns !== 'number') room.currentRoundTurns = 0;
      room.pendingGuess = { playerId: currentPlayer.id, price: data.price };
      const { getCarPrice } = require('./state');
      const deviation = getDeviation(data.price, getCarPrice());
      io.to(`room-${room.id}`).emit('game:guessConfirmed', { playerId: currentPlayer.id, playerName: currentPlayer.name, price: data.price, deviation });
      room.pendingGuess = null;
      if (deviation < correctGuessThreshold) {
        const accuracyPoints = Math.round(80 + (20 * (1 - Math.min(deviation, 5) / 5)));
        const turnBonus = room.currentRoundTurns * 5;
        const totalPoints = accuracyPoints + turnBonus;
        currentPlayer.points += totalPoints;
        io.to(`room-${room.id}`).emit('playerList', room.players);
        io.to(`room-${room.id}`).emit('game:finishRound', {
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          price: data.price,
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
        // Reset collective next-round readiness tracking
        room.nextRoundReady = new Set();
        room.currentRoundTurns = 0;
      } else {
        advanceQueueToNextPlayer(room);
        startNextTurn(room);
      }
    });

    socket.on('game:updatePendingGuess', (data) => {
      const rooms = getRooms();
      const room = rooms.find(r => r.id === socket.roomId);
      if (!room) return;
      const currentPlayer = getCurrentPlayerFromQueue(room);
      // Allow matching either by playerId (preferred) or by name for backward compatibility
      if (!currentPlayer) return;
      if (data.playerId && currentPlayer.id !== data.playerId) return;
      if (!data.playerId && data.playerName && currentPlayer.name !== data.playerName) return;
      room.pendingGuess = { playerId: currentPlayer.id, price: data.price };
    });

    socket.on('game:useSteal', () => {
      const rooms = getRooms();
      const room = rooms.find(r => r.id === socket.roomId);
      if (!room) return;
      const stealingPlayer = room.players.find(p => p.id === socket.id);
      if (!stealingPlayer) return;
      if (stealingPlayer.stealsRemaining <= 0) return socket.emit('error', { message: 'You have no steals remaining!' });
      if (room.stealUsedThisRound) return socket.emit('error', { message: 'Steal has already been used this round!' });
      const currentPlayer = getCurrentPlayerFromQueue(room);
      if (currentPlayer && currentPlayer.id === socket.id) return socket.emit('error', { message: 'It is already your turn!' });
      stealingPlayer.stealsRemaining--; room.stealUsedThisRound = true;
      if (room.turnTimer) clearTimeout(room.turnTimer);
      const originalQueueIndex = room.currentQueueIndex;
      const stealingPlayerQueueIndex = room.playerQueue.indexOf(stealingPlayer.id);
      room.currentQueueIndex = stealingPlayerQueueIndex;
      const answerTime = room.settings.answerTime || 30;
      const deadline = Date.now() + answerTime * 1000;
      room.turnDeadline = deadline;
      room.currentTurnIndex = room.players.findIndex(p => p.id === stealingPlayer.id);
      io.to(`room-${room.id}`).emit('game:stealUsed', { stealingPlayer: stealingPlayer.name, newCurrentPlayer: stealingPlayer.name });
      io.to(`room-${room.id}`).emit('game:turn', { playerId: stealingPlayer.id, playerName: stealingPlayer.name, deadline, answerTime, stealUsedThisRound: room.stealUsedThisRound, queuePosition: stealingPlayerQueueIndex + 1, totalPlayers: room.playerQueue.length });
      io.to(`room-${room.id}`).emit('playerList', room.players);
      room.turnTimer = setTimeout(() => {
        let priceToSend = 0;
        const { getCarPrice } = require('./state');
        if (room.pendingGuess && room.pendingGuess.playerId === stealingPlayer.id) {
          priceToSend = (room.pendingGuess.price === null || room.pendingGuess.price === undefined) ? 0 : room.pendingGuess.price;
          const deviation = getDeviation(priceToSend, getCarPrice());
          io.to(`room-${room.id}`).emit('game:guessConfirmed', { playerId: stealingPlayer.id, playerName: stealingPlayer.name, price: priceToSend, deviation });
          room.pendingGuess = null;
          if (deviation < correctGuessThreshold) {
            const accuracyPoints = Math.round(80 + (20 * (1 - Math.min(deviation, 5) / 5)));
            const turnBonus = room.currentRoundTurns * 5;
            const totalPoints = accuracyPoints + turnBonus;
            stealingPlayer.points += totalPoints;
            io.to(`room-${room.id}`).emit('playerList', room.players);
            io.to(`room-${room.id}`).emit('game:finishRound', { playerId: stealingPlayer.id, playerName: stealingPlayer.name, price: priceToSend, actualPrice: getCarPrice(), pointsAwarded: totalPoints, accuracyPoints, turnBonus, turnsPlayed: room.currentRoundTurns, deviation, currentRound: room.currentRoundIndex, totalRounds: room.settings.rounds, isLastRound: room.currentRoundIndex >= room.settings.rounds });
              room.nextRoundReady = new Set();
            room.currentRoundTurns = 0;
            return;
          }
        } else {
          io.to(`room-${room.id}`).emit('game:guessConfirmed', { playerId: stealingPlayer.id, playerName: stealingPlayer.name, price: 0, deviation: 100 });
        }
        handleStealInQueue(room, stealingPlayer.id);
        room.currentQueueIndex = originalQueueIndex;
        advanceQueueToNextPlayer(room);
        startNextTurn(room);
      }, answerTime * 1000);
    });

    socket.on('game:requestNextRound', ({ roomId, playerName }) => {
      // Deprecated old behavior: now handled by collective clicks; keep for backwards compatibility (broadcast only)
      io.to(`room-${roomId}`).emit('game:requestNextRound', { playerName });
    });

    // New collective next-round readiness mechanism
    socket.on('game:nextRoundClick', ({ roomId }) => {
      // Prefer using the socket's bound room to avoid type mismatch issues
      const effectiveRoomId = socket.roomId || (typeof roomId === 'string' ? parseInt(roomId) : roomId);
      const rooms = getRooms();
      const room = rooms.find(r => r.id === effectiveRoomId);
      if (!room) return;
      if (!room.nextRoundReady) room.nextRoundReady = new Set();
      // Add this player's id
      room.nextRoundReady.add(socket.id);
  const readyCount = room.nextRoundReady.size;
  const totalPlayers = room.players.length;
  io.to(`room-${effectiveRoomId}`).emit('game:nextRoundProgress', { readyCount, totalPlayers });
      // If everyone clicked, start the next round immediately
      if (readyCount === totalPlayers) {
        // Clear tracking for next cycle
        room.nextRoundReady = new Set();
        // Start next round logic copied from host-only startRound
        if (room.currentRoundIndex >= room.settings.rounds) {
          finishGame(room);
          return;
        }
        room.gameStarted = true;
        if (room.currentRoundIndex === 0) {
          room.players.forEach(player => { player.points = 0; });
          initializePlayerQueue(room);
        } else {
          shiftQueueForNextRound(room);
        }
        room.currentRoundTurns = 0;
        room.stealUsedThisRound = false;
        if (!room.gameHistory) room.gameHistory = [];
        io.to(`room-${effectiveRoomId}`).emit('game:startRound', { roomId: effectiveRoomId });
        room.currentRoundIndex += 1;
        sendSystemMessage(effectiveRoomId, `Round ${room.currentRoundIndex}/${room.settings.rounds}`, 'round');
        const ebayController = require('../ebayController');
        ebayController.getCars(
          { query: {} },
          {
            json: (carList) => {
              io.to(`room-${effectiveRoomId}`).emit('game:cars', carList);
              const { setCars } = require('./state');
              setCars(carList || { itemSummaries: [] });
              startVotingPhase(io, socket);
            },
            status: () => ({ json: () => {} })
          }
        );
      }
    });

    socket.on('game:nextRoundUnclick', ({ roomId }) => {
      const effectiveRoomId = socket.roomId || (typeof roomId === 'string' ? parseInt(roomId) : roomId);
      const rooms = getRooms();
      const room = rooms.find(r => r.id === effectiveRoomId);
      if (!room) return;
      if (!room.nextRoundReady) room.nextRoundReady = new Set();
      room.nextRoundReady.delete(socket.id);
      const readyCount = room.nextRoundReady.size;
      const totalPlayers = room.players.length;
      io.to(`room-${effectiveRoomId}`).emit('game:nextRoundProgress', { readyCount, totalPlayers });
    });

    socket.on('game:resetToLobby', ({ roomId }) => {
      const rooms = getRooms();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;
      room.gameStarted = false;
      room.currentRoundIndex = 0;
      room.currentTurnIndex = -1;
      room.currentRoundTurns = 0;
      room.stealUsedThisRound = false;
      room.gameHistory = [];
      room.chatHistory = [];
      room.players.forEach(player => { player.isReady = false; player.stealsRemaining = room.settings.powerUps; player.points = 0; });
      if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer = null; }
      io.to(`room-${roomId}`).emit('chat:clear');
      io.to(`room-${roomId}`).emit('playerList', room.players);
      io.to(`room-${roomId}`).emit('room:settings', room.settings);
    });

    socket.on('room:requestState', ({ roomId }) => {
      const rooms = getRooms();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;
      socket.emit('playerList', room.players);
      socket.emit('room:settings', room.settings);
      socket.emit('hostStatus', room.players.find(p => p.id === socket.id)?.isHost || false);
    });
  });
}

module.exports = { setupRoomSocketHandlers };
