import React from 'react';
import { useSfx } from '../services/soundService';

const AboutModal = ({ onClose }) => {
    const { play } = useSfx();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black bg-opacity-30"
                onClick={() => {
                    play('toggle');
                    onClose();
                }}
            />
            <div className="relative w-full max-w-lg hand-drawn-modal p-6 flex flex-col text-center">
                <button
                    onClick={() => { play('toggle'); onClose(); }}
                    className="absolute top-1 right-6 focus:outline-none font-bold text-5xl leading-none hover:opacity-70"
                    aria-label="Close"
                    title="Close"
                >
                    ×
                </button>
                <h2 className="text-2xl font-semibold mb-6">About CarPriceGuessr</h2>

                <div className="flex flex-col gap-6 px-2 text-[color:var(--text-color)]">
                    <div className="text-lg leading-relaxed flex flex-col gap-4 text-left">
                        <p>
                            I keep the game completely ad-free to make it more enjoyable. If you’re having fun, I’d really appreciate your support, it helps with hosting costs and lets me keep working on future projects.
                        </p>
                        <p className="font-semibold text-center mt-2">
                            Cheers and have fun playing!
                        </p>
                    </div>

                    <div className="border-t-2 pt-6 flex flex-col items-center gap-4" style={{ borderColor: 'var(--text-color)' }}>
                        <a
                            href="https://www.paypal.com/ncp/payment/H87P4B47J749Q"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => play('toggle')}
                            className="hand-drawn-btn px-6 py-3 text-lg font-bold inline-flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                            <span>Donate</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                            </svg>
                        </a>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;
