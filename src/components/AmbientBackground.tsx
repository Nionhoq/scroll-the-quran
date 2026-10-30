import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { FeelingId } from "@contracts/feelings";
import { lightIntensity, parallaxOffset, resolveScene } from "@/lib/scene";

// Dust motes caught in the light beam: position along the beam (0-100%), drift and timing.
const motes = [
  { at: 14, side: 38, size: 2.2, drift: 16, duration: 19, delay: 2 },
  { at: 22, side: 61, size: 1.5, drift: 22, duration: 24, delay: 9 },
  { at: 31, side: 47, size: 1.8, drift: 14, duration: 21, delay: 15 },
  { at: 40, side: 30, size: 1.3, drift: 18, duration: 27, delay: 5 },
  { at: 48, side: 56, size: 2.4, drift: 20, duration: 23, delay: 12 },
  { at: 57, side: 42, size: 1.4, drift: 12, duration: 26, delay: 19 },
  { at: 66, side: 64, size: 1.9, drift: 24, duration: 22, delay: 7 },
  { at: 75, side: 35, size: 1.2, drift: 16, duration: 29, delay: 14 },
  { at: 84, side: 52, size: 1.6, drift: 18, duration: 25, delay: 3 },
];

type Props = {
  /** Current ayah index; drives a gentle parallax between depth layers. */
  offset?: number;
  /** When reading from "How do you feel?", tints the scene for that session. */
  tint?: FeelingId;
  /** 0..1 through the feeling's ayahs (used by the gradually brightening tint). */
  progress?: number;
};

function currentHour() {
  return new Date().getHours();
}

/**
 * "Light through a mashrabiya": the eight-point lattice is a carved screen that light
 * passes through, projected onto a wall. Pure SVG + CSS, no images or canvas.
 */
export function AmbientBackground({ offset = 0, tint, progress = 0 }: Props) {
  const [hour, setHour] = useState(currentHour);
  const [paused, setPaused] = useState(false);

  // Re-check the clock each minute so the scene follows the day.
  useEffect(() => {
    const timer = setInterval(() => setHour(currentHour()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Pause all animation while the tab is hidden.
  useEffect(() => {
    const update = () => setPaused(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const { scene, tint: tintName } = useMemo(
    () => resolveScene({ hour, feeling: tint, search: typeof window === "undefined" ? "" : window.location.search }),
    [hour, tint],
  );

  const style = {
    "--intensity": lightIntensity(tintName, progress),
    "--p-far": `${parallaxOffset(offset, 4)}px`,
    "--p-mid": `${parallaxOffset(offset, 12)}px`,
    "--p-near": `${parallaxOffset(offset, 22)}px`,
  } as CSSProperties;

  return (
    <div
      className="scene"
      data-scene={scene}
      data-tint={tintName ?? undefined}
      data-paused={paused || undefined}
      style={style}
      aria-hidden="true"
      data-testid="scene"
    >
      <div className="scene-wall" />
      <div className="scene-glow" />

      <div className="scene-lattice-wrap">
        <svg className="scene-lattice" width="100%" height="100%" focusable="false">
          <defs>
            <pattern id="mashrabiya-lattice" width="120" height="120" patternUnits="userSpaceOnUse">
              <g className="scene-lattice-bars" fill="none" strokeWidth="9" strokeLinejoin="round">
                <path d="M60 12 69 36 93 27 84 51 108 60 84 69 93 93 69 84 60 108 51 84 27 93 36 69 12 60 36 51 27 27 51 36Z" />
                <path d="M60 36 77 43 84 60 77 77 60 84 43 77 36 60 43 43Z" />
                <path d="M60 0V12M108 60H120M60 108V120M0 60H12M0 0 27 27M93 27 120 0M93 93 120 120M0 120 27 93" />
              </g>
            </pattern>
            <radialGradient id="mashrabiya-pool" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="32%" stopColor="white" stopOpacity="0.72" />
              <stop offset="68%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <mask id="mashrabiya-mask">
              <rect width="100%" height="100%" fill="url(#mashrabiya-pool)" />
            </mask>
          </defs>
          <g mask="url(#mashrabiya-mask)">
            <rect width="100%" height="100%" className="scene-lattice-light" />
            <rect width="100%" height="100%" fill="url(#mashrabiya-lattice)" />
          </g>
        </svg>
      </div>

      <div className="scene-beam">
        {motes.map((mote, index) => (
          <span
            key={index}
            className="scene-mote"
            style={
              {
                left: `${mote.at}%`,
                top: `${mote.side}%`,
                width: `${mote.size}px`,
                height: `${mote.size}px`,
                animationDuration: `calc(${mote.duration}s * var(--speed))`,
                animationDelay: `-${mote.delay}s`,
                "--drift": `${mote.drift}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="scene-scrim" />
    </div>
  );
}
