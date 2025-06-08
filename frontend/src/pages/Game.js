import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socketService from '../services/socketService';
import PlayerList from '../components/PlayerList';
import ChatBox from '../components/ChatBox';
import GameContent from '../components/GameContent';

const Game = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [cars, setCars] = useState([]);

  useEffect(() => {
    // Listen for player updates
    socketService.socket?.on('playerList', (updatedPlayers) => {
      console.log('Game received playerList update:', updatedPlayers);
      const sortedPlayers = [...updatedPlayers].sort((a, b) => b.points - a.points);
      setPlayers(sortedPlayers);
    });

    // Listen for player left event
    socketService.socket?.on('rooms:playerLeft', ({ playerName, players: updatedPlayers }) => {
      console.log('Player left:', playerName, 'Updated players:', updatedPlayers);
      const sortedPlayers = [...updatedPlayers].sort((a, b) => b.points - a.points);
      setPlayers(sortedPlayers);
    });

    // Listen for player joined event
    socketService.socket?.on('rooms:playerJoined', ({ playerName, players: updatedPlayers }) => {
      console.log('Player joined:', playerName, 'Updated players:', updatedPlayers);
      const sortedPlayers = [...updatedPlayers].sort((a, b) => b.points - a.points);
      setPlayers(sortedPlayers);
    });

    // Listen for chat messages
    socketService.socket?.on('chat:newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Request current player list when component mounts
    socketService.socket?.emit('rooms:join', { 
      roomId: parseInt(roomId),
      playerName: socketService.getCurrentUser()?.name,
      isHost: socketService.getCurrentUser()?.isHost || false,
      rejoin: true // Add this flag to indicate we're rejoining after game start
    });

    return () => {
      socketService.socket?.off('playerList');
      socketService.socket?.off('rooms:playerLeft');
      socketService.socket?.off('rooms:playerJoined');
      socketService.socket?.off('chat:newMessage');
    };
  }, [roomId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socketService.socket?.emit('chat:message', {
        roomId: parseInt(roomId),
        message: newMessage.trim(),
        playerName: socketService.getCurrentUser()?.name
      });
      setNewMessage('');
    }
  };

  return (
    <div className="h-screen flex">
      <PlayerList players={players} showReadyStatus={false} />
      <GameContent 
      cars={cars}
      setCars={setCars}/>
      <ChatBox 
        messages={messages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default Game;
