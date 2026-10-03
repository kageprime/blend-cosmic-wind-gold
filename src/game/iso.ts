export const TILE_W = 110;
export const TILE_H = 55;

export const DIRS = ["e", "se", "s", "sw", "w", "nw", "n", "ne"] as const;
export type Dir = (typeof DIRS)[number];

export function worldToScreen(x: number, y: number) {
  return {
    sx: (x - y) * (TILE_W / 2),
    sy: (x + y) * (TILE_H / 2),
  };
}

export function screenToWorld(sx: number, sy: number) {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return { x: (b + a) / 2, y: (b - a) / 2 };
}

/** Screen-space 8-way facing. sx right, sy down. */
export function dirFromScreen(sx: number, sy: number, fallback: Dir): Dir {
  if (sx === 0 && sy === 0) return fallback;
  const a = Math.atan2(sy, sx);
  const oct = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  return DIRS[oct];
}

/** 0 = east, +CCW, y-up math — used by the controls probe. */
export function yawFromScreen(sx: number, sy: number): number {
  return Math.atan2(-sy, sx);
}

export function wrapPi(d: number) {
  return Math.atan2(Math.sin(d), Math.cos(d));
}
