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
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(response.status === 404 ? 'Room creation endpoint not found' : 'Failed to create room');
      }

      const data = await response.json();
      return data; // Return the raw response from server
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

  // Add more API methods as needed
}

export default new ApiService(); 