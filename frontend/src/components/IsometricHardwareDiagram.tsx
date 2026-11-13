import React from 'react';

export const IsometricHardwareDiagram: React.FC = () => {
  return (
    <div className="relative w-full aspect-[640/480] max-w-[620px] mx-auto select-none">
      {/* Ambient Radial Spotlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

      <svg
        viewBox="0 0 640 480"
        className="w-full h-full drop-shadow-2xl overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Intense Glow Filter for Shield & Lasers */}
          <filter id="arch-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="arch-deep-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="16" stdDeviation="10" flood-color="#000000" flood-opacity="0.85" />
          </filter>

          {/* Gradients */}
          <linearGradient id="shield-orange-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9a52" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          <linearGradient id="shield-orange-dark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="60%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>

          <linearGradient id="pedestal-metal-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#222938" />
            <stop offset="50%" stopColor="#141923" />
            <stop offset="100%" stopColor="#0b0e14" />
          </linearGradient>

          <linearGradient id="pedestal-metal-side" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e2430" />
            <stop offset="100%" stopColor="#080b10" />
          </linearGradient>

          <linearGradient id="laptop-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="laser-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff8c38" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* ========================================================
            1. FLOOR CIRCUIT TRACES (Radiating from central pedestal)
        ======================================================== */}
        <g stroke="url(#laser-line-grad)" strokeWidth="1.8" fill="none" opacity="0.85" filter="url(#arch-glow)">
          {/* Trace to Laptop 1 (Far Left) */}
          <path d="M 320 280 L 250 280 L 210 240 L 160 240" />
          {/* Trace to Laptop 2 (Front Center-Left) */}
          <path d="M 320 300 L 280 340 L 220 340 L 200 360" />
          {/* Trace to Tower Server (Back Left) */}
          <path d="M 360 220 L 320 180 L 320 150" />
          {/* Trace to Server Stack (Back Center) */}
          <path d="M 380 220 L 400 170 L 430 170" />
          {/* Trace to Blade Unit (Back Right) */}
          <path d="M 400 230 L 460 180 L 490 180" />
          {/* Trace to 4 Data Cubes (Middle Right) */}
          <path d="M 420 280 L 480 280 L 520 250" />
          {/* Trace to Bottom Right Bus */}
          <path d="M 400 310 L 470 360 L 540 360" />
        </g>

        {/* Circuit Intersection Glowing Dots */}
        <g fill="#fed7aa" filter="url(#arch-glow)">
          <circle cx="250" cy="280" r="2.5" />
          <circle cx="210" cy="240" r="2.5" />
          <circle cx="280" cy="340" r="2.5" />
          <circle cx="220" cy="340" r="2.5" />
          <circle cx="320" cy="180" r="2.5" />
          <circle cx="400" cy="170" r="2.5" />
          <circle cx="460" cy="180" r="2.5" />
          <circle cx="480" cy="280" r="2.5" />
          <circle cx="470" cy="360" r="2.5" />
        </g>

        {/* ========================================================
            2. PERIPHERAL HARDWARE (Isometric Laptops, Servers, Cubes)
        ======================================================== */}

        {/* LAPTOP 1: Top Left (Client Input App) */}
        <g transform="translate(130, 160)" className="hover:scale-105 transition-transform duration-300">
          {/* Screen Back */}
          <polygon points="20,0 60,20 60,55 20,35" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          {/* Screen Display */}
          <polygon points="22,3 58,21 58,52 22,34" fill="#090d16" />
          <polygon points="25,8 55,23 55,48 25,33" fill="#0f172a" stroke="#f97316" strokeWidth="0.8" opacity="0.6" />
          {/* Keyboard Base */}
          <polygon points="20,35 60,55 40,75 0,55" fill="url(#laptop-metal)" stroke="#475569" strokeWidth="1" />
          {/* Trackpad */}
          <polygon points="26,62 34,66 30,70 22,66" fill="#0f172a" />
        </g>

        {/* LAPTOP 2: Bottom Left (Authorized User Verification) */}
        <g transform="translate(135, 280)" className="hover:scale-105 transition-transform duration-300">
          {/* Screen Back */}
          <polygon points="20,0 60,20 60,55 20,35" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          {/* Screen Display */}
          <polygon points="22,3 58,21 58,52 22,34" fill="#090d16" />
          <polygon points="25,8 55,23 55,48 25,33" fill="#0f172a" stroke="#f97316" strokeWidth="0.8" opacity="0.6" />
          {/* Keyboard Base */}
          <polygon points="20,35 60,55 40,75 0,55" fill="url(#laptop-metal)" stroke="#475569" strokeWidth="1" />
          {/* Trackpad */}
          <polygon points="26,62 34,66 30,70 22,66" fill="#0f172a" />
        </g>

        {/* TOWER SERVER: Back Left */}
        <g transform="translate(300, 95)" className="hover:scale-105 transition-transform duration-300">
          {/* Top Face */}
          <polygon points="18,0 36,9 18,18 0,9" fill="#334155" stroke="#475569" strokeWidth="1" />
          {/* Left Face */}
          <polygon points="0,9 18,18 18,48 0,39" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          {/* Right Face */}
          <polygon points="18,18 36,9 36,39 18,48" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          {/* Indicator Light */}
          <circle cx="18" cy="24" r="1.5" fill="#f97316" filter="url(#arch-glow)" />
        </g>

        {/* SERVER RACK / BLADES: Back Center */}
        <g transform="translate(415, 115)" className="hover:scale-105 transition-transform duration-300">
          {/* Shelf 1 */}
          <g transform="translate(0, 0)">
            <polygon points="22,0 44,11 22,22 0,11" fill="#475569" stroke="#64748b" strokeWidth="0.8" />
            <polygon points="0,11 22,22 22,30 0,19" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
            <polygon points="22,22 44,11 44,19 22,30" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            <line x1="6" y1="16" x2="16" y2="21" stroke="#f97316" strokeWidth="1.5" />
          </g>
          {/* Shelf 2 */}
          <g transform="translate(0, 12)">
            <polygon points="22,0 44,11 22,22 0,11" fill="#334155" stroke="#475569" strokeWidth="0.8" />
            <polygon points="0,11 22,22 22,30 0,19" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
            <polygon points="22,22 44,11 44,19 22,30" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            <line x1="6" y1="16" x2="16" y2="21" stroke="#f97316" strokeWidth="1.5" />
          </g>
        </g>

        {/* HORIZONTAL SERVER UNIT: Back Right */}
        <g transform="translate(470, 95)" className="hover:scale-105 transition-transform duration-300">
          <polygon points="36,0 72,18 36,36 0,18" fill="#334155" stroke="#475569" strokeWidth="1" />
          <polygon points="0,18 36,36 36,54 0,36" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <polygon points="36,36 72,18 72,36 36,54" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <circle cx="10" cy="27" r="1.5" fill="#10b981" />
          <circle cx="16" cy="30" r="1.5" fill="#f97316" />
        </g>

        {/* 4 DATA TOKEN CUBES: Far Right */}
        <g transform="translate(495, 175)" className="hover:scale-105 transition-transform duration-300">
          {/* Cube 1 */}
          <g transform="translate(0, 0)">
            <polygon points="16,0 32,8 16,16 0,8" fill="#475569" stroke="#334155" strokeWidth="0.8" />
            <polygon points="0,8 16,16 16,32 0,24" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
            <polygon points="16,16 32,8 32,24 16,32" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
          </g>
          {/* Cube 2 */}
          <g transform="translate(18, 9)">
            <polygon points="16,0 32,8 16,16 0,8" fill="#64748b" stroke="#475569" strokeWidth="0.8" />
            <polygon points="0,8 16,16 16,32 0,24" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            <polygon points="16,16 32,8 32,24 16,32" fill="#334155" stroke="#334155" strokeWidth="0.8" />
          </g>
          {/* Cube 3 */}
          <g transform="translate(0, 20)">
            <polygon points="16,0 32,8 16,16 0,8" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />
            <polygon points="0,8 16,16 16,32 0,24" fill="#0a0f1d" stroke="#1e293b" strokeWidth="0.8" />
            <polygon points="16,16 32,8 32,24 16,32" fill="#1e293b" stroke="#1e293b" strokeWidth="0.8" />
          </g>
          {/* Cube 4 (Top Glowing Token) */}
          <g transform="translate(18, 29)">
            <polygon points="16,0 32,8 16,16 0,8" fill="#fb923c" stroke="#ea580c" strokeWidth="0.8" />
            <polygon points="0,8 16,16 16,32 0,24" fill="#ea580c" stroke="#c2410c" strokeWidth="0.8" />
            <polygon points="16,16 32,8 32,24 16,32" fill="#f97316" stroke="#9a3412" strokeWidth="0.8" />
          </g>
        </g>

        {/* ========================================================
            3. CENTRAL ISOMETRIC PEDESTAL WITH GLOWING RIM
        ======================================================== */}
        <g filter="url(#arch-deep-shadow)">
          {/* Lower Base Step */}
          <polygon
            points="380,210 470,255 380,300 290,255"
            fill="url(#pedestal-metal-top)"
            stroke="#334155"
            strokeWidth="1.5"
          />
          <polygon
            points="290,255 380,300 380,314 290,269"
            fill="url(#pedestal-metal-side)"
          />
          <polygon
            points="380,300 470,255 470,269 380,314"
            fill="#080b10"
          />

          {/* Elevated Upper Step */}
          <polygon
            points="380,225 450,260 380,295 310,260"
            fill="#1a202c"
            stroke="#475569"
            strokeWidth="1.2"
          />
          <polygon
            points="310,260 380,295 380,305 310,270"
            fill="#0f172a"
          />
          <polygon
            points="380,295 450,260 450,270 380,305"
            fill="#06090e"
          />

          {/* Glowing Orange Inner Circuit Ring */}
          <polygon
            points="380,235 435,262 380,289 325,262"
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            filter="url(#arch-glow)"
          />

          {/* Radiant Amber Pedestal Spire Ray */}
          <g stroke="#fb923c" strokeWidth="1.5" opacity="0.8" filter="url(#arch-glow)">
            <line x1="380" y1="240" x2="380" y2="284" />
            <line x1="335" y1="262" x2="425" y2="262" />
          </g>
        </g>

        {/* ========================================================
            4. 3D GLOWING ORANGE SHIELD WITH EMBOSSED LOCK
        ======================================================== */}
        <g className="animate-float origin-[380px_230px]">
          {/* Glow backdrop */}
          <path
            d="M 380 160 
               C 415 160, 428 180, 428 215 
               C 428 250, 398 270, 380 280 
               C 362 270, 332 250, 332 215 
               C 332 180, 345 160, 380 160 Z"
            fill="#ea580c"
            opacity="0.4"
            filter="url(#arch-glow)"
          />

          {/* Left Facet */}
          <path
            d="M 380 162 
               L 380 278 
               C 364 268, 334 248, 334 215 
               C 334 182, 346 162, 380 162 Z"
            fill="url(#shield-orange-dark)"
            stroke="#c2410c"
            strokeWidth="1"
          />

          {/* Right Facet */}
          <path
            d="M 380 162 
               L 380 278 
               C 396 268, 426 248, 426 215 
               C 426 182, 414 162, 380 162 Z"
            fill="url(#shield-orange-light)"
            stroke="#ea580c"
            strokeWidth="1"
          />

          {/* Center Spine Ridge Highlight */}
          <line x1="380" y1="162" x2="380" y2="278" stroke="#fde047" strokeWidth="1.2" />

          {/* 3D EMBOSSED PADLOCK INSIDE SHIELD */}
          <g transform="translate(366, 200)">
            {/* Padlock Shackle */}
            <path
              d="M 7 14 L 7 8 C 7 3.5 10.5 0 14 0 C 17.5 0 21 3.5 21 8 L 21 14"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
              filter="url(#arch-glow)"
            />
            {/* Padlock Body */}
            <rect
              x="2"
              y="13"
              width="24"
              height="20"
              rx="3"
              fill="#ffffff"
              filter="url(#arch-glow)"
            />
            {/* Keyhole */}
            <circle cx="14" cy="21" r="2.5" fill="#c2410c" />
            <path d="M 12.5 21 L 15.5 21 L 14.5 28 L 13.5 28 Z" fill="#c2410c" />
          </g>
        </g>
      </svg>
    </div>
  );
};

