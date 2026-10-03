import { DIRS, type Dir } from "./iso";

export const LYRA_FRAMES = 8;
export const WOLF_FRAMES = 4;
export const CRYSTAL_FRAMES = 4;
export const FIRE_FRAMES = 4;

const WOLF_DIRS = ["s", "w", "e", "n"] as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export type GameAssets = {
  lyra: Record<Dir, HTMLImageElement[]>;
  idle: HTMLImageElement;
  tiles: Record<"grass" | "dirt" | "cobble" | "water", HTMLImageElement>;
  tree: HTMLImageElement;
  pillar: HTMLImageElement;
  chest: HTMLImageElement;
  bush: HTMLImageElement;
  lantern: HTMLImageElement;
  crystal: HTMLImageElement[];
  campfire: HTMLImageElement[];
  wolf: Record<(typeof WOLF_DIRS)[number], HTMLImageElement[]>;
};

export async function loadAssets(): Promise<GameAssets> {
  const lyraEntries = await Promise.all(
    DIRS.map(async (dir) => {
      const frames = await Promise.all(
        Array.from({ length: LYRA_FRAMES }, (_, i) =>
          loadImage(`/sprites/lyra/${dir}/${i}.png`),
        ),
      );
      return [dir, frames] as const;
    }),
  );

  const wolfEntries = await Promise.all(
    WOLF_DIRS.map(async (dir) => {
      const frames = await Promise.all(
        Array.from({ length: WOLF_FRAMES }, (_, i) =>
          loadImage(`/sprites/wolf/${dir}/${i}.png`),
        ),
      );
      return [dir, frames] as const;
    }),
  );

  const [idle, grass, dirt, cobble, water, tree, pillar, chest, bush, lantern] =
    await Promise.all([
      loadImage("/sprites/lyra/idle.png"),
      loadImage("/sprites/tiles/grass.png"),
      loadImage("/sprites/tiles/dirt.png"),
      loadImage("/sprites/tiles/cobble.png"),
      loadImage("/sprites/tiles/water.png"),
      loadImage("/sprites/props/tree.png"),
      loadImage("/sprites/props/pillar.png"),
      loadImage("/sprites/props/chest.png"),
      loadImage("/sprites/props/bush.png"),
      loadImage("/sprites/props/lantern.png"),
    ]);

  const crystal = await Promise.all(
    Array.from({ length: CRYSTAL_FRAMES }, (_, i) =>
      loadImage(`/sprites/crystal/${i}.png`),
    ),
  );
  const campfire = await Promise.all(
    Array.from({ length: FIRE_FRAMES }, (_, i) =>
      loadImage(`/sprites/campfire/${i}.png`),
    ),
  );

  return {
    lyra: Object.fromEntries(lyraEntries) as GameAssets["lyra"],
    idle,
    tiles: { grass, dirt, cobble, water },
    tree,
    pillar,
    chest,
    bush,
    lantern,
    crystal,
    campfire,
    wolf: Object.fromEntries(wolfEntries) as GameAssets["wolf"],
  };
}

export function wolfDirFromScreen(
  sx: number,
  sy: number,
): (typeof WOLF_DIRS)[number] {
  if (Math.abs(sx) > Math.abs(sy)) return sx >= 0 ? "e" : "w";
  return sy >= 0 ? "s" : "n";
}
