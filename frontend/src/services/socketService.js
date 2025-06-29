import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.currentUser = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io('https://api-tlarysz.lab.kis.agh.edu.pl', {
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
    if (!this.socket) return;
    
    const playerName = this.currentUser ? this.currentUser.name : `Guest_${Math.floor(Math.random() * 1000)}`;
    this.socket.emit('rooms:join', { 
      roomId,
      playerName,
      isHost: this.currentUser?.isHost || false
    });
  }

  leaveRoom(roomId) {
    if (!this.socket) return;
    
    const playerName = this.currentUser ? this.currentUser.name : null;
    this.socket.emit('rooms:leave', { 
      roomId,
      playerName
    });
  }

  getRoomsList() {
    if (!this.socket) return;
    this.socket.emit('rooms:list');
  }

  // Event listeners setup
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  // Event listeners
  onRoomJoined(callback) {
    if (!this.socket) return;
    this.socket.on('rooms:joined', callback);
  }

  onPlayerJoined(callback) {
    if (!this.socket) return;
    this.socket.on('rooms:playerJoined', callback);
  }

  onPlayerLeft(callback) {
    if (!this.socket) return;
    this.socket.on('rooms:playerLeft', callback);
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