import React, { useEffect, useRef } from 'react';

const ChatBox = ({ messages, newMessage, setNewMessage, onSendMessage, forceScrollTrigger = 0 }) => {
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
    <div className="h-full w-48 sm:w-52 md:w-60 lg:w-68 xl:w-72 bg-gray-100 flex flex-col border-l border-gray-300">
      <div ref={chatContainerRef} className="flex-1 p-2 overflow-y-auto thin-scrollbar">
        <div className="space-y-1">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-1.5 rounded shadow-sm text-xs sm:text-sm break-words ${
                msg.type === 'system'
                  ? msg.text.includes('joined')
                    ? 'bg-green-50 text-green-600 italic'
                    : msg.text.includes('left') || msg.text.includes('disconnected')
                      ? 'bg-red-50 text-red-600 italic'
                      : 'bg-gray-100 text-gray-600 italic'
                  : msg.type === 'round'
                    ? 'bg-blue-50 text-blue-600 italic font-semibold'
                    : 'bg-white'
              }`}
            >
              {msg.type === 'system' || msg.type === 'round' ? (
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
      <form onSubmit={onSendMessage} className="p-2 bg-gray-200">
        <div className="flex space-x-1">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-2 py-1 text-sm rounded border"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;