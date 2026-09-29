import React from 'react'

export default function BackgroundDecoration() {
  return (
    <div className="bg-decoration" aria-hidden="true">
      {/* Glow Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Modern Wave & Grid SVG pattern */}
      <svg className="bg-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="1" />
          </pattern>
          <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="wave-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid-pattern)" />

        {/* Abstract Wavy Shapes */}
        <path
          d="M-100,120 C150,300 350,50 600,200 C850,350 1000,100 1200,250 L1200,0 L-100,0 Z"
          fill="url(#wave-grad-1)"
        />
        <path
          d="M-50,450 C200,320 450,550 750,400 C1050,250 1150,480 1300,380 L1300,1000 L-50,1000 Z"
          fill="url(#wave-grad-2)"
        />
      </svg>
    </div>
  )
}
