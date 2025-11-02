// Store rooms in memory
let rooms = [];

let cars = null;
let carPrice = null;
const correctGuessTreshold = 5; // %

let ioInstance = null;

function getSafeRooms(rooms) {
  return rooms.map(room => ({
    id: room.id,
    code: room.code,
    name: room.name,
    players: room.players,
    settings: room.settings,
    currentTurnIndex: room.currentTurnIndex,
    currentRoundIndex: room.currentRoundIndex,
  }));
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

// Generate a random room code
const generateRoomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (rooms.some(room => room.code === code));
  return code;
};

const roomVotes = {}; // { roomId: { votes: {playerId: carIndex}, timer: Timeout, carCount: N } }

// Helper function to send system messages and store them in chat history
function sendSystemMessage(roomId, text, type = 'system') {
  const room = rooms.find(r => r.id === roomId);
  if (room) {
    const message = {
      player: 'System',
      text: text,
      timestamp: new Date(),
      type: type
    };
    
    // Store in chat history
    if (!room.chatHistory) {
      room.chatHistory = [];
    }
    room.chatHistory.push(message);
    
    // Broadcast to all players in the room
    if (ioInstance) {
      ioInstance.to(`room-${roomId}`).emit('chat:newMessage', message);
    }
  }
}

function getDeviation(guess, actualPrice) {
  if (actualPrice && typeof actualPrice === 'string') {
    // Try to extract number from string like "12345 USD"
    const match = actualPrice.match(/([\d,.]+)/);
    if (match) actualPrice = match[1].replace(/,/g, '');
  }
  actualPrice = Number(actualPrice);
  guess = Number(guess);
  if (actualPrice === 0) return 0;
  console.log('actualPrice: ', actualPrice);
  console.log('deviation: ', Math.abs((guess - actualPrice) / actualPrice) * 100);
  return Math.abs((guess - actualPrice) / actualPrice) * 100;
}

