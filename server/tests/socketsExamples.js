import { io } from 'socket.io-client';

// Connect to the server
const socket = io('http://localhost:8080');


// Listen for events
socket.on('connect', () => {
  console.log('Connected to server');
  console.log(socket.id);
  // Get the list of rooms
  socket.on('rooms:list', (rooms) => {
    console.log('Lista pokojów:', rooms);
    // Update your UI with the list of rooms
  });

  // Handle successful room join
  socket.on('rooms:joined', (arg) => {
    console.log(`dolaczyles do pokoju ${arg.room.name}`);
    // Update your UI to show the room view
  });

  // Handle new players joining the room
  socket.on('rooms:playerJoined', ({ roomId, playerName, players }) => {
    console.log(`${playerName} dolaczyl do pokoju ${roomId}`);
    // Update your UI with the new player list
  });

  socket.on('rooms:left', (args) => {
    console.log(`wyszedles z pokoju ${args.room.name}`);
  })
  // Handle players leaving the room
  socket.on('playerLeft', ({ roomId, playerName, players }) => {
    console.log(`${playerName} wyszedl z pokoju ${roomId}`);
    // Update your UI with the new player list
  });

  // Handle errors
  socket.on('error', ({ message }) => {
    console.error('Socket error:', message);
    // Show error message to user
  });
});

const roomId = 1;
const examplePlayerName = 'testowy bandito';

// Join a room
function joinRoom(roomId, playerName) {
  socket.emit('rooms:join', { roomId, playerName });
}

// Leave the current room
function leaveRoom(roomId, playerName) {
  socket.emit('rooms:leave', { roomId, playerName });
}

joinRoom(roomId, examplePlayerName);

leaveRoom(roomId, examplePlayerName);