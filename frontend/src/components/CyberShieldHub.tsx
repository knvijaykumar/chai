import React, { useState } from 'react';

interface NodeInfo {
  id: string;
  name: string;
  role: string;
  status: string;
  x: number;
  y: number;
}

const NODES: NodeInfo[] = [
  {
    id: 'ingestion',
    name: 'Prompt & Document Ingestion',
    role: 'Accepts raw text, PDFs, scans & JSON',
    status: 'Fail-Safe Boundary',
    x: 265,
    y: 135,
  },
  {
    id: 'cloud-ai',
    name: 'External AI Cloud Model',
    role: 'OpenAI, Anthropic, Gemini, DeepSeek',
    status: 'Sanitized Payloads Only',
    x: 455,
    y: 145,
  },
  {
    id: 'masking',
    name: 'Typed Placeholder Masking',
    role: 'Deterministic <AADHAAR_1>, <PAN_1>',
    status: 'Context Preserved',
    x: 525,
    y: 275,
  },
  {
    id: 'reinsertion',
    name: 'Local Reinsertion & Audit DB',
    role: 'Original values restored on perimeter',
    status: 'India DPDP Compliant',
    x: 450,
    y: 415,
  },
  {
    id: 'leak-guard',
    name: 'Outbound Leak Guard',
    role: 'Pre-flight Regex & Token Verification',
    status: 'Zero Leaks Permitted',
    x: 250,
    y: 410,
  },
  {
    id: 'pii-scanner',
    name: 'Local PII Detection Engine',
    role: 'Presidio + Fine-tuned GLiNER NER',
    status: '100% In-Memory Local',
    x: 160,
    y: 265,
  },
];