// Queue management functions
function initializePlayerQueue(room) {
  // Create a shuffled array of player IDs for the first round
  const playerIds = room.players.map(p => p.id);
  room.playerQueue = shuffleArray([...playerIds]);
  room.currentQueueIndex = 0;
  console.log('Initialized player queue for room', room.id, ':', room.playerQueue);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function shiftQueueForNextRound(room) {
  // Move the first player to the end of the queue
  if (room.playerQueue.length > 0) {
    const firstPlayer = room.playerQueue.shift();
    room.playerQueue.push(firstPlayer);
    room.currentQueueIndex = 0;
    console.log('Shifted queue for next round in room', room.id, ':', room.playerQueue);
  }
}

function handleStealInQueue(room, stealingPlayerId) {
  // Remove the stealing player from their current position and add to end
  const stealingPlayerIndex = room.playerQueue.indexOf(stealingPlayerId);
  if (stealingPlayerIndex !== -1) {
    room.playerQueue.splice(stealingPlayerIndex, 1);
    room.playerQueue.push(stealingPlayerId);
    
    // Adjust current queue index if needed
    if (stealingPlayerIndex < room.currentQueueIndex) {
      room.currentQueueIndex--;
    }
    
    console.log('Updated queue after steal in room', room.id, ':', room.playerQueue);
  }
}

function getCurrentPlayerFromQueue(room) {
  if (!room.playerQueue || room.playerQueue.length === 0) {
    return null;
  }
  
  const currentPlayerId = room.playerQueue[room.currentQueueIndex];
  return room.players.find(p => p.id === currentPlayerId);
}

function advanceQueueToNextPlayer(room) {
  if (!room.playerQueue || room.playerQueue.length === 0) {
    return null;
  }
  
  room.currentQueueIndex = (room.currentQueueIndex + 1) % room.playerQueue.length;
  return getCurrentPlayerFromQueue(room);
}

function startNextTurn(room) {
  if (!room.players.length) return;

  // Initialize round turn counter if not exists
  if (typeof room.currentRoundTurns !== 'number') {
    room.currentRoundTurns = 0;
  }

  // Initialize steal tracking for round if not exists
  if (typeof room.stealUsedThisRound !== 'boolean') {
    room.stealUsedThisRound = false;
  }

  // Initialize or validate player queue
  if (!room.playerQueue || room.playerQueue.length === 0) {
    initializePlayerQueue(room);
  }

  // Get current player from queue
  const currentPlayer = getCurrentPlayerFromQueue(room);
  if (!currentPlayer) {
    console.error('No current player found in queue for room', room.id);
    return;
  }

  // Increment turn counter
  room.currentRoundTurns++;

  const answerTime = room.settings.answerTime || 30;
  const deadline = Date.now() + answerTime * 1000;
  room.turnDeadline = deadline;

  // Update currentTurnIndex for compatibility with existing code
  room.currentTurnIndex = room.players.findIndex(p => p.id === currentPlayer.id);

  // Notify all clients whose turn it is
  ioInstance.to(`room-${room.id}`).emit('game:turn', {
    playerId: currentPlayer.id,
    playerName: currentPlayer.name,
    deadline,
    answerTime,
    stealUsedThisRound: room.stealUsedThisRound,
    queuePosition: room.currentQueueIndex + 1,
    totalPlayers: room.playerQueue.length
  });

  // Clear previous timer if any
  if (room.turnTimer) clearTimeout(room.turnTimer);

  // Set timer for next turn
  room.turnTimer = setTimeout(() => {
    // On timeout, auto-submit the player's current guess (if any)
    let priceToSend = 0;
    if (room.pendingGuess && room.pendingGuess.playerId === currentPlayer.id) {
      priceToSend = (room.pendingGuess.price === null || room.pendingGuess.price === undefined) ? 0 : room.pendingGuess.price;
      
      // Check if user won
      const deviation = getDeviation(priceToSend, carPrice);
      ioInstance.to(`room-${room.id}`).emit('game:guessConfirmed', {
        playerName: currentPlayer.name,
        price: priceToSend,
        deviation: deviation
      });
      room.pendingGuess = null;
      
      if (deviation < correctGuessTreshold) {
        // Calculate points based on accuracy and turn count
        const accuracyPoints = Math.round(80 + (20 * (1 - Math.min(deviation, 5) / 5))); // 80-100 points based on deviation
        const turnBonus = room.currentRoundTurns * 5; // +5 per turn (currentRoundTurns already includes current turn)
        const totalPoints = accuracyPoints + turnBonus;
        
        currentPlayer.points += totalPoints;
        
        // Update player list for all players to show new scores
        ioInstance.to(`room-${room.id}`).emit('playerList', room.players);
        
        // End round with success
        ioInstance.to(`room-${room.id}`).emit('game:finishRound', {
          playerName: currentPlayer.name,
          price: priceToSend,
          actualPrice: carPrice,
          pointsAwarded: totalPoints,
          accuracyPoints: accuracyPoints,
          turnBonus: turnBonus,
          turnsPlayed: room.currentRoundTurns,
          deviation: deviation,
          currentRound: room.currentRoundIndex,
          totalRounds: room.settings.rounds,
          isLastRound: room.currentRoundIndex >= room.settings.rounds
        });
        room.currentRoundTurns = 0; // Reset for next round
        return;
      }
    } else {
      // If no guess was made, send 0
      ioInstance.to(`room-${room.id}`).emit('game:guessConfirmed', {
        playerName: currentPlayer.name,
        price: 0,
        deviation: 100
      });
    }
    
    // Advance to next player in queue
    advanceQueueToNextPlayer(room);
    startNextTurn(room);
  }, answerTime * 1000);
}

// socket handlers
const setupRoomSocketHandlers = (io) => {
  ioInstance = io;
  io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id);

    // Send current rooms list to the connected client
    socket.emit('rooms:list', getSafeRooms(rooms));

    // Handle player ready status
    socket.on('playerReady', (isReady) => {
      if (socket.roomId) {
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

    // Handle game start
    socket.on('game:startRound', () => {
      if (socket.roomId) {
        const room = rooms.find(r => r.id === socket.roomId);
        if (room) {
          const player = room.players.find(p => p.id === socket.id);
          if (player && player.isHost && room.players.every(p => p.isReady)) {
            if (room.currentRoundIndex >= room.settings.rounds) {
              finishGame(room);
              return;
            }
            room.gameStarted = true;
            
            // Reset points when starting a new game (first round)
            if (room.currentRoundIndex === 0) {
              room.players.forEach(player => {
                player.points = 0;
              });
              // Initialize player queue for the first round (randomized)
              initializePlayerQueue(room);
            } else {
              // Shift queue for subsequent rounds
              shiftQueueForNextRound(room);
            }
            
            // Reset turn counter for new round
            room.currentRoundTurns = 0;
            // Reset steal usage for new round
            room.stealUsedThisRound = false;
            // Initialize game history if it doesn't exist
            if (!room.gameHistory) room.gameHistory = [];
            
            io.to(`room-${socket.roomId}`).emit('game:startRound', { roomId: socket.roomId });

            room.currentRoundIndex += 1;

            // Send round announcement to chat
            sendSystemMessage(socket.roomId, `Round ${room.currentRoundIndex}/${room.settings.rounds}`, 'round');

            const ebayController = require('./ebayController');

            ebayController.getCars(
              { query: {} },
              {
                json: (carList) => {
                  io.to(`room-${socket.roomId}`).emit('game:cars', carList);
                  cars = carList || { itemSummaries: [] };

                  // --- Start voting phase automatically after sending cars ---
                  startVotingPhase(socket);
                },
                status: () => ({ json: () => {} })
              }
            );
          }
        }
      }
    });

    function finishGame(room) {
      room.currentRoundIndex = 0;
      
      // Add bonus points for remaining steals (+5 per remaining steal)
      room.players.forEach(player => {
        const stealBonus = player.stealsRemaining * 5;
        player.points += stealBonus;
        console.log(`${player.name} gets ${stealBonus} bonus points for ${player.stealsRemaining} remaining steals`);
      });
      
      // Clear chat history after game finishes
      room.chatHistory = [];
      
      // Notify all players to clear their chat
      ioInstance.to(`room-${room.id}`).emit('chat:clear');
      
      console.log('Finishing game - sending game history:', room.gameHistory);
      // Broadcast to ALL players in the room, not just the requesting socket
      ioInstance.to(`room-${room.id}`).emit('game:finishGame', {
        message: `Game finished! Final scores: ${room.players.map(p => `${p.name}: ${p.points}`).join(', ')}`,
        players: room.players,
        roomId: room.id,
        roomCode: room.code,
        roomName: room.name,
        gameHistory: room.gameHistory || []
      });
    };


    function startVotingPhase(socket) {
      const carCount = cars.itemSummaries ? cars.itemSummaries.length : 0;
      roomVotes[socket.roomId] = { votes: {}, carCount };
      roomVotes[socket.roomId].timer = setTimeout(() => finishVoting(socket.roomId), 15000);
      io.to(`room-${socket.roomId}`).emit('game:votingStarted');
    }

    socket.on('game:guess', (data) => {
      const room = rooms.find(r => r.id === socket.roomId);
      if (!room) return;
      const currentPlayer = room.players[room.currentTurnIndex];
      if (socket.id !== currentPlayer.id) {
        return socket.emit('error', { message: 'Not your turn!' });
      }
      // Handle guess...
      // After guess, move to next turn:
      startNextTurn(room);
    });

    // Handle room settings update
    socket.on('room:updateSettings', (data) => {
      const { roomId, settings } = data;
      const room = rooms.find(r => r.id === roomId);
      
      if (room) {
        // Store old powerUps value to check if it changed
        const oldPowerUps = room.settings.powerUps;
        
        // Validate that powerUps don't exceed rounds
        const updatedSettings = { ...room.settings, ...settings };
        if (updatedSettings.powerUps > updatedSettings.rounds) {
          updatedSettings.powerUps = updatedSettings.rounds;
        }
        
        room.settings = updatedSettings;
        
        // If powerUps changed, update all players' stealsRemaining
        if (oldPowerUps !== updatedSettings.powerUps) {
          room.players.forEach(player => {
            player.stealsRemaining = updatedSettings.powerUps;
          });
          
          // Emit updated player list to reflect the changes
          io.to(`room-${roomId}`).emit('playerList', room.players);
        }
        
        io.to(`room-${roomId}`).emit('room:settingsUpdated', room.settings);
      }
    });

    // Handle chat messages
    socket.on('chat:message', (data) => {
      const { roomId, message, playerName } = data;
      const room = rooms.find(r => r.id === roomId);
      
      if (room) {
        const chatMessage = {
          player: playerName,
          text: message,
          timestamp: new Date()
        };
        
        // Store message in room's chat history
        if (!room.chatHistory) {
          room.chatHistory = [];
        }
        room.chatHistory.push(chatMessage);
        
        // Broadcast to all players in the room
        io.to(`room-${roomId}`).emit('chat:newMessage', chatMessage);
      }
    });

    // handler do dolaczania do pokoju
    socket.on('rooms:join', (data) => {
      if (!data || !data.roomId) {
        return socket.emit('error', { message: 'Room ID is required' });
      }

      const roomId = typeof data.roomId === 'string' ? parseInt(data.roomId) : data.roomId;
      const room = rooms.find(r => r.id === roomId);

      if (!room) {
        return socket.emit('error', { message: `Room with id ${roomId} not found` });
      }

      // If this is a rejoin after game start, just send the current state
      if (data.rejoin) {
        socket.join(`room-${roomId}`);
        socket.roomId = roomId;
        io.to(`room-${roomId}`).emit('playerList', room.players);
        socket.emit('room:settings', room.settings);
        
        // Send chat history to rejoining player
        if (room.chatHistory && room.chatHistory.length > 0) {
          socket.emit('chat:history', room.chatHistory);
        }
        
        return;
      }

      if (room.players.length >= room.settings.playersLimit) {
        return socket.emit('error', { message: `Room with id ${roomId} is currently full` });
      }

      if (room.gameStarted && !data.rejoin) {
        const player = {
          id: socket.id,
          name: data.playerName,
          points: 0,
          isReady: true, // Auto-ready since game is in progress
          isHost: data.isHost || false,
          stealsRemaining: room.settings.powerUps || 2 // Initialize steals based on room settings
        };

        room.players.push(player);
        
        // Add new player to the end of the queue
        if (room.playerQueue) {
          room.playerQueue.push(player.id);
        }
        
        socket.join(`room-${roomId}`);
        socket.roomId = roomId;

        // Send current game state
        socket.emit('room:settings', room.settings);
        
        // Send chat history to new player
        if (room.chatHistory && room.chatHistory.length > 0) {
          socket.emit('chat:history', room.chatHistory);
        }
        
        io.to(`room-${roomId}`).emit('playerList', room.players);

        // Redirect to game immediately
        socket.emit('game:startRound', { roomId });

        // Notify others
        sendSystemMessage(roomId, `${data.playerName} has joined the game`);

        return;
      }

      const playerName = data.playerName;
      const roomChannel = `room-${roomId}`;

      const player = {
        id: socket.id,
        name: playerName,
        points: 0,
        isReady: false,
        isHost: data.isHost || false,
        stealsRemaining: room.settings.powerUps || 2 // Initialize steals based on room settings
      };

      room.players.push(player);

      socket.join(roomChannel);
      socket.roomId = roomId;

      console.log(`${playerName} joined room: ${room.name}`);

      // Send room settings to the new player
      socket.emit('room:settings', room.settings);

      // Send chat history to new player
      if (room.chatHistory && room.chatHistory.length > 0) {
        socket.emit('chat:history', room.chatHistory);
      }

      // Send current player list to all players in the room
      io.to(roomChannel).emit('playerList', room.players);

      // Send join message to chat
      sendSystemMessage(roomId, `${playerName} has joined the room`);

      // inform player they joined
      socket.emit('rooms:joined', { room: getSafeRoom(room), player });

      // inform players in room about new player
      io.to(roomChannel).emit('rooms:playerJoined', {
        roomId,
        playerName,
        players: room.players
      });

      socket.emit('rooms:list', getSafeRooms(rooms));
    });

    // handler do opuszczania pokoju
    socket.on('rooms:leave', (data) => {
      if (!data || !data.roomId) {
        return socket.emit('error', { message: 'Room ID is required' });
      }
      const roomId = typeof data.roomId === 'string' ? parseInt(data.roomId) : data.roomId;
      const room = rooms.find(r => r.id === roomId);
      
      if (!room) {
        return socket.emit('error', { message: `Room with id ${roomId} not found` });
      }

      const roomChannel = `room-${roomId}`;
      const playerName = data.playerName;
      const playerIndex = room.players.findIndex(player => player.id === socket.id);
      
      if (playerIndex === -1) {
        return socket.emit('error', { message: `${playerName} is not in room with id: ${roomId}` });
      }

      const player = room.players[playerIndex];
      const wasHost = player.isHost;

      socket.leave(roomChannel);
      room.players.splice(playerIndex, 1);
      
      // If the host left, assign host status to the next player
      if (wasHost && room.players.length > 0) {
        room.players[0].isHost = true;
        io.to(room.players[0].id).emit('hostStatus', true);
      }

      // Send leave message to chat
      sendSystemMessage(roomId, `${playerName} has left the room`);
      
      // Check if room is empty and delete it if so
      if (room.players.length === 0) {
        // Clean up per-room state before deleting the room
        if (room.turnTimer) clearTimeout(room.turnTimer);
        if (roomVotes[roomId]) {
          clearTimeout(roomVotes[roomId].timer);
          delete roomVotes[roomId];
        }
        if (room.pendingGuess) room.pendingGuess = null;
        if (room.currentRoundIndex) room.currentRoundIndex = 0;
        if (room.gameHistory) room.gameHistory = [];
        
        rooms = rooms.filter(r => r.id !== roomId);
        console.log(`Room ${roomId} deleted because it's empty`);
      }
      
      // informuj gracza ze wyszedl
      socket.emit('rooms:left', { room: getSafeRoom(room), playerName });
      
      // informuj graczy w pokoju ze inny gracz wyszedl
      io.to(roomChannel).emit('rooms:playerLeft', {
        roomId,
        playerName,
        players: room.players
      });

      socket.roomId = null;
      console.log(`${playerName} left room: ${room.name}`);

      // Broadcast updated room list to all clients
      io.emit('rooms:list', getSafeRooms(rooms));
      console.log(rooms);
    });

    // handler do odlaczenia usera
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);

      if (socket.roomId) {
        const roomId = socket.roomId;
        const room = rooms.find(r => r.id === roomId);

        if (room && room.players) {
          const playerIndex = room.players.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            const player = room.players[playerIndex];
            const wasHost = player.isHost;
            room.players.splice(playerIndex, 1);

            // If the host disconnected, assign host status to the next player
            if (wasHost && room.players.length > 0) {
              room.players[0].isHost = true;
              io.to(room.players[0].id).emit('hostStatus', true);
            }

            // Send disconnect message to chat
            sendSystemMessage(roomId, `${player.name} has disconnected`);

            // Check if room is empty and delete it if so
            if (room.players.length === 0) {
              // Clean up per-room state before deleting the room
              if (room.turnTimer) clearTimeout(room.turnTimer);
              if (roomVotes[roomId]) {
                clearTimeout(roomVotes[roomId].timer);
                delete roomVotes[roomId];
              }
              if (room.pendingGuess) room.pendingGuess = null;
              // Add any other per-room state cleanup here
              if (room.gameHistory) room.gameHistory = [];
              rooms = rooms.filter(r => r.id !== roomId);
              console.log(`Room ${roomId} deleted because it's empty`);
            }

            io.to(`room-${roomId}`).emit('rooms:playerLeft', {
              roomId,
              playerId: socket.id,
              playerName: player.name,
              players: room.players
            });

            // Broadcast updated room list to all clients
            io.emit('rooms:list', getSafeRooms(rooms));
          }
        }
      }
    });

    socket.on('game:startVoting', ({ roomId, carCount }) => {
      roomVotes[roomId] = { votes: {}, carCount };
      // Start 15s timer
      roomVotes[roomId].timer = setTimeout(() => finishVoting(roomId), 15000);
      io.to(`room-${roomId}`).emit('game:votingStarted');
    });

    socket.on('game:vote', ({ roomId, playerName, carIndex }) => {
      if (!roomVotes[roomId]) return;
      roomVotes[roomId].votes[playerName] = carIndex;
      io.to(`room-${roomId}`).emit('game:votesUpdate', roomVotes[roomId].votes);
    });

    function finishVoting(roomId) {
      const votes = roomVotes[roomId]?.votes || {};
      const carCount = roomVotes[roomId]?.carCount || 0;
      const tally = Array(carCount).fill(0);
      Object.values(votes).forEach(idx => { if (typeof idx === 'number') tally[idx]++; });
      const maxVotes = Math.max(...tally);
      const topIndexes = tally.map((v, i) => v === maxVotes ? i : -1).filter(i => i !== -1);
      // Randomize if tie or no votes
      const winningIndex = topIndexes.length > 0 ? topIndexes[Math.floor(Math.random() * topIndexes.length)] : Math.floor(Math.random() * carCount);
      io.to(`room-${roomId}`).emit('game:votingResult', { winningIndex, votes: tally });
      carPrice = cars.itemSummaries[winningIndex]?.price || 0;
      
      // Store the chosen car in game history
      const room = rooms.find(r => r.id === roomId);
      if (room && cars.itemSummaries[winningIndex]) {
        const chosenCar = cars.itemSummaries[winningIndex];
        console.log('Storing car in game history:', chosenCar);
        console.log('Car itemWebUrl:', chosenCar.itemWebUrl);
        room.gameHistory.push({
          round: room.currentRoundIndex,
          car: {
            title: chosenCar.title,
            itemWebUrl: chosenCar.itemWebUrl,
            price: chosenCar.price,
            thumbnailImages: chosenCar.thumbnailImages,
            make: chosenCar.make,
            model: chosenCar.model,
            year: chosenCar.year
          }
        });
        console.log('Updated game history:', room.gameHistory);
      }
      
      clearTimeout(roomVotes[roomId]?.timer);
      delete roomVotes[roomId];

      setTimeout(() => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
          startNextTurn(room);
        }
      }, 2000); // 2 seconds
    }

    socket.on('game:confirmGuess', (data) => {
      const room = rooms.find(r => r.id === socket.roomId);
      if (!room) return;
      
      // Use queue system to get current player
      const currentPlayer = getCurrentPlayerFromQueue(room);
      if (!currentPlayer || socket.id !== currentPlayer.id) {
        return socket.emit('error', { message: 'Not your turn!' });
      }
      
      // Clear the active turn timer
      if (room.turnTimer) {
        clearTimeout(room.turnTimer);
        room.turnTimer = null;
      }
      
      // Initialize round turn counter if not exists
      if (typeof room.currentRoundTurns !== 'number') {
        room.currentRoundTurns = 0;
      }
      
      // Store the guess for timeout fallback
      room.pendingGuess = {
        playerId: currentPlayer.id,
        price: data.price
      };
      
      // Calculate deviation
      const deviation = getDeviation(data.price, carPrice);
      
      // Broadcast the guess to all players
      io.to(`room-${room.id}`).emit('game:guessConfirmed', {
        playerName: currentPlayer.name,
        price: data.price,
        deviation: deviation,
      });
      room.pendingGuess = null;
      
      if (deviation < correctGuessTreshold) {
        // Calculate points based on accuracy and turn count
        const accuracyPoints = Math.round(80 + (20 * (1 - Math.min(deviation, 5) / 5))); // 80-100 points based on deviation
        const turnBonus = room.currentRoundTurns * 5; // +5 per turn (currentRoundTurns already includes current turn)
        const totalPoints = accuracyPoints + turnBonus;
        
        // If the guess is correct enough, award points
        currentPlayer.points += totalPoints;
        
        // Update player list for all players to show new scores
        io.to(`room-${room.id}`).emit('playerList', room.players);
        
        io.to(`room-${room.id}`).emit('game:finishRound', {
          playerName: currentPlayer.name,
          price: data.price,
          actualPrice: carPrice,
          pointsAwarded: totalPoints,
          accuracyPoints: accuracyPoints,
          turnBonus: turnBonus,
          turnsPlayed: room.currentRoundTurns,
          deviation: deviation,
          currentRound: room.currentRoundIndex,
          totalRounds: room.settings.rounds,
          isLastRound: room.currentRoundIndex >= room.settings.rounds
        });
        
        // Reset turn counter for next round
        room.currentRoundTurns = 0;
      } else {
        // Advance to next player in queue
        advanceQueueToNextPlayer(room);
        startNextTurn(room);
      }
    });

    socket.on('game:updatePendingGuess', (data) => {
      const room = rooms.find(r => r.id === socket.roomId);
      if (!room) return;
      
      // Use queue system to get current player
      const currentPlayer = getCurrentPlayerFromQueue(room);
      if (!currentPlayer || currentPlayer.name !== data.playerName) return;
      
      room.pendingGuess = {
        playerId: currentPlayer.id,
        price: data.price
      };
    });

    // Handle steal button click
    socket.on('game:useSteal', (data) => {
      const room = rooms.find(r => r.id === socket.roomId);
      if (!room) return;
      
      const stealingPlayer = room.players.find(p => p.id === socket.id);
      if (!stealingPlayer) return;
      
      // Check if player has steals remaining
      if (stealingPlayer.stealsRemaining <= 0) {
        return socket.emit('error', { message: 'You have no steals remaining!' });
      }
      
      // Check if steal was already used this round
      if (room.stealUsedThisRound) {
        return socket.emit('error', { message: 'Steal has already been used this round!' });
      }
      
      // Check if it's already their turn
      const currentPlayer = getCurrentPlayerFromQueue(room);
      if (currentPlayer && currentPlayer.id === socket.id) {
        return socket.emit('error', { message: 'It is already your turn!' });
      }
      
      // Use the steal
      stealingPlayer.stealsRemaining--;
      room.stealUsedThisRound = true;
      
      // Clear existing turn timer
      if (room.turnTimer) clearTimeout(room.turnTimer);
      
      // Update queue: the stealing player will go to the end after their guess
      // But for now, make them the current player temporarily
      const originalQueueIndex = room.currentQueueIndex;
      const stealingPlayerQueueIndex = room.playerQueue.indexOf(stealingPlayer.id);
      
      // Temporarily set the current queue position to the stealing player
      room.currentQueueIndex = stealingPlayerQueueIndex;
      
      // Set new turn with stealing player
      const answerTime = room.settings.answerTime || 30;
      const deadline = Date.now() + answerTime * 1000;
      room.turnDeadline = deadline;
      
      // Update currentTurnIndex for compatibility
      room.currentTurnIndex = room.players.findIndex(p => p.id === stealingPlayer.id);
      
      // Notify all clients about the steal and new turn
      ioInstance.to(`room-${room.id}`).emit('game:stealUsed', {
        stealingPlayer: stealingPlayer.name,
        newCurrentPlayer: stealingPlayer.name
      });
      
      ioInstance.to(`room-${room.id}`).emit('game:turn', {
        playerId: stealingPlayer.id,
        playerName: stealingPlayer.name,
        deadline,
        answerTime,
        stealUsedThisRound: room.stealUsedThisRound,
        queuePosition: stealingPlayerQueueIndex + 1,
        totalPlayers: room.playerQueue.length
      });
      
      // Update player list to show new steal counts
      ioInstance.to(`room-${room.id}`).emit('playerList', room.players);
      
      // Set new timer for the stealing player
      room.turnTimer = setTimeout(() => {
        // On timeout, auto-submit the player's current guess (if any)
        let priceToSend = 0;
        if (room.pendingGuess && room.pendingGuess.playerId === stealingPlayer.id) {
          priceToSend = (room.pendingGuess.price === null || room.pendingGuess.price === undefined) ? 0 : room.pendingGuess.price;
          
          // Check if user won
          const deviation = getDeviation(priceToSend, carPrice);
          ioInstance.to(`room-${room.id}`).emit('game:guessConfirmed', {
            playerName: stealingPlayer.name,
            price: priceToSend,
            deviation: deviation
          });
          room.pendingGuess = null;
          
          if (deviation < correctGuessTreshold) {
            // Calculate points based on accuracy and turn count
            const accuracyPoints = Math.round(80 + (20 * (1 - Math.min(deviation, 5) / 5))); // 80-100 points based on deviation
            const turnBonus = room.currentRoundTurns * 5; // +5 per turn
            const totalPoints = accuracyPoints + turnBonus;
            
            stealingPlayer.points += totalPoints;
            ioInstance.to(`room-${room.id}`).emit('playerList', room.players);
            ioInstance.to(`room-${room.id}`).emit('game:finishRound', {
              playerName: stealingPlayer.name,
              price: priceToSend,
              actualPrice: carPrice,
              pointsAwarded: totalPoints,
              accuracyPoints: accuracyPoints,
              turnBonus: turnBonus,
              turnsPlayed: room.currentRoundTurns,
              deviation: deviation,
              currentRound: room.currentRoundIndex,
              totalRounds: room.settings.rounds,
              isLastRound: room.currentRoundIndex >= room.settings.rounds
            });
            room.currentRoundTurns = 0; // Reset for next round
            return;
          }
        } else {
          // If no guess was made, send 0
          ioInstance.to(`room-${room.id}`).emit('game:guessConfirmed', {
            playerName: stealingPlayer.name,
            price: 0,
            deviation: 100
          });
        }
        
        // After steal guess, handle queue: move stealing player to end and restore original flow
        handleStealInQueue(room, stealingPlayer.id);
        // Restore original queue position and continue
        room.currentQueueIndex = originalQueueIndex;
        advanceQueueToNextPlayer(room);
        startNextTurn(room);
      }, answerTime * 1000);
    });

    socket.on('game:requestNextRound', (data) => {
      const { roomId, playerName } = data;
      // Broadcast to all players in the room that someone requested next round
      io.to(`room-${roomId}`).emit('game:requestNextRound', { playerName });
    });

    socket.on('game:resetToLobby', (data) => {
      const { roomId } = data;
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        // Reset room to lobby state
        room.gameStarted = false;
        room.currentRoundIndex = 0;
        room.currentTurnIndex = -1;
        room.currentRoundTurns = 0;
        room.stealUsedThisRound = false;
        room.gameHistory = [];
        room.chatHistory = []; // Clear chat history when resetting to lobby
        
        // Reset all players' ready status and clear any game-specific data
        room.players.forEach(player => {
          player.isReady = false;
          player.stealsRemaining = room.settings.powerUps;
          player.points = 0; // Reset points for new game
        });
        
        // Clear any active timers
        if (room.turnTimer) {
          clearTimeout(room.turnTimer);
          room.turnTimer = null;
        }
        
        // Notify all players to clear their chat
        io.to(`room-${roomId}`).emit('chat:clear');
        
        // Broadcast updated player list and room settings to all players in the room
        io.to(`room-${roomId}`).emit('playerList', room.players);
        io.to(`room-${roomId}`).emit('room:settings', room.settings);
      }
    });

    socket.on('room:requestState', (data) => {
      const { roomId } = data;
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        // Send current room state to the requesting player
        socket.emit('playerList', room.players);
        socket.emit('room:settings', room.settings);
        socket.emit('hostStatus', room.players.find(p => p.id === socket.id)?.isHost || false);
      }
    });
  });
}

