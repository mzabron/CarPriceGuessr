
const rooms = [
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
]


// socket handlers
const setupRoomSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id);

    // wylistuj pokoje
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

// fallback methods
exports.createRoom = (req, res) => {
  const { roomName } = req.body;

  if (!roomName) {
    return res.status(400).json({ error: 'Room name is required' });
  }

  res.status(201).json({ message: `Room '${roomName}' created successfully` });
}

exports.getRooms = (req, res) => {
  res.json(rooms);
}

exports.deleteRoom = (req, res) => {
  const { id } = req.params;
  const roomIndex = rooms.findIndex(room => room.id === parseInt(id));

  if (roomIndex === -1) {
    return res.status(404).json({ message: 'Room not found' });
  }

  rooms.splice(roomIndex, 1);
  res.status(204).send();
}