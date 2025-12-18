// Facade module: re-export setup and REST handlers while delegating implementation to submodules.
const { setupRoomSocketHandlers } = require('./room/socketHandlers');
const { getRooms, setRooms } = require('./room/state');
const { getSafeRooms, getSafeRoom, generateRoomCode } = require('./room/utils');

exports.setupRoomSocketHandlers = setupRoomSocketHandlers;

// Room management methods
exports.createRoom = (req, res) => {
  try {
    const roomData = req.body;
    let rooms = getRooms();

    if (!roomData.roomName) {
      
      return res.status(400).json({ error: 'Room name is required' });
    }

  const newId = rooms.length > 0 ? Math.max(...rooms.map(r => r.id)) + 1 : 1;
  const roomCode = generateRoomCode(rooms);
    

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
        correctGuessThreshold: roomData.correctGuessThreshold || 5,
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

    

  rooms = [...rooms, newRoom];
  setRooms(rooms);

    const { getIo } = require('./room/state');
    const io = getIo();
    if (io) {
      io.emit('rooms:list', getSafeRooms(rooms));
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
    const rooms = getRooms();
    res.json(getSafeRooms(rooms));
  } catch (error) {
    console.error('Error in getRooms:', error);
    res.status(500).json({ error: 'Internal server error while fetching rooms' });
  }
};

exports.deleteRoom = (req, res) => {
  const { id } = req.params;
  let rooms = getRooms();
  const roomIndex = rooms.findIndex(room => room.id === parseInt(id));

  if (roomIndex === -1) {
    return res.status(404).json({ message: 'Room not found' });
  }

  rooms = rooms.filter(room => room.id !== parseInt(id));
  setRooms(rooms);
  const { getIo } = require('./room/state');
  const io = getIo();
  if (io) {
    io.emit('rooms:list', getSafeRooms(rooms));
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

  const rooms = getRooms();
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