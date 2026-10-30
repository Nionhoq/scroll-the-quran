import type { CSSProperties } from "react";

const particles = [
  { left: 9, top: 22, size: 2.2, x: 18, y: 30, duration: 23, delay: 4, opacity: 0.52 },
  { left: 18, top: 68, size: 1.6, x: 24, y: 18, duration: 27, delay: 17, opacity: 0.38 },
  { left: 27, top: 13, size: 1.4, x: 14, y: 26, duration: 25, delay: 9, opacity: 0.34 },
  { left: 34, top: 82, size: 2.5, x: 22, y: 34, duration: 31, delay: 22, opacity: 0.42 },
  { left: 46, top: 19, size: 1.3, x: 16, y: 22, duration: 29, delay: 13, opacity: 0.3 },
  { left: 54, top: 73, size: 1.8, x: 28, y: 20, duration: 26, delay: 3, opacity: 0.36 },
  { left: 63, top: 10, size: 2, x: 20, y: 28, duration: 32, delay: 25, opacity: 0.4 },
  { left: 72, top: 61, size: 1.4, x: 18, y: 32, duration: 24, delay: 16, opacity: 0.34 },
  { left: 82, top: 29, size: 2.6, x: 26, y: 20, duration: 30, delay: 7, opacity: 0.48 },
  { left: 91, top: 77, size: 1.7, x: 16, y: 28, duration: 28, delay: 20, opacity: 0.36 },
  { left: 13, top: 46, size: 1.2, x: 22, y: 18, duration: 33, delay: 11, opacity: 0.28 },
  { left: 88, top: 51, size: 1.3, x: 20, y: 24, duration: 25, delay: 2, opacity: 0.3 },
];

export function AmbientBackground() {
  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-aura ambient-aura-primary" />
      <div className="ambient-aura ambient-aura-secondary" />
      <div className="ambient-rays" />

      <svg className="ambient-pattern" width="100%" height="100%" focusable="false">
        <defs>
          <pattern id="ambient-eight-point-lattice" width="160" height="160" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="0.8">
              <path d="M80 16 92 48 124 36 112 68 144 80 112 92 124 124 92 112 80 144 68 112 36 124 48 92 16 80 48 68 36 36 68 48Z" />
              <path d="M80 48 103 57 112 80 103 103 80 112 57 103 48 80 57 57Z" />
              <path d="M80 0V16M144 80H160M80 144V160M0 80H16M0 0 36 36M124 36 160 0M124 124 160 160M0 160 36 124" />
              <circle cx="80" cy="80" r="4" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ambient-eight-point-lattice)" />
      </svg>

      <div className="ambient-particles">
        {particles.map((particle, index) => (
          <span
            key={index}
            className="ambient-particle"
            style={
              {
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDuration: `${particle.duration}s`,
                animationDelay: `-${particle.delay}s`,
                "--drift-x": `${particle.x}px`,
                "--drift-y": `${particle.y}px`,
                "--particle-opacity": particle.opacity,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="ambient-vignette" />
    </div>
  );
}