export const CyberShieldHub: React.FC = () => {
  const [activeNode, setActiveNode] = useState<NodeInfo | null>(null);

  return (
    <div className="relative w-full aspect-[680/540] max-w-[680px] mx-auto select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-80" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

      <svg
        viewBox="0 0 680 540"
        className="w-full h-full drop-shadow-2xl overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Ambient Glow Filter */}
          <filter id="orange-shield-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="16" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="intense-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur1" />
            <feGaussianBlur stdDeviation="24" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="laser-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="pedestal-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="16" stdDeviation="12" flood-color="#000000" flood-opacity="0.8" />
          </filter>

          {/* Gradients */}
          {/* Central Shield Facets */}
          <linearGradient id="shield-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff7828" />
            <stop offset="45%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>

          <linearGradient id="shield-right" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9a52" />
            <stop offset="40%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          <linearGradient id="shield-top-rim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          <linearGradient id="shield-bevel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>

          {/* Checkmark 3D Gradient */}
          <linearGradient id="checkmark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#ffedd5" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>

          {/* Central Pedestal Gradients */}
          <linearGradient id="center-ped-top" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2c3345" />
            <stop offset="50%" stopColor="#1a1f2c" />
            <stop offset="100%" stopColor="#0d111a" />
          </linearGradient>

          <linearGradient id="center-ped-side" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0a0d14" />
            <stop offset="25%" stopColor="#242b3a" />
            <stop offset="70%" stopColor="#181c26" />
            <stop offset="100%" stopColor="#070a10" />
          </linearGradient>

          <radialGradient id="center-ped-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#f97316" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#050811" stopOpacity="0" />
          </radialGradient>

          {/* Satellite Pedestal Gradients */}
          <linearGradient id="sat-ped-top" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#333b4e" />
            <stop offset="60%" stopColor="#1e232f" />
            <stop offset="100%" stopColor="#121620" />
          </linearGradient>

          <linearGradient id="sat-ped-side" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0d1017" />
            <stop offset="35%" stopColor="#2a3142" />
            <stop offset="75%" stopColor="#181c26" />
            <stop offset="100%" stopColor="#080b10" />
          </linearGradient>

          {/* Metallic 3D Object Gradients */}
          <linearGradient id="metal-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="40%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient id="metal-dark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="laser-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff8c38" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* ========================================================
            1. FLOOR AMBIENT REFLECTION & RADIATING LASER TRACES
        ======================================================== */}
        {/* Floor underglow under central pedestal */}
        <ellipse cx="340" cy="320" rx="140" ry="55" fill="url(#center-ped-glow)" />

        {/* Radiating Laser Circuit Rays from Center Pedestal */}
        <g filter="url(#laser-glow)">
          {/* Laser 1: to Top-Left Node (Code / Ingestion) */}
          <line
            x1="310"
            y1="262"
            x2="265"
            y2="145"
            stroke="url(#laser-stroke)"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="animate-laser"
          />
          {/* Laser 2: to Top-Right Node (Cloud AI) */}
          <line
            x1="370"
            y1="264"
            x2="455"
            y2="155"
            stroke="url(#laser-stroke)"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="animate-laser"
          />
          {/* Laser 3: to Far-Right Node (Masked Tokens) */}
          <line
            x1="400"
            y1="282"
            x2="525"
            y2="285"
            stroke="url(#laser-stroke)"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="animate-laser"
          />
          {/* Laser 4: to Bottom-Right Node (Local Reinsertion & Audit) */}
          <line
            x1="375"
            y1="300"
            x2="450"
            y2="415"
            stroke="url(#laser-stroke)"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="animate-laser"
          />
          {/* Laser 5: to Bottom-Left Node (Leak Guard) */}
          <line
            x1="305"
            y1="300"
            x2="250"
            y2="410"
            stroke="url(#laser-stroke)"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="animate-laser"
          />
          {/* Laser 6: to Far-Left Node (Local PII Scanner) */}
          <line
            x1="280"
            y1="282"
            x2="160"
            y2="275"
            stroke="url(#laser-stroke)"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="animate-laser"
          />
        </g>

        {/* Small bright pulse dots along the lasers */}
        <g fill="#fed7aa" filter="url(#laser-glow)">
          <circle cx="287" cy="203" r="2.5" className="animate-pulse" />
          <circle cx="412" cy="209" r="2.5" className="animate-pulse" />
          <circle cx="462" cy="283" r="2.5" className="animate-pulse" />
          <circle cx="412" cy="357" r="2.5" className="animate-pulse" />
          <circle cx="277" cy="355" r="2.5" className="animate-pulse" />
          <circle cx="220" cy="278" r="2.5" className="animate-pulse" />
        </g>

        {/* ========================================================
            2. SIX SATELLITE METALLIC PEDESTALS & 3D HARDWARE
        ======================================================== */}

        {/* SATELLITE 1: TOP-LEFT (Prompt & Ingestion Code Card) */}
        <g
          className="cursor-pointer transition-transform duration-300 hover:scale-105 origin-[265px_135px]"
          onMouseEnter={() => setActiveNode(NODES[0])}
          onMouseLeave={() => setActiveNode(null)}
        >
          {/* Pedestal Base Drop Shadow */}
          <ellipse cx="265" cy="150" rx="38" ry="16" fill="#000000" opacity="0.6" />
          {/* Pedestal Cylinder Wall */}
          <path
            d="M 227 138 A 38 16 0 0 0 303 138 L 303 148 A 38 16 0 0 1 227 148 Z"
            fill="url(#sat-ped-side)"
          />
          {/* Pedestal Cylinder Top */}
          <ellipse cx="265" cy="138" rx="38" ry="16" fill="url(#sat-ped-top)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="265" cy="138" rx="36" ry="14" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.6" />

          {/* 3D Browser / Code Window < / > */}
          <g transform="translate(242, 86)">
            {/* Window Card Shadow */}
            <rect x="0" y="4" width="46" height="34" rx="4" fill="#030712" opacity="0.6" />
            {/* Window Card Body */}
            <rect x="0" y="0" width="46" height="34" rx="4" fill="url(#metal-dark)" stroke="#475569" strokeWidth="1.2" />
            {/* Header Bar */}
            <rect x="0" y="0" width="46" height="9" rx="4" fill="#1e293b" />
            {/* Header Dots */}
            <circle cx="6" cy="4.5" r="1.5" fill="#ef4444" />
            <circle cx="11" cy="4.5" r="1.5" fill="#f59e0b" />
            <circle cx="16" cy="4.5" r="1.5" fill="#10b981" />
            {/* Code Brackets < / > */}
            <text
              x="23"
              y="24"
              fill="#f97316"
              fontSize="12"
              fontWeight="900"
              fontFamily="monospace"
              textAnchor="middle"
              filter="url(#laser-glow)"
            >
              &lt;/&gt;
            </text>
          </g>
        </g>

        {/* SATELLITE 2: TOP-RIGHT (Cloud AI Model & Padlock) */}
        <g
          className="cursor-pointer transition-transform duration-300 hover:scale-105 origin-[455px_145px]"
          onMouseEnter={() => setActiveNode(NODES[1])}
          onMouseLeave={() => setActiveNode(null)}
        >
          {/* Pedestal Base Drop Shadow */}
          <ellipse cx="455" cy="160" rx="38" ry="16" fill="#000000" opacity="0.6" />
          {/* Pedestal Cylinder Wall */}
          <path
            d="M 417 148 A 38 16 0 0 0 493 148 L 493 158 A 38 16 0 0 1 417 158 Z"
            fill="url(#sat-ped-side)"
          />
          {/* Pedestal Cylinder Top */}
          <ellipse cx="455" cy="148" rx="38" ry="16" fill="url(#sat-ped-top)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="455" cy="148" rx="36" ry="14" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.6" />

          {/* 3D Cloud + Padlock */}
          <g transform="translate(432, 98)">
            {/* 3D Cloud Base */}
            <path
              d="M 12 28 C 6 28 2 24 2 18 C 2 13 6 9 11 9 C 12 4 17 0 23 0 C 29 0 34 4 35 9 C 40 9 44 13 44 18 C 44 24 40 28 34 28 Z"
              fill="url(#metal-light)"
              stroke="#64748b"
              strokeWidth="1.2"
            />
            {/* Metallic Padlock Inside Cloud */}
            <rect x="18" y="16" width="11" height="9" rx="1.5" fill="#1e293b" stroke="#f97316" strokeWidth="1" />
            <path
              d="M 20.5 16 L 20.5 13 C 20.5 11.5 21.8 10 23.5 10 C 25.2 10 26.5 11.5 26.5 13 L 26.5 16"
              fill="none"
              stroke="#f97316"
              strokeWidth="1.5"
            />
            <circle cx="23.5" cy="20.5" r="1" fill="#fb923c" />
          </g>
        </g>

        {/* SATELLITE 3: FAR-RIGHT (3D Masked Token Cubes) */}
        <g
          className="cursor-pointer transition-transform duration-300 hover:scale-105 origin-[525px_275px]"
          onMouseEnter={() => setActiveNode(NODES[2])}
          onMouseLeave={() => setActiveNode(null)}
        >
          {/* Pedestal Base Drop Shadow */}
          <ellipse cx="525" cy="290" rx="38" ry="16" fill="#000000" opacity="0.6" />
          {/* Pedestal Cylinder Wall */}
          <path
            d="M 487 278 A 38 16 0 0 0 563 278 L 563 288 A 38 16 0 0 1 487 288 Z"
            fill="url(#sat-ped-side)"
          />
          {/* Pedestal Cylinder Top */}
          <ellipse cx="525" cy="278" rx="38" ry="16" fill="url(#sat-ped-top)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="525" cy="278" rx="36" ry="14" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.6" />

          {/* 3 Isometric Data Cubes Stacked */}
          <g transform="translate(509, 226)">
            {/* Cube 1 (Bottom Left) */}
            <g transform="translate(0, 16)">
              <polygon points="12,0 24,6 12,12 0,6" fill="#64748b" stroke="#334155" strokeWidth="0.8" />
              <polygon points="0,6 12,12 12,24 0,18" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />
              <polygon points="12,12 24,6 24,18 12,24" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
            </g>
            {/* Cube 2 (Bottom Right) */}
            <g transform="translate(14, 12)">
              <polygon points="12,0 24,6 12,12 0,6" fill="#94a3b8" stroke="#475569" strokeWidth="0.8" />
              <polygon points="0,6 12,12 12,24 0,18" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
              <polygon points="12,12 24,6 24,18 12,24" fill="#64748b" stroke="#1e293b" strokeWidth="0.8" />
            </g>
            {/* Cube 3 (Top Golden/Orange Glowing Token) */}
            <g transform="translate(7, 0)">
              <polygon points="12,0 24,6 12,12 0,6" fill="#fb923c" stroke="#ea580c" strokeWidth="0.8" />
              <polygon points="0,6 12,12 12,24 0,18" fill="#ea580c" stroke="#c2410c" strokeWidth="0.8" />
              <polygon points="12,12 24,6 24,18 12,24" fill="#f97316" stroke="#9a3412" strokeWidth="0.8" />
            </g>
          </g>
        </g>

        {/* SATELLITE 4: BOTTOM-RIGHT (Local Reinsertion & Audit Certificate) */}
        <g
          className="cursor-pointer transition-transform duration-300 hover:scale-105 origin-[450px_415px]"
          onMouseEnter={() => setActiveNode(NODES[3])}
          onMouseLeave={() => setActiveNode(null)}
        >
          {/* Pedestal Base Drop Shadow */}
          <ellipse cx="450" cy="430" rx="38" ry="16" fill="#000000" opacity="0.6" />
          {/* Pedestal Cylinder Wall */}
          <path
            d="M 412 418 A 38 16 0 0 0 488 418 L 488 428 A 38 16 0 0 1 412 428 Z"
            fill="url(#sat-ped-side)"
          />
          {/* Pedestal Cylinder Top */}
          <ellipse cx="450" cy="418" rx="38" ry="16" fill="url(#sat-ped-top)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="450" cy="418" rx="36" ry="14" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.6" />

          {/* 3D Document Sheet with Shield Seal */}
          <g transform="translate(434, 366)">
            {/* Document Sheet */}
            <rect x="0" y="0" width="28" height="36" rx="2.5" fill="url(#metal-light)" stroke="#64748b" strokeWidth="1" />
            {/* Text lines */}
            <line x1="5" y1="8" x2="16" y2="8" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
            <line x1="5" y1="13" x2="22" y2="13" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5" y1="17" x2="20" y2="17" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5" y1="21" x2="15" y2="21" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
            {/* Embedded Golden Audit Shield */}
            <g transform="translate(13, 20)">
              <path
                d="M 8 0 L 16 3 L 16 9 C 16 13 8 16 8 16 C 8 16 0 13 0 9 L 0 3 Z"
                fill="url(#shield-right)"
                stroke="#fed7aa"
                strokeWidth="0.8"
                filter="url(#laser-glow)"
              />
              <path d="M 5 8 L 7 10 L 11 6" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
            </g>
          </g>
        </g>

        {/* SATELLITE 5: BOTTOM-LEFT (Outbound Fail-Closed Leak Guard) */}
        <g
          className="cursor-pointer transition-transform duration-300 hover:scale-105 origin-[250px_410px]"
          onMouseEnter={() => setActiveNode(NODES[4])}
          onMouseLeave={() => setActiveNode(null)}
        >
          {/* Pedestal Base Drop Shadow */}
          <ellipse cx="250" cy="425" rx="38" ry="16" fill="#000000" opacity="0.6" />
          {/* Pedestal Cylinder Wall */}
          <path
            d="M 212 413 A 38 16 0 0 0 288 413 L 288 423 A 38 16 0 0 1 212 423 Z"
            fill="url(#sat-ped-side)"
          />
          {/* Pedestal Cylinder Top */}
          <ellipse cx="250" cy="413" rx="38" ry="16" fill="url(#sat-ped-top)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="250" cy="413" rx="36" ry="14" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.6" />

          {/* 3D Solid Metallic Padlock with PIN */}
          <g transform="translate(233, 362)">
            {/* Shackle */}
            <path
              d="M 8 17 L 8 10 C 8 4 12 0 17 0 C 22 0 26 4 26 10 L 26 17"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Lock Body */}
            <rect x="2" y="16" width="30" height="24" rx="3" fill="url(#metal-light)" stroke="#475569" strokeWidth="1.2" />
            {/* Keyhole / PIN Dots */}
            <rect x="5" y="27" width="24" height="8" rx="1.5" fill="#0f172a" />
            <circle cx="9" cy="31" r="1.5" fill="#f97316" filter="url(#laser-glow)" />
            <circle cx="14" cy="31" r="1.5" fill="#f97316" filter="url(#laser-glow)" />
            <circle cx="19" cy="31" r="1.5" fill="#f97316" filter="url(#laser-glow)" />
            <circle cx="24" cy="31" r="1.5" fill="#f97316" filter="url(#laser-glow)" />
          </g>
        </g>

        {/* SATELLITE 6: FAR-LEFT (Local PII Scanner & Inspection Grid) */}
        <g
          className="cursor-pointer transition-transform duration-300 hover:scale-105 origin-[160px_265px]"
          onMouseEnter={() => setActiveNode(NODES[5])}
          onMouseLeave={() => setActiveNode(null)}
        >
          {/* Pedestal Base Drop Shadow */}
          <ellipse cx="160" cy="280" rx="38" ry="16" fill="#000000" opacity="0.6" />
          {/* Pedestal Cylinder Wall */}
          <path
            d="M 122 268 A 38 16 0 0 0 198 268 L 198 278 A 38 16 0 0 1 122 278 Z"
            fill="url(#sat-ped-side)"
          />
          {/* Pedestal Cylinder Top */}
          <ellipse cx="160" cy="268" rx="38" ry="16" fill="url(#sat-ped-top)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="160" cy="268" rx="36" ry="14" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.6" />

          {/* 3D Data Table + Magnifying Scanner */}
          <g transform="translate(138, 218)">
            {/* Grid Table */}
            <rect x="0" y="0" width="34" height="28" rx="3" fill="url(#metal-dark)" stroke="#475569" strokeWidth="1" />
            <line x1="0" y1="9" x2="34" y2="9" stroke="#334155" strokeWidth="1" />
            <line x1="12" y1="0" x2="12" y2="28" stroke="#334155" strokeWidth="1" />
            <line x1="23" y1="0" x2="23" y2="28" stroke="#334155" strokeWidth="1" />
            {/* Magnifying Glass */}
            <g transform="translate(14, 10)">
              <circle cx="12" cy="12" r="10" fill="rgba(249, 115, 22, 0.15)" stroke="#fb923c" strokeWidth="2.5" />
              <line x1="19" y1="19" x2="28" y2="28" stroke="#ea580c" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="12" cy="12" r="4" fill="#f97316" filter="url(#laser-glow)" />
            </g>
          </g>
        </g>

        {/* ========================================================
            3. CENTRAL MAIN PEDESTAL (LARGE ELEVATED CYLINDER)
        ======================================================== */}
        <g filter="url(#pedestal-shadow)">
          {/* Central Pedestal Outer Ground Glow Ring */}
          <ellipse cx="340" cy="305" rx="84" ry="34" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.6" />

          {/* Central Pedestal Cylinder Wall */}
          <path
            d="M 266 288 A 74 30 0 0 0 414 288 L 414 302 A 74 30 0 0 1 266 302 Z"
            fill="url(#center-ped-side)"
          />

          {/* Central Pedestal Cylinder Top */}
          <ellipse
            cx="340"
            cy="288"
            rx="74"
            ry="30"
            fill="url(#center-ped-top)"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Inner Glowing Amber Inset Ring */}
          <ellipse
            cx="340"
            cy="288"
            rx="66"
            ry="26"
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            opacity="0.9"
            filter="url(#laser-glow)"
          />
        </g>

        {/* ========================================================
            4. 3D GLOWING ORANGE/AMBER SHIELD WITH CHECKMARK
        ======================================================== */}
        <g className="animate-float origin-[340px_230px]">
          {/* Neon Glow Aura behind the Shield */}
          <g filter="url(#intense-glow)">
            <path
              d="M 340 148 
                 C 385 148, 404 175, 404 220 
                 C 404 266, 365 292, 340 305 
                 C 315 292, 276 266, 276 220 
                 C 276 175, 295 148, 340 148 Z"
              fill="#ea580c"
              opacity="0.6"
            />
          </g>

          {/* 3D Shield Outer Bevel Rim */}
          <path
            d="M 340 148 
               C 388 148, 406 175, 406 220 
               C 406 268, 366 295, 340 308 
               C 314 295, 274 268, 274 220 
               C 274 175, 292 148, 340 148 Z"
            fill="url(#shield-bevel)"
          />

          {/* 3D Shield Left Facet (Darker orange for 3D depth) */}
          <path
            d="M 340 152 
               L 340 302 
               C 318 290, 280 264, 280 220 
               C 280 178, 296 152, 340 152 Z"
            fill="url(#shield-left)"
          />

          {/* 3D Shield Right Facet (Brighter orange highlight) */}
          <path
            d="M 340 152 
               L 340 302 
               C 362 290, 400 264, 400 220 
               C 400 178, 384 152, 340 152 Z"
            fill="url(#shield-right)"
          />

          {/* Shield Top Ridge / Rim Highlight */}
          <path
            d="M 340 152 
               C 375 152, 396 172, 398 210 
               C 394 170, 370 156, 340 156 
               C 310 156, 286 170, 282 210 
               C 284 172, 305 152, 340 152 Z"
            fill="url(#shield-top-rim)"
            opacity="0.9"
          />

          {/* Center Vertical Crease / Spine Highlight */}
          <line
            x1="340"
            y1="152"
            x2="340"
            y2="302"
            stroke="#fde047"
            strokeWidth="1.2"
            opacity="0.8"
          />

          {/* 3D EMBOSSED CHECKMARK (✓) */}
          {/* Checkmark Shadow */}
          <path
            d="M 314 224 L 332 244 L 372 196"
            fill="none"
            stroke="#7c2d12"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(1, 3)"
            opacity="0.8"
          />
          {/* Checkmark Body */}
          <path
            d="M 314 224 L 332 244 L 372 196"
            fill="none"
            stroke="url(#checkmark-grad)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#laser-glow)"
          />
          {/* Checkmark Inner Highlight */}
          <path
            d="M 314 224 L 332 244 L 372 196"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        </g>
      </svg>

      {/* Interactive Tooltip Card when hovering any node */}
      {activeNode && (
        <div
          className="absolute z-30 pointer-events-none transition-all duration-200 transform -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${(activeNode.x / 680) * 100}%`,
            top: `${(activeNode.y / 540) * 100}%`,
          }}
        >
          <div className="bg-[#0b1120]/95 border border-orange-500/50 shadow-2xl shadow-orange-500/20 backdrop-blur-md rounded-xl px-3.5 py-2 text-left min-w-[210px]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-white tracking-wide">
                {activeNode.name}
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              {activeNode.role}
            </p>
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
              <span className="text-orange-400 font-semibold">{activeNode.status}</span>
              <span className="text-slate-400">ACTIVE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