exports.setupRoomSocketHandlers = setupRoomSocketHandlers;

// Room management methods
exports.createRoom = (req, res) => {
  try {
    const roomData = req.body;
    console.log('Current rooms before creation:', JSON.stringify(rooms, null, 2));
    console.log('Received room creation request:', JSON.stringify(roomData, null, 2));

    if (!roomData.roomName) {
      console.log('Room creation failed: name is required');
      return res.status(400).json({ error: 'Room name is required' });
    }

    const newId = rooms.length > 0 ? Math.max(...rooms.map(r => r.id)) + 1 : 1;
    const roomCode = generateRoomCode();
    console.log('Generated new room ID:', newId, 'with code:', roomCode);

    const newRoom = {
      id: newId,
      code: roomCode,
      name: roomData.roomName,
      players: [],
      settings: {
        roomName: roomData.roomName,
        roomCode: roomCode,        playersLimit: roomData.playersLimit || 4,
        rounds: roomData.rounds || 5,
        powerUps: roomData.powerUps || 2,
        answerTime: roomData.answerTime || 30,
        visibility: roomData.visibility || 'public'
      },
      currentRoundIndex: 0,
      currentTurnIndex: -1,
      turnTimer: null,
      turnDeadline: null,
      stealUsedThisRound: false, // Initialize steal tracking
      gameHistory: [], // Track cars chosen in each round
      playerQueue: [], // Queue for turn order (array of player IDs)
      chatHistory: [] // Store chat messages
    };

    console.log('Created new room object:', JSON.stringify(newRoom, null, 2));

    rooms = [...rooms, newRoom];
    console.log('Current rooms after adding new room:', JSON.stringify(rooms, null, 2));

    if (ioInstance) {
      console.log('Broadcasting updated room list to all clients');
      ioInstance.emit('rooms:list', getSafeRooms(rooms));
    } else {
      console.warn('Socket.io instance not available - room list not broadcasted');
    }

    res.status(201).json({ 
      message: `Room '${newRoom.name}' created successfully`,
      room: newRoom
    });
  } catch (error) {
    console.error('Error in createRoom:', error);
    res.status(500).json({ error: 'Internal server error while creating room' });
  }
};

exports.getRooms = (req, res) => {
  try {
    console.log('Getting all rooms:', JSON.stringify(rooms, null, 2));
    res.json(rooms);
  } catch (error) {
    console.error('Error in getRooms:', error);
    res.status(500).json({ error: 'Internal server error while fetching rooms' });
  }
};

exports.deleteRoom = (req, res) => {
  const { id } = req.params;
  const roomIndex = rooms.findIndex(room => room.id === parseInt(id));

  if (roomIndex === -1) {
    return res.status(404).json({ message: 'Room not found' });
  }

  rooms = rooms.filter(room => room.id !== parseInt(id));
  
  // Broadcast updated room list
  if (ioInstance) {
    ioInstance.emit('rooms:list', getSafeRooms(rooms));
  }
  
  res.status(204).send();
};

// Add join by code endpoint
exports.joinRoomByCode = (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Room code is required' });
    }

    const room = rooms.find(r => r.code === code.toUpperCase());
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.players.length >= room.settings.playersLimit) {
      return res.status(400).json({ error: 'Room is full' });
    }

    res.json({ roomId: room.id });
  } catch (error) {
    console.error('Error in joinRoomByCode:', error);
    res.status(500).json({ error: 'Internal server error while joining room' });
  }
};