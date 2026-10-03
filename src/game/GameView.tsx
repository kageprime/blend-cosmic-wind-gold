import { Compass, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DIRS, type Dir } from "./iso";
import { bootGame, type GameHandle, type HudSnap } from "./engine";

const DIR_LABEL: Record<Dir, string> = {
  n: "N",
  ne: "NE",
  e: "E",
  se: "SE",
  s: "S",
  sw: "SW",
  w: "W",
  nw: "NW",
};

const idleHud: HudSnap = {
  phase: "title",
  embers: 0,
  goal: 6,
  dir: "se",
  health: 3,
  moving: false,
};

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const [hud, setHud] = useState<HudSnap>(idleHud);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atlas, setAtlas] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dead = false;
    bootGame(canvas, (snap) => {
      if (!dead) setHud(snap);
    })
      .then((h) => {
        if (dead) {
          h.destroy();
          return;
        }
        handleRef.current = h;
        setReady(true);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load sprites");
      });
    return () => {
      dead = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!atlas) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % 8), 120);
    return () => window.clearInterval(id);
  }, [atlas]);

  const playing = hud.phase === "play";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full touch-none"
        aria-label="Ashen Vale isometric meadow"
      />

      {hud.phase !== "title" && (
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex items-center gap-3 rounded-[20px] border border-border bg-surface/90 px-4 py-3">
            <div>
              <p className="font-display text-lg leading-tight tracking-tight">Ashen Vale</p>
              <p className="text-xs text-muted">
                Embers {hud.embers}/{hud.goal}
              </p>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <CompassRose dir={hud.dir} />
            <Button
              variant="subtle"
              size="icon"
              aria-label="Eight-direction atlas"
              onClick={() => setAtlas((v) => !v)}
            >
              <Compass className="size-4" />
            </Button>
            <Button
              variant="subtle"
              size="icon"
              aria-label={playing ? "Pause" : "Resume"}
              onClick={() =>
                playing ? handleRef.current?.pause() : handleRef.current?.resume()
              }
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
          </div>
        </header>
      )}

      {hud.phase !== "title" && (
        <div className="pointer-events-none absolute bottom-4 left-4 flex gap-1.5 pb-[env(safe-area-inset-bottom)]">
          {Array.from({ length: 3 }, (_, i) => (
            <span
              key={i}
              className={`size-2.5 rounded-full ${i < hud.health ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </div>
      )}

      {hud.phase === "play" && (
        <p className="pointer-events-none absolute bottom-4 right-4 hidden max-w-[14rem] text-right text-xs text-muted sm:block">
          WASD or arrows move in eight directions. P pauses. Drag left on touch.
        </p>
      )}

      {hud.phase === "title" && (
        <div className="absolute inset-0 flex items-end justify-center bg-bg/45 p-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:items-center">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Eight-direction isometric
            </p>
            <h1 className="mt-2 font-display text-5xl leading-[0.95] tracking-tight">
              Ashen Vale
            </h1>
            <p className="mt-3 max-w-sm text-sm text-muted">
              Walk Lyra on a mossy ruin meadow. Movement is true 8-way: every
              compass point has its own walk cycle.
            </p>
            {error ? (
              <p className="mt-4 text-sm text-danger">{error}</p>
            ) : (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  disabled={!ready}
                  onClick={() => handleRef.current?.start()}
                >
                  Start
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => setAtlas(true)}
                >
                  View sprites
                </Button>
              </div>
            )}
            <p className="mt-4 text-xs text-muted">
              Keyboard WASD / arrows. Touch: drag on the left side.
            </p>
          </div>
        </div>
      )}

      {hud.phase === "paused" && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/50 p-6">
          <div className="w-full max-w-sm rounded-[24px] border border-border bg-surface p-6">
            <h2 className="font-display text-3xl">Paused</h2>
            <p className="mt-2 text-sm text-muted">The meadow holds still.</p>
            <div className="mt-5 flex gap-3">
              <Button onClick={() => handleRef.current?.resume()}>Resume</Button>
              <Button variant="ghost" onClick={() => handleRef.current?.restart()}>
                Restart
              </Button>
            </div>
          </div>
        </div>
      )}

      {hud.phase === "win" && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/50 p-6">
          <div className="w-full max-w-sm rounded-[24px] border border-border bg-surface p-6">
            <h2 className="font-display text-3xl">Vale lit</h2>
            <p className="mt-2 text-sm text-muted">
              All six embers sit with you. The path still winds if you want to walk it again.
            </p>
            <Button className="mt-5" onClick={() => handleRef.current?.restart()}>
              Walk again
            </Button>
          </div>
        </div>
      )}

      {atlas && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-bg/70 p-4 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-auto rounded-[28px] border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-3xl leading-none">Lyra — 8 dir</h2>
                <p className="mt-1 text-sm text-muted">
                  Walk cycle, eight compass points. Frame {frame + 1} of 8.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setAtlas(false)}>
                Close
              </Button>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {DIRS.map((d) => (
                <figure
                  key={d}
                  className={`flex flex-col items-center rounded-[16px] border bg-bg p-2 ${
                    d === hud.dir ? "border-accent" : "border-border"
                  }`}
                >
                  <img
                    src={`/sprites/lyra/${d}/${frame}.png`}
                    alt={`${DIR_LABEL[d]} walk`}
                    className="h-24 w-24 object-contain"
                    crossOrigin="anonymous"
                  />
                  <figcaption className="mt-1 text-xs text-muted">
                    {DIR_LABEL[d]}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompassRose({ dir }: { dir: Dir }) {
  return (
    <div
      className="relative size-11 rounded-[var(--radius-md)] border border-border bg-surface-2"
      aria-label={`Facing ${DIR_LABEL[dir]}`}
    >
      {DIRS.map((d, i) => {
        const ang = (i * 45 * Math.PI) / 180;
        const x = 22 + Math.cos(ang) * 12;
        const y = 22 + Math.sin(ang) * 12;
        const on = d === dir;
        return (
          <span
            key={d}
            className={`absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              on ? "bg-accent" : "bg-border"
            }`}
            style={{ left: x, top: y }}
          />
        );
      })}
      <span className="absolute inset-0 grid place-items-center text-[10px] font-medium text-muted">
        {DIR_LABEL[dir]}
      </span>
    </div>
  );
}
