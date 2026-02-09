import React, { useState, useEffect } from 'react';

const DiscordHint = () => {
    const [isVisible, setIsVisible] = useState(() => {
        return localStorage.getItem('discordHintClosed') !== 'true';
    });

    if (!isVisible) return null;

    return (
        <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 z-50">
            <div className="relative hand-drawn-panel p-4 bg-[var(--bg-color)] text-center animate-bounce-slight">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        localStorage.setItem('discordHintClosed', 'true');
                        setIsVisible(false);
                    }}
                    className="absolute -top-3.5 -right-3.5 w-9 h-9 flex items-center justify-center bg-[var(--bg-color)] border-2 border-[var(--text-color)] rounded-full hover:bg-[var(--text-color)] hover:text-[var(--bg-color)] transition-colors z-10"
                    aria-label="Close hint"
                >
                    <span className="text-3xl font-bold leading-none pb-1">&times;</span>
                </button>

                <p className="text-sm font-bold m-0 leading-tight">
                    Join us to report bugs, catch updates, and more!
                </p>

                {/* CSS Arrow pointing down */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-[var(--text-color)]"></div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-[3px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[var(--bg-color)]"></div>
            </div>
        </div>
    );
};

export default DiscordHint;
