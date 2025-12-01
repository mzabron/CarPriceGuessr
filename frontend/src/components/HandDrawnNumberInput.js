import React, { useState, useRef } from 'react';

const HandDrawnNumberInput = ({
    name,
    value,
    onChange,
    min,
    max,
    className = '',
    placeholder,
    required,
    disabled
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const inputRef = useRef(null);

    const triggerChange = (newValue) => {
        if (onChange) {
            // Create a synthetic event
            const syntheticEvent = {
                target: {
                    name,
                    value: newValue,
                    type: 'number'
                }
            };
            onChange(syntheticEvent);
        }
    };

    const handleIncrement = (e) => {
        e.preventDefault(); // Prevent form submission
        if (disabled) return;

        let currentVal = value === '' ? 0 : Number(value);
        if (isNaN(currentVal)) currentVal = 0;

        let newVal = currentVal + 1;
        if (max !== undefined && newVal > Number(max)) newVal = Number(max);

        triggerChange(newVal);
    };

    const handleDecrement = (e) => {
        e.preventDefault(); // Prevent form submission
        if (disabled) return;

        let currentVal = value === '' ? 0 : Number(value);
        if (isNaN(currentVal)) currentVal = 0;

        let newVal = currentVal - 1;
        if (min !== undefined && newVal < Number(min)) newVal = Number(min);

        triggerChange(newVal);
    };

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <input
                ref={inputRef}
                type="number"
                name={name}
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                className={`${className} pr-8`} // Add padding for arrows
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                style={{
                    appearance: 'textfield',
                    MozAppearance: 'textfield',
                    WebkitAppearance: 'none'
                }}
            />

            {/* Custom Arrows Container */}
            <div
                className={`absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity duration-200 ${isHovered && !disabled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                <button
                    type="button"
                    onClick={handleIncrement}
                    className="hover:scale-110 transition-transform focus:outline-none"
                    tabIndex="-1"
                    aria-label="Increase"
                >
                    <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 7C1 7 5 2 7 1C9 2 13 7 13 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={handleDecrement}
                    className="hover:scale-110 transition-transform focus:outline-none"
                    tabIndex="-1"
                    aria-label="Decrease"
                >
                    <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1C1 1 5 6 7 7C9 6 13 1 13 1" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Hide default spinners */}
            <style jsx>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>
        </div>
    );
};

export default HandDrawnNumberInput;
