export const COLS = 26;
export const ROWS = 26;
export const CRYSTAL_GOAL = 6;

export type TileKind = "grass" | "dirt" | "cobble" | "water";

export type PropKind = "tree" | "pillar" | "chest" | "bush" | "lantern";

export type WorldProp = {
  kind: PropKind;
  x: number;
  y: number;
  r: number;
  block: boolean;
};

export type Crystal = {
  x: number;
  y: number;
  taken: boolean;
};

export type World = {
  tiles: TileKind[][];
  props: WorldProp[];
  crystals: Crystal[];
  campfire: { x: number; y: number };
  spawn: { x: number; y: number };
  wolfPath: { x: number; y: number }[];
};

function fill<T>(v: T): T[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => v));
}

export function createWorld(): World {
  const tiles = fill<TileKind>("grass");

  const stamp = (x0: number, y0: number, x1: number, y1: number, k: TileKind) => {
    const xa = Math.max(0, Math.min(x0, x1));
    const xb = Math.min(COLS - 1, Math.max(x0, x1));
    const ya = Math.max(0, Math.min(y0, y1));
    const yb = Math.min(ROWS - 1, Math.max(y0, y1));
    for (let y = ya; y <= yb; y++) {
      for (let x = xa; x <= xb; x++) tiles[y][x] = k;
    }
  };

  // Dirt path from south-west meadow toward the ruin plaza
  for (let i = 3; i <= 18; i++) tiles[18][i] = "dirt";
  for (let i = 8; i <= 18; i++) tiles[i][18] = "dirt";
  for (let i = 10; i <= 18; i++) tiles[10][i] = "dirt";
  for (let i = 6; i <= 10; i++) tiles[i][10] = "dirt";
  stamp(16, 6, 21, 10, "cobble");
  stamp(17, 7, 20, 9, "cobble");
  stamp(3, 19, 8, 23, "water");
  tiles[19][8] = "dirt";
  tiles[18][8] = "dirt";
  tiles[18][7] = "grass";

  const props: WorldProp[] = [
    { kind: "tree", x: 4.2, y: 5.1, r: 0.42, block: true },
    { kind: "tree", x: 7.6, y: 3.4, r: 0.42, block: true },
    { kind: "tree", x: 12.4, y: 2.8, r: 0.42, block: true },
    { kind: "tree", x: 21.3, y: 4.6, r: 0.42, block: true },
    { kind: "tree", x: 23.1, y: 12.2, r: 0.42, block: true },
    { kind: "tree", x: 2.6, y: 12.8, r: 0.42, block: true },
    { kind: "tree", x: 14.8, y: 21.5, r: 0.42, block: true },
    { kind: "tree", x: 22.4, y: 20.2, r: 0.42, block: true },
    { kind: "tree", x: 9.3, y: 22.7, r: 0.42, block: true },
    { kind: "pillar", x: 16.6, y: 6.4, r: 0.28, block: true },
    { kind: "pillar", x: 20.8, y: 6.5, r: 0.28, block: true },
    { kind: "pillar", x: 16.5, y: 10.2, r: 0.28, block: true },
    { kind: "pillar", x: 20.7, y: 10.3, r: 0.28, block: true },
    { kind: "chest", x: 18.5, y: 7.6, r: 0.28, block: true },
    { kind: "lantern", x: 15.6, y: 8.2, r: 0.18, block: true },
    { kind: "lantern", x: 21.4, y: 8.4, r: 0.18, block: true },
    { kind: "lantern", x: 10.2, y: 17.4, r: 0.18, block: true },
    { kind: "bush", x: 6.2, y: 8.8, r: 0.22, block: false },
    { kind: "bush", x: 13.1, y: 13.4, r: 0.22, block: false },
    { kind: "bush", x: 19.8, y: 14.6, r: 0.22, block: false },
    { kind: "bush", x: 5.4, y: 16.2, r: 0.22, block: false },
    { kind: "bush", x: 11.7, y: 6.1, r: 0.22, block: false },
  ];

  const crystals: Crystal[] = [
    { x: 8.4, y: 9.2, taken: false },
    { x: 18.6, y: 9.5, taken: false },
    { x: 12.8, y: 16.4, taken: false },
    { x: 5.6, y: 17.8, taken: false },
    { x: 21.2, y: 16.8, taken: false },
    { x: 14.4, y: 5.2, taken: false },
  ];

  const wolfPath = [
    { x: 6, y: 18 },
    { x: 12, y: 18 },
    { x: 18, y: 18 },
    { x: 18, y: 12 },
    { x: 18, y: 10 },
    { x: 14, y: 10 },
    { x: 10, y: 10 },
    { x: 10, y: 14 },
    { x: 10, y: 18 },
  ];

  return {
    tiles,
    props,
    crystals,
    campfire: { x: 12.2, y: 11.4 },
    spawn: { x: 8.5, y: 14.5 },
    wolfPath,
  };
}

export function tileAt(world: World, x: number, y: number): TileKind | null {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return null;
  return world.tiles[cy][cx];
}

export function blocked(world: World, x: number, y: number, r: number): boolean {
  if (x < 1.2 || y < 1.2 || x > COLS - 1.2 || y > ROWS - 1.2) return true;
  const samples = [
    [x, y],
    [x - r, y],
    [x + r, y],
    [x, y - r],
    [x, y + r],
  ];
  for (const [sx, sy] of samples) {
    const t = tileAt(world, sx, sy);
    if (!t || t === "water") return true;
  }
  for (const p of world.props) {
    if (!p.block) continue;
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy < (r + p.r) * (r + p.r)) return true;
  }
  return false;
}
