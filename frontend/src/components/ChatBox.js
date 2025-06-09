import React, { useEffect, useRef } from 'react';

const ChatBox = ({ messages, newMessage, setNewMessage, onSendMessage }) => {
  const chatContainerRef = useRef(null);

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = chatContainerRef.current;
      const isScrolledNearBottom = scrollHeight - clientHeight - scrollTop < 100;
      
      if (isScrolledNearBottom) {
        chatContainerRef.current.scrollTop = scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="w-1/6 bg-gray-100 flex flex-col">
      <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`p-2 rounded shadow ${
                msg.type === 'system' 
                  ? msg.text.includes('joined')
                    ? 'bg-green-50 text-green-600 italic'
                    : msg.text.includes('left') || msg.text.includes('disconnected')
                      ? 'bg-red-50 text-red-600 italic'
                      : 'bg-gray-100 text-gray-600 italic'
                  : 'bg-white'
              }`}
            >
              {msg.type === 'system' ? (
                <div>{msg.text}</div>
              ) : (
                <>
                  <span className="font-bold">{msg.player}: </span>
                  <span>{msg.text}</span>
                </>
              )}
              <div className="text-xs text-gray-500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={onSendMessage} className="p-4 bg-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded border"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox; 