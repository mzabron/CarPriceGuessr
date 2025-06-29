const API_URL = 'https://api-tlarysz.lab.kis.agh.edu.pl';

class ApiService {
  async createRoom(roomConfig) {
    try {
      console.log('Sending room creation request with config:', roomConfig);
      
      const requestBody = {
        roomName: roomConfig.roomName,
        playersLimit: roomConfig.maxPlayers,
        visibility: roomConfig.visibility,
        rounds: roomConfig.rounds,
        powerUps: roomConfig.powerUps,
        answerTime: roomConfig.answerTime
      };
      
      console.log('Formatted request body:', requestBody);

      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Room creation response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Room creation failed:', errorData);
        if (errorData.errors) {
          throw { errors: errorData.errors };
        }
        throw new Error(response.status === 404 ? 'Room creation endpoint not found' : 'Failed to create room');
      }

      const data = await response.json();
      console.log('Room creation successful:', data);
      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async getRooms() {
    try {
      const response = await fetch(`${API_URL}/api/rooms`);
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  }

  async getCars() {
    try {
      const response = await fetch(`${API_URL}/api/cars`);
      if (!response.ok) {
        throw new Error('Failed to fetch cars');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching cars:', error);
      throw error;
    }
  }
}

export default new ApiService(); 