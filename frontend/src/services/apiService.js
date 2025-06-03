const API_URL = 'http://localhost:8080';

class ApiService {
  async createRoom(roomConfig) {
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomConfig.roomName,
          playersLimit: roomConfig.maxPlayers,
          isPrivate: roomConfig.visibility === 'private',
          rounds: roomConfig.rounds,
          powerUps: roomConfig.powerUps,
          answerTime: roomConfig.roundDuration
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          throw { errors: errorData.errors };
        }
        throw new Error(response.status === 404 ? 'Room creation endpoint not found' : 'Failed to create room');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async getRooms() {
    try {
      const response = await fetch(`${API_URL}/rooms`);
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  }

  async joinRoomByCode(code) {
    try {
      const response = await fetch(`${API_URL}/rooms/join-by-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Invalid room code');
      }

      return await response.json();
    } catch (error) {
      console.error('Error joining room by code:', error);
      throw error;
    }
  }

  // Add more API methods as needed
}

export default new ApiService(); 