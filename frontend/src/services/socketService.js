import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.currentUser = null;
    this.currentRoomId = null;
  }

  connect() {
    if (!this.socket) {
      // Use env var for dev (points to backend), empty string for prod (nginx proxy)
      const socketUrl = process.env.REACT_APP_WS_URL || window.location.origin;
      this.socket = io(socketUrl, {
        path: '/ws',
      });
      
      this.setupEventListeners();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // Room events
  joinRoom(roomId) {
    if (!this.socket) {
      console.error('Cannot join room: Socket not connected');
      return;
    }
    
    const playerName = this.currentUser ? this.currentUser.name : `Guest_${Math.floor(Math.random() * 1000)}`;
    const preferredColorKey = this.currentUser?.preferredColor?.key === 'random'
      ? null
      : this.currentUser?.preferredColor?.key || null;
    console.log('Emitting rooms:join:', { roomId, playerName, preferredColorKey });
    
    this.currentRoomId = roomId;
    this.socket.emit('rooms:join', { 
      roomId,
      playerName,
      isHost: this.currentUser?.isHost || false,
      preferredColorKey
    });
  }

  leaveRoom(roomId) {
    if (!this.socket) return;
    
    const playerName = this.currentUser ? this.currentUser.name : null;
    this.socket.emit('rooms:leave', { 
      roomId,
      playerName
    });
    if (this.currentRoomId === roomId) {
      this.currentRoomId = null;
    }
  }

  getRoomsList() {
    if (!this.socket) return;
    this.socket.emit('rooms:list');
  }

  // Event listeners setup
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected! ID:', this.socket.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      console.error('Error details:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected. Reason:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Keep currentUser.id in sync once the server acknowledges join
    this.socket.on('rooms:joined', (data) => {
      try {
        const joinedPlayerId = data?.player?.id;
        const joinedRoomId = data?.room?.id || data?.roomId;
        if (joinedPlayerId) {
          if (!this.currentUser) this.currentUser = {};
          this.currentUser.id = joinedPlayerId;
        }
        if (joinedRoomId) {
          this.currentRoomId = joinedRoomId;
        }
      } catch (e) {
        // Non-fatal; just log
        console.warn('Failed to set currentUser.id from rooms:joined', e);
      }
    });
  }

  getCurrentRoomId() {
    return this.currentRoomId;
  }

  // Event listeners
  onRoomJoined(callback) {
    if (!this.socket) return;
    this.socket.on('rooms:joined', (data) => {
      console.log('Received rooms:joined:', data);
      callback(data);
    });
  }

  onPlayerJoined(callback) {
    if (!this.socket) return;
    this.socket.on('rooms:playerJoined', (data) => {
      console.log('Received rooms:playerJoined:', data);
      callback(data);
    });
  }

  onPlayerLeft(callback) {
    if (!this.socket) return;
    this.socket.on('rooms:playerLeft', (data) => {
      console.log('Received rooms:playerLeft:', data);
      callback(data);
    });
  }

  onRoomsList(callback) {
    if (!this.socket) return;
    this.socket.on('rooms:list', callback);
  }

  // Game events
  startGame() {
    if (!this.socket) return;
    this.socket.emit('game:startRound');
  }

  onGameStart(callback) {
    if (!this.socket) return;
    this.socket.on('game:startRound', callback);
  }

  // Cleanup listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();