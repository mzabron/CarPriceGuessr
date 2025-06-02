# Socket.io Events Documentation

## Room Management Events

### Client → Server Events

#### rooms:join
Join a specific room.

**Payload:**
```json
{
  "roomId": 1,
  "playerName": "Player1"
}
```

#### rooms:leave
Leave the current room.

**Payload:**
```json
{
  "roomId": 1,
  "playerName": "Player1"
}
```

### Server → Client Events

#### rooms:list
Emitted when a client connects or when room data changes. Contains a list of all available rooms.

**Payload:**
```json
[
  {
    "id": 1,
    "name": "Room 1",
    "playersLimit": 4,
    "players": [
      {
        "id": "socket-id-123",
        "name": "Player1"
      }
    ]
  },
  {
    "id": 2,
    "name": "Room 2",
    "playersLimit": 4,
    "players": []
  }
]
```

#### rooms:joined
Emitted to a client after successfully joining a room.

**Payload:**
```json
{
  "room": {
    "id": 1,
    "name": "Room 1",
    "playersLimit": 4,
    "players": [
      {
        "id": "socket-id-123",
        "name": "Player1"
      }
    ]
  },
  "player": {
    "id": "socket-id-123",
    "name": "Player1"
  }
}
```

#### rooms:playerJoined
Emitted to all clients in a room when a new player joins.

**Payload:**
```json
{
  "roomId": 1,
  "playerName": "Player2",
  "players": [
    {
      "id": "socket-id-123",
      "name": "Player1"
    },
    {
      "id": "socket-id-456",
      "name": "Player2"
    }
  ]
}
```

#### rooms:left
Emitted to a client after successfully leaving a room.

**Payload:**
```json
{
  "room": {
    "id": 1,
    "name": "Room 1",
    "playersLimit": 4,
    "players": [
      {
        "id": "socket-id-456",
        "name": "Player2"
      }
    ]
  },
  "playerName": "Player1"
}
```

#### rooms:playerLeft
Emitted to all clients in a room when a player leaves.

**Payload:**
```json
{
  "roomId": 1,
  "playerName": "Player1",
  "players": [
    {
      "id": "socket-id-456",
      "name": "Player2"
    }
  ]
}
```

#### error
Emitted when an error occurs during Socket.io operations.

**Payload:**
```json
{
  "message": "Room ID is required"
}
```

## Client Implementation Example

```javascript
import { io } from 'socket.io-client';

// Connect to the server
const socket = io('http://localhost:8080');

// Listen for events
socket.on('connect', () => {
  console.log('Connected to server');
  
  // Get the list of rooms
  socket.on('rooms:list', (rooms) => {
    console.log('Available rooms:', rooms);
    // Update your UI with the list of rooms
  });
  
  // Handle successful room join
  socket.on('rooms:joined', ({ room, player }) => {
    console.log(`Joined room: ${room.name} as ${player.name}`);
    // Update your UI to show the room view
  });
  
  // Handle new players joining the room
  socket.on('rooms:playerJoined', ({ roomId, playerName, players }) => {
    console.log(`Player ${playerName} joined room ${roomId}`);
    // Update your UI with the new player list
  });
  
  // Handle room left event
  socket.on('rooms:left', ({ room, playerName }) => {
    console.log(`Left room: ${room.name}`);
    // Update your UI to show the room selection view
  });
  
  // Handle players leaving the room
  socket.on('rooms:playerLeft', ({ roomId, playerName, players }) => {
    console.log(`Player ${playerName} left room ${roomId}`);
    // Update your UI with the new player list
  });
  
  // Handle errors
  socket.on('error', ({ message }) => {
    console.error('Socket error:', message);
    // Show error message to user
  });
});

// Join a room
function joinRoom(roomId, playerName) {
  socket.emit('rooms:join', { roomId, playerName });
}

// Leave the current room
function leaveRoom(roomId, playerName) {
  socket.emit('rooms:leave', { roomId, playerName });
}
```
