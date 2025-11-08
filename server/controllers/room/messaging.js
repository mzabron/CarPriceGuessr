const { getIo, getRooms } = require('./state');

function sendSystemMessage(roomId, text, type = 'system') {
  const rooms = getRooms();
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;
  const message = { player: 'System', text, timestamp: new Date(), type };
  if (!room.chatHistory) room.chatHistory = [];
  room.chatHistory.push(message);
  const io = getIo();
  io?.to(`room-${roomId}`).emit('chat:newMessage', message);
}

module.exports = { sendSystemMessage };
