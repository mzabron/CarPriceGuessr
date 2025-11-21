/**
 * CarPriceGuessrLogo.js
 * Fix: Text Clipping issue resolved (Line-height & Padding adjustment)
 */
 export default function CarPriceGuessrLogo() {
  // --- Dimensions ---
  const width = 220; 
  const height = 125; 
  const cx = width / 2;      
  const cy = height - 10; 
  const radius = 90;      
  const needleLength = 85;

  // --- Colors ---
  const gradientColors = ["#94a3b8", "#3B82F6", "#22c55e"];
  const textColor = "#1e293b";

  // --- CSS Styles ---
  const styles = `
    .cpg-wrapper {
      display: flex;
      flex-direction: row;
      align-items: flex-end; 
      justify-content: center;
      font-family: sans-serif;
      gap: 15px;
      
      /* FIX 1: Add padding so the bottom edge isn't hard-clipped */
      padding-bottom: 5px; 
      overflow: visible;
    }

    .cpg-title {
      /* FIX 2: Adjusted margin to align visually with SVG baseline */
      margin: 0 0 8px 0; 
      
      position: relative;
      z-index: 0;
      
      font-size: 5rem; 
      font-weight: 900;
      text-align: right;
      letter-spacing: -3px;
      
      /* FIX 3: Increased line-height to prevent clipping */
      line-height: 0.9; 
      
      background: linear-gradient(90deg, ${gradientColors[0]}, ${gradientColors[1]}, ${gradientColors[2]});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      color: transparent;

      opacity: 0;
      transform: translateX(-20px);
      transition: opacity 0.8s ease 0.5s, transform 0.8s ease 0.5s;
    }
    .cpg-title.visible {
      opacity: 1;
      transform: translateX(0);
    }

    .cpg-arc {
      stroke-dasharray: 1000;
      stroke-dashoffset: 1000;
      transition: stroke-dashoffset 1s ease-out;
    }
    .cpg-arc.visible {
      stroke-dashoffset: 0;
    }

    .cpg-needle-rotate {
      transform: rotate(-90deg);
      transition: transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1s;
    }
    .cpg-needle-rotate.visible {
      transform: rotate(30deg);
    }

    .cpg-icons {
      opacity: 0;
      transition: opacity 0.8s ease-out 1.5s;
    }
    .cpg-icons.visible {
      opacity: 1;
    }
  `;

  // --- Helper: Generate Ticks ---
  let ticksHTML = '';
  const count = 24;
  const step = Math.PI / count;

  for (let i = 0; i <= count; i++) {
    const angle = Math.PI - (i * step);
    const isMajor = i % 4 === 0;
    const innerR = isMajor ? radius - 12 : radius - 6; 
    const outerR = radius;

    const x1 = cx + innerR * Math.cos(angle);
    const y1 = cy - innerR * Math.sin(angle);
    const x2 = cx + outerR * Math.cos(angle);
    const y2 = cy - outerR * Math.sin(angle);

    const color = isMajor ? "#94a3b8" : "#e2e8f0";
    const strokeW = isMajor ? 3 : 1;

    ticksHTML += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeW}" />`;
  }

  // --- Build DOM ---
  const container = document.createElement('div');
  container.className = 'cpg-wrapper';

  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  container.appendChild(styleTag);

  container.innerHTML += `<h1 class="cpg-title">CarPriceGuessr</h1>`;

  container.innerHTML += `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible; z-index: 1;">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${gradientColors[0]}" />
          <stop offset="50%" stop-color="${gradientColors[1]}" />
          <stop offset="100%" stop-color="${gradientColors[2]}" />
        </linearGradient>
        <filter id="shadow1" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.2"/>
        </filter>
      </defs>

      <g>${ticksHTML}</g>

      <g class="cpg-icons">
        <text x="${cx - 50}" y="${cy - 20}" fill="${gradientColors[0]}" font-size="32" font-weight="900" text-anchor="middle" dominant-baseline="middle" style="user-select: none;">?</text>
        <text x="${cx + 50}" y="${cy - 20}" fill="${gradientColors[2]}" font-size="32" font-weight="900" text-anchor="middle" dominant-baseline="middle" style="user-select: none;">$</text>
      </g>

      <path class="cpg-arc" d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}" fill="none" stroke="url(#grad1)" stroke-width="10" stroke-linecap="round" />

      <g transform="translate(${cx}, ${cy})">
        <g class="cpg-needle-rotate">
           <g filter="url(#shadow1)">
              <path d="M -4 0 L 0 -${needleLength} L 4 0 Z" fill="${textColor}" />
              <circle cx="0" cy="0" r="10" fill="${textColor}" />
              <circle cx="0" cy="0" r="4" fill="white" />
           </g>
        </g>
      </g>
    </svg>
  `;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const title = container.querySelector('.cpg-title');
      const arc = container.querySelector('.cpg-arc');
      const needle = container.querySelector('.cpg-needle-rotate');
      const icons = container.querySelector('.cpg-icons');

      if (title) title.classList.add('visible');
      if (arc) arc.classList.add('visible');
      if (needle) needle.classList.add('visible');
      if (icons) icons.classList.add('visible');
    });
  });

  return container;
}