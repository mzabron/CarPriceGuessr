// Store rooms in memory
let rooms = [];

let ioInstance = null;

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

// socket handlers
const setupRoomSocketHandlers = (io) => {
  ioInstance = io;
  io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id);

    // Send current rooms list to the connected client
    socket.emit('rooms:list', rooms);

    // Handle room settings update
    socket.on('room:updateSettings', (data) => {
      const { roomId, settings } = data;
      const room = rooms.find(r => r.id === roomId);
      
      if (room) {
        room.settings = { ...room.settings, ...settings };
        io.to(`room-${roomId}`).emit('room:settingsUpdated', room.settings);
      }
    });

    // Handle chat messages
    socket.on('chat:message', (data) => {
      const { roomId, message, playerName } = data;
      io.to(`room-${roomId}`).emit('chat:newMessage', {
        player: playerName,
        text: message,
        timestamp: new Date()
      });
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

      if (room.players.length >= room.settings.playersLimit) {
        return socket.emit('error', { message: `Room with id ${roomId} is currently full` });
      }

      const playerName = data.playerName;

      const roomChannel = `room-${roomId}`;

      const player = {
        id: socket.id,
        name: playerName,
        points: 0,
        isReady: false,
        isHost: data.isHost || false
      };

      room.players.push(player);

      socket.join(roomChannel);
      socket.roomId = roomId;

      console.log(`${playerName} joined room: ${room.name}`);

      // Send room settings to the new player
      socket.emit('room:settings', room.settings);

      // Send current player list to all players in the room
      io.to(roomChannel).emit('playerList', room.players);

      // Send join message to chat
      io.to(roomChannel).emit('chat:newMessage', {
        player: 'System',
        text: `${playerName} has joined the room`,
        timestamp: new Date(),
        type: 'system'
      });

      // informuj gracza ze dolaczyl
      socket.emit('rooms:joined', { room, player });

      // informuj graczy w pokoju o nowym graczu
      io.to(roomChannel).emit('rooms:playerJoined', {
        roomId,
        playerName,
        players: room.players
      });

      socket.emit('rooms:list', rooms);
      console.log(rooms);
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
      io.to(roomChannel).emit('chat:newMessage', {
        player: 'System',
        text: `${playerName} has left the room`,
        timestamp: new Date(),
        type: 'system'
      });
      
      // Check if room is empty and delete it if so
      if (room.players.length === 0) {
        rooms = rooms.filter(r => r.id !== roomId);
        console.log(`Room ${roomId} deleted because it's empty`);
      }
      
      // informuj gracza ze wyszedl
      socket.emit('rooms:left', { room, playerName });
      
      // informuj graczy w pokoju ze inny gracz wyszedl
      io.to(roomChannel).emit('rooms:playerLeft', {
        roomId,
        playerName,
        players: room.players
      });

      socket.roomId = null;
      console.log(`${playerName} left room: ${room.name}`);

      // Broadcast updated room list to all clients
      io.emit('rooms:list', rooms);
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
            io.to(`room-${roomId}`).emit('chat:newMessage', {
              player: 'System',
              text: `${player.name} has disconnected`,
              timestamp: new Date(),
              type: 'system'
            });

            // Check if room is empty and delete it if so
            if (room.players.length === 0) {
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
            io.emit('rooms:list', rooms);
          }
        }
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
        roomCode: roomCode,
        playersLimit: roomData.playersLimit || 4,
        rounds: roomData.rounds || 5,
        powerUps: roomData.powerUps || 2,
        roundDuration: roomData.answerTime || 30,
        visibility: roomData.visibility || 'public'
      }
    };

    console.log('Created new room object:', JSON.stringify(newRoom, null, 2));

    rooms = [...rooms, newRoom];
    console.log('Current rooms after adding new room:', JSON.stringify(rooms, null, 2));

    if (ioInstance) {
      console.log('Broadcasting updated room list to all clients');
      ioInstance.emit('rooms:list', rooms);
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
    ioInstance.emit('rooms:list', rooms);
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