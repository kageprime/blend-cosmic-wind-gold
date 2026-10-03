import {
  TILE_H,
  TILE_W,
  dirFromScreen,
  worldToScreen,
  yawFromScreen,
  type Dir,
} from "./iso";
import { createInput } from "./input";
import {
  FIRE_FRAMES,
  LYRA_FRAMES,
  WOLF_FRAMES,
  CRYSTAL_FRAMES,
  loadAssets,
  wolfDirFromScreen,
  type GameAssets,
} from "./assets";
import {
  blocked,
  COLS,
  CRYSTAL_GOAL,
  ROWS,
  createWorld,
  type World,
} from "./world";

export type HudSnap = {
  phase: "title" | "play" | "paused" | "win";
  embers: number;
  goal: number;
  dir: Dir;
  health: number;
  moving: boolean;
};

type HudFn = (s: HudSnap) => void;

type Actor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: Dir;
  frame: number;
  anim: number;
  hurt: number;
};

function dirToScreen(d: Dir) {
  const map: Record<Dir, { x: number; y: number }> = {
    e: { x: 1, y: 0 },
    se: { x: 1, y: 1 },
    s: { x: 0, y: 1 },
    sw: { x: -1, y: 1 },
    w: { x: -1, y: 0 },
    nw: { x: -1, y: -1 },
    n: { x: 0, y: -1 },
    ne: { x: 1, y: -1 },
  };
  return map[d];
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number,
  sy: number,
  height: number,
) {
  const scale = height / img.height;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, sx - w / 2, sy - h, w, h);
}

function tryMove(world: World, a: Actor, nx: number, ny: number, r: number) {
  if (!blocked(world, nx, a.y, r)) a.x = nx;
  if (!blocked(world, a.x, ny, r)) a.y = ny;
}

export async function bootGame(canvas: HTMLCanvasElement, onHud: HudFn) {
  const assets = await loadAssets();
  const world = createWorld();
  const input = createInput(canvas);

  let phase: HudSnap["phase"] = "title";
  let health = 3;
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  let camX = 0;
  let camY = 0;
  let raf = 0;
  let running = true;
  let toast = "";
  let toastT = 0;

  const player: Actor = {
    x: world.spawn.x,
    y: world.spawn.y,
    vx: 0,
    vy: 0,
    dir: "se",
    frame: 0,
    anim: 0,
    hurt: 0,
  };

  let wolfIdx = 0;
  const wolf: Actor = {
    x: world.wolfPath[0].x,
    y: world.wolfPath[0].y,
    vx: 0,
    vy: 0,
    dir: "e",
    frame: 0,
    anim: 0,
    hurt: 0,
  };

  const spawn = worldToScreen(player.x, player.y);
  camX = spawn.sx;
  camY = spawn.sy - 28;

  function emit() {
    onHud({
      phase,
      embers: world.crystals.filter((c) => c.taken).length,
      goal: CRYSTAL_GOAL,
      dir: player.dir,
      health,
      moving: Math.hypot(player.vx, player.vy) > 0.05,
    });
  }

  function speed() {
    return Math.hypot(player.vx, player.vy);
  }

  const probe = {
    getYaw: () => {
      if (speed() > 0.04) return yawFromScreen(player.vx, player.vy);
      const d = dirToScreen(player.dir);
      return yawFromScreen(d.x, d.y);
    },
    getSpeed: () => speed(),
    setKeys: (codes: string[]) => input.setKeys(codes),
  };

  const qa =
    import.meta.env.DEV ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("qa"));
  if (qa) {
    (window as Window & { __controlsTest?: typeof probe }).__controlsTest = probe;
  }

  function restart() {
    for (const c of world.crystals) c.taken = false;
    health = 3;
    player.x = world.spawn.x;
    player.y = world.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.hurt = 0;
    player.dir = "se";
    wolfIdx = 0;
    wolf.x = world.wolfPath[0].x;
    wolf.y = world.wolfPath[0].y;
    phase = "play";
    emit();
  }

  function step(dt: number) {
    const actions = input.sample();
    if (phase === "title") {
      player.anim += dt;
      wolf.anim += dt;
      return;
    }
    if (actions.pause) {
      if (phase === "paused") phase = "play";
      else if (phase === "play") phase = "paused";
      emit();
    }
    if (phase !== "play") {
      player.anim += dt * 0.4;
      return;
    }

    const speedMax = 3.35;
    const sx = actions.moveX;
    const sy = actions.moveY;
    const wx = (sx + sy) * 0.7071;
    const wy = (sy - sx) * 0.7071;
    const mag = Math.hypot(wx, wy);
    let vx = 0;
    let vy = 0;
    if (mag > 0.001) {
      vx = (wx / mag) * speedMax;
      vy = (wy / mag) * speedMax;
      player.dir = dirFromScreen(sx, sy, player.dir);
      player.anim += dt * 9;
      player.frame = Math.floor(player.anim) % LYRA_FRAMES;
    } else {
      player.frame = 0;
      player.anim = 0;
    }
    player.vx = vx;
    player.vy = vy;
    tryMove(world, player, player.x + vx * dt, player.y + vy * dt, 0.22);
    if (player.hurt > 0) player.hurt -= dt;

    const target = world.wolfPath[wolfIdx];
    const wdx = target.x - wolf.x;
    const wdy = target.y - wolf.y;
    const wdist = Math.hypot(wdx, wdy);
    if (wdist < 0.18) {
      wolfIdx = (wolfIdx + 1) % world.wolfPath.length;
    } else {
      const wspd = 1.55;
      wolf.vx = (wdx / wdist) * wspd;
      wolf.vy = (wdy / wdist) * wspd;
      const scr = worldToScreen(wolf.x + wolf.vx, wolf.y + wolf.vy);
      const here = worldToScreen(wolf.x, wolf.y);
      wolf.dir = dirFromScreen(scr.sx - here.sx, scr.sy - here.sy, wolf.dir);
      tryMove(world, wolf, wolf.x + wolf.vx * dt, wolf.y + wolf.vy * dt, 0.28);
      wolf.anim += dt * 8;
      wolf.frame = Math.floor(wolf.anim) % WOLF_FRAMES;
    }

    const pdx = player.x - wolf.x;
    const pdy = player.y - wolf.y;
    if (pdx * pdx + pdy * pdy < 0.55 * 0.55 && player.hurt <= 0) {
      player.hurt = 0.9;
      health = Math.max(0, health - 1);
      const knock = 0.55;
      const kd = Math.hypot(pdx, pdy) || 1;
      tryMove(
        world,
        player,
        player.x + (pdx / kd) * knock,
        player.y + (pdy / kd) * knock,
        0.22,
      );
      toast = health <= 0 ? "The wolf drove you back" : "Too close";
      toastT = 1.4;
      if (health <= 0) {
        health = 3;
        player.x = world.spawn.x;
        player.y = world.spawn.y;
      }
    }

    for (const c of world.crystals) {
      if (c.taken) continue;
      const dx = player.x - c.x;
      const dy = player.y - c.y;
      if (dx * dx + dy * dy < 0.38 * 0.38) {
        c.taken = true;
        toast = "Ember gathered";
        toastT = 1.2;
      }
    }

    const cfx = player.x - world.campfire.x;
    const cfy = player.y - world.campfire.y;
    if (cfx * cfx + cfy * cfy < 0.7 * 0.7 && health < 3) {
      health = 3;
      toast = "The fire steadies you";
      toastT = 1.2;
    }

    if (world.crystals.every((c) => c.taken)) {
      phase = "win";
    }

    if (toastT > 0) toastT -= dt;
    emit();
  }

  function drawGround(
    ctx: CanvasRenderingContext2D,
    sheet: GameAssets,
    viewL: number,
    viewT: number,
    viewR: number,
    viewB: number,
  ) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const { sx, sy } = worldToScreen(x, y);
        if (sx < viewL - TILE_W || sx > viewR + TILE_W) continue;
        if (sy < viewT - TILE_H || sy > viewB + TILE_H) continue;
        const img = sheet.tiles[world.tiles[y][x]];
        const tw = TILE_W + 2;
        const th = (img.height / img.width) * tw;
        ctx.drawImage(img, sx - tw / 2, sy - th / 2, tw, th);
      }
    }
  }

  function frame(now: number) {
    if (!running) return;
    const raw = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += raw;
    while (acc >= STEP) {
      step(STEP);
      acc -= STEP;
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (
      canvas.width !== Math.floor(w * dpr) ||
      canvas.height !== Math.floor(h * dpr)
    ) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#0c100e";
    ctx.fillRect(0, 0, w, h);

    const pScr = worldToScreen(player.x, player.y);
    const follow = 1 - Math.exp(-4.2 * raw);
    camX += (pScr.sx - camX) * follow;
    camY += (pScr.sy - 36 - camY) * follow;

    ctx.save();
    ctx.translate(w / 2 - camX, h / 2 - camY);

    const viewL = camX - w / 2;
    const viewT = camY - h / 2;
    const viewR = camX + w / 2;
    const viewB = camY + h / 2;
    drawGround(ctx, assets, viewL, viewT, viewR, viewB);

    type Spr = { sy: number; draw: () => void };
    const list: Spr[] = [];
    const t = now / 1000;

    for (const p of world.props) {
      const s = worldToScreen(p.x, p.y);
      const img = assets[p.kind];
      const height =
        p.kind === "tree" ? 118 : p.kind === "pillar" ? 92 : p.kind === "lantern" ? 54 : 42;
      list.push({
        sy: s.sy,
        draw: () => {
          if (p.kind === "lantern") {
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = "#e8c37a";
            ctx.beginPath();
            ctx.arc(s.sx, s.sy - 28, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          drawSprite(ctx, img, s.sx, s.sy + 8, height);
        },
      });
    }

    const fireS = worldToScreen(world.campfire.x, world.campfire.y);
    const fi = Math.floor(t * 8) % FIRE_FRAMES;
    list.push({
      sy: fireS.sy,
      draw: () => drawSprite(ctx, assets.campfire[fi], fireS.sx, fireS.sy + 6, 48),
    });

    for (const c of world.crystals) {
      if (c.taken) continue;
      const s = worldToScreen(c.x, c.y);
      const ci = Math.floor(t * 6) % CRYSTAL_FRAMES;
      const bob = Math.sin(t * 3 + c.x) * 4;
      list.push({
        sy: s.sy,
        draw: () => {
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = "#d08a5a";
          ctx.beginPath();
          ctx.ellipse(s.sx, s.sy + 4, 10, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          drawSprite(ctx, assets.crystal[ci], s.sx, s.sy + bob, 40);
        },
      });
    }

    const wS = worldToScreen(wolf.x, wolf.y);
    const wDir = wolfDirFromScreen(
      dirToScreen(wolf.dir).x,
      dirToScreen(wolf.dir).y,
    );
    list.push({
      sy: wS.sy,
      draw: () =>
        drawSprite(ctx, assets.wolf[wDir][wolf.frame], wS.sx, wS.sy + 6, 52),
    });

    const lyraImg = assets.lyra[player.dir][player.frame];
    list.push({
      sy: pScr.sy,
      draw: () => {
        if (player.hurt > 0 && Math.floor(t * 16) % 2 === 0) ctx.globalAlpha = 0.45;
        drawSprite(ctx, lyraImg, pScr.sx, pScr.sy + 6, 78);
        ctx.globalAlpha = 1;
      },
    });

    list.sort((a, b) => a.sy - b.sy);
    for (const s of list) s.draw();
    ctx.restore();

    if (toastT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, toastT * 2);
      ctx.font = "600 14px Figtree, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ece7dc";
      ctx.fillText(toast, w / 2, 72);
      ctx.restore();
    }

    raf = requestAnimationFrame(frame);
  }

  emit();
  raf = requestAnimationFrame(frame);

  return {
    start() {
      if (phase === "win") {
        restart();
        return;
      }
      if (phase === "title" || phase === "paused") {
        phase = "play";
        emit();
      }
    },
    pause() {
      if (phase === "play") {
        phase = "paused";
        emit();
      }
    },
    resume() {
      if (phase === "paused") {
        phase = "play";
        emit();
      }
    },
    restart,
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      input.destroy();
      if (qa) {
        delete (window as Window & { __controlsTest?: typeof probe }).__controlsTest;
      }
    },
  };
}

export type GameHandle = Awaited<ReturnType<typeof bootGame>>;
