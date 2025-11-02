import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.currentUser = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io('', {
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
    console.log('Emitting rooms:join:', { roomId, playerName });
    
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