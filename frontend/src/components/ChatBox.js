import React, { useEffect, useRef } from 'react';
import { useSfx } from '../services/soundService';

const ChatBox = ({ messages, newMessage, setNewMessage, onSendMessage, forceScrollTrigger = 0 }) => {
  const { play } = useSfx();
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom();
  }, []);

  // Auto-scroll chat when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = chatContainerRef.current;
      const isScrolledNearBottom = scrollHeight - clientHeight - scrollTop < 100;
      if (isScrolledNearBottom) {
        chatContainerRef.current.scrollTop = scrollHeight;
      }
    }
  }, [messages]);

  // Force scroll when trigger changes (e.g., on game start or history load)
  useEffect(() => {
    scrollToBottom();
  }, [forceScrollTrigger]);

  return (
    <div className="h-full w-48 sm:w-52 md:w-60 lg:w-68 xl:w-72 bg-transparent flex flex-col border-l-2 border-black">
      <div ref={chatContainerRef} className="flex-1 p-2 overflow-y-auto thin-scrollbar">
        <div className="space-y-1">
          {messages.map((msg, index) => {
            let textColorClass = 'text-black';
            let borderColorClass = 'border-black';
            let bgClass = 'bg-transparent';

            if (msg.type === 'system') {
              const lowerText = (msg.text || '').toLowerCase();
              // Check for disconnect/left messages first (before 'connected' to avoid false matches)
              if (lowerText.includes('left') || lowerText.includes('disconnected') || lowerText.includes('left the room')) {
                textColorClass = 'text-red-600';
                borderColorClass = 'border-red-600';
              } else if (lowerText.includes('joined') || lowerText.includes('connected')) {
                textColorClass = 'text-green-600';
                borderColorClass = 'border-green-600';
              } else {
                textColorClass = 'text-blue-600';
                borderColorClass = 'border-blue-600';
              }
              bgClass = 'bg-transparent font-bold border-2';
            } else if (msg.type === 'round') {
              bgClass = 'bg-transparent font-bold border-2';
            }

            return (
              <div
                key={index}
                className={`p-1.5 border rounded shadow-none text-xs sm:text-sm break-words ${borderColorClass} ${textColorClass} ${bgClass}`}
              >
                {msg.type === 'system' || msg.type === 'round' ? (
                  <div>{msg.text}</div>
                ) : (
                  <>
                    <span className="font-bold">{msg.player}: </span>
                    <span>{msg.text}</span>
                  </>
                )}
                <div className="text-xs opacity-50">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <form onSubmit={onSendMessage} className="p-2 bg-transparent border-t-2 border-black">
        <div className="flex space-x-1">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 hand-drawn-input text-sm"
          />
          <button
            type="submit"
            className="hand-drawn-btn px-3 py-1 text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;