// Store rooms in memory
let rooms = [
  {
    id: 1,
    name: 'Room 1',
    playersLimit: 4,
    // wczesniej zaalokowac wielkosc tablicy i nie mozna bedzie jej zmieniac?
    players: []
  },
  {
    id: 2,
    name: 'Room 2',
    playersLimit: 4,
    players: []
  }
];

let ioInstance = null;

// socket handlers
const setupRoomSocketHandlers = (io) => {
  ioInstance = io;
  io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id);

    // Send current rooms list to the connected client
    socket.emit('rooms:list', rooms);

    // handler do dolaczania do pokoju
    socket.on('rooms:join', (data) => {

      if (!data || !data.roomId) {
        return socket.emit('error', { message: 'Room ID is required' });
      }

      const roomId = typeof data.roomId === 'string' ? parseInt(data.roomId) : data.roomId;
      const room = rooms.find(r => r.id === roomId);

      if (room.players.length === room.playersLimit) {
        return socket.emit('error', { message: `Room with id ${roomId} is currently full` });
      }

      // mozna to dodac jesli bedzie mozliwosc gry jako guest
      // const playerName = data.playerName || `Guest-${socket.id.substring(0, 5)}`;
      const playerName = data.playerName;

      if (room) {

        const roomChannel = `room-${roomId}`;

        const player = {
          id: socket.id,
          name: playerName
        };

        room.players.push(player);

        socket.join(roomChannel);

        // Store the room ID on the socket object for convenience
        socket.roomId = roomId;

        console.log(`${playerName} joined room: ${room.name}`);

        // informuj gracza ze dolaczyl
        socket.emit('rooms:joined', { room, player });

        // informuj graczy w pokoju o nowym graczu
        io.to(roomChannel).emit('rooms:playerJoined', {
          roomId,
          playerName,
          players: room.players
        });

      } else {
        socket.emit('error', { message: `Room with id ${roomId} not found` });
        console.log(`Room with id ${roomId} not found`);
      }

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
      const roomChannel = `room-${roomId}`;
      // data should have player 
      const playerName = data.playerName;
      const playerIndex = room.players.findIndex(player => player.id === socket.id);
      if (playerIndex === -1) {
        return socket.emit('error', { message: `${playerName} is not in room with id: ${roomId}` });
      }
      if (room) {
        socket.leave(roomChannel);
        room.players.splice(playerIndex, 1);
        
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
      } else {
        socket.emit('error', { message: `Room with id ${roomId} not found` });
        console.log(`Room with id ${roomId} not found`);
      }
      socket.emit('rooms:list', rooms);
      console.log(rooms);
    });

    // handler do odlaczenia usera
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);

      // trzeba obsluzyc jesli gracz byl w pokoju 
      if (socket.roomId) {
        const roomId = socket.roomId;
        const room = rooms.find(r => r.id === roomId);

        if (room && room.players) {
          const playerIndex = room.players.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            const player = room.players.splice(playerIndex, 1)[0];

            // informuj pokoj ze uzytkownik wyszedl
            io.to(`room-${roomId}`).emit('rooms:playerLeft', {
              roomId,
              playerId: socket.id,
              playerName: player.name,
              players: room.players
            });
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

    // Validate required fields
    if (!roomData.roomName) {
      console.log('Room creation failed: name is required');
      return res.status(400).json({ error: 'Room name is required' });
    }

    // Create new room with all properties
    const newId = rooms.length > 0 ? Math.max(...rooms.map(r => r.id)) + 1 : 1;
    console.log('Generated new room ID:', newId);

    const newRoom = {
      id: newId,
      name: roomData.roomName,
      playersLimit: roomData.playersLimit || 4,
      rounds: roomData.rounds || 5,
      powerUps: roomData.powerUps || 2,
      answerTime: roomData.answerTime || 30,
      players: []
    };

    console.log('Created new room object:', JSON.stringify(newRoom, null, 2));

    // Add room to rooms array using immutable update
    rooms = [...rooms, newRoom];
    console.log('Current rooms after adding new room:', JSON.stringify(rooms, null, 2));

    // Emit updated room list to all connected clients
    if (ioInstance) {
      console.log('Broadcasting updated room list to all clients');
      ioInstance.emit('rooms:list', rooms);
    } else {
      console.warn('Socket.io instance not available - room list not broadcasted');
    }

    // Send response with created room
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