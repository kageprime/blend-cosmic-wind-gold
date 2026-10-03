export type Actions = {
  moveX: number;
  moveY: number;
  pause: boolean;
};

const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyP",
  "Escape",
  "Space",
]);

function radialDeadzone(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export function createInput(target: HTMLElement) {
  const keys = new Set<string>();
  const injected = new Set<string>();
  let stickX = 0;
  let stickY = 0;
  let stickPointer: number | null = null;
  let stickOrigin = { x: 0, y: 0 };
  const prevPause = { down: false };

  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_CODES.has(e.code)) e.preventDefault();
    keys.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };
  const clear = () => {
    keys.clear();
    stickX = 0;
    stickY = 0;
    stickPointer = null;
  };

  const onBlur = () => clear();

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width * 0.52) return;
    stickPointer = e.pointerId;
    stickOrigin = { x: e.clientX, y: e.clientY };
    target.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: PointerEvent) => {
    if (stickPointer !== e.pointerId) return;
    const dx = e.clientX - stickOrigin.x;
    const dy = e.clientY - stickOrigin.y;
    const max = 56;
    const nx = dx / max;
    const ny = dy / max;
    const m = Math.hypot(nx, ny);
    const k = m > 1 ? 1 / m : 1;
    const dz = radialDeadzone(nx * k, ny * k, 0.12);
    stickX = dz.x;
    stickY = dz.y;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (stickPointer !== e.pointerId) return;
    stickPointer = null;
    stickX = 0;
    stickY = 0;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", onPointerUp);
  target.addEventListener("pointercancel", onPointerUp);

  function pollGamepad() {
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      const dz = radialDeadzone(ax, ay, 0.18);
      if (dz.x !== 0 || dz.y !== 0) {
        stickX = dz.x;
        stickY = dz.y;
      }
      if (pad.buttons[12]?.pressed) stickY = Math.min(stickY, -1);
      if (pad.buttons[13]?.pressed) stickY = Math.max(stickY, 1);
      if (pad.buttons[14]?.pressed) stickX = Math.min(stickX, -1);
      if (pad.buttons[15]?.pressed) stickX = Math.max(stickX, 1);
      break;
    }
  }

  return {
    sample(): Actions {
      pollGamepad();
      const held = injected.size ? injected : keys;
      let kx = 0;
      let ky = 0;
      if (held.has("KeyA") || held.has("ArrowLeft")) kx -= 1;
      if (held.has("KeyD") || held.has("ArrowRight")) kx += 1;
      if (held.has("KeyW") || held.has("ArrowUp")) ky -= 1;
      if (held.has("KeyS") || held.has("ArrowDown")) ky += 1;
      let moveX = kx || stickX;
      let moveY = ky || stickY;
      const mag = Math.hypot(moveX, moveY);
      if (mag > 1) {
        moveX /= mag;
        moveY /= mag;
      }
      const pauseDown = held.has("KeyP") || held.has("Escape");
      const pause = pauseDown && !prevPause.down;
      prevPause.down = pauseDown;
      return { moveX, moveY, pause };
    },
    setKeys(codes: string[]) {
      injected.clear();
      for (const c of codes) injected.add(c);
    },
    stick() {
      return { x: stickX, y: stickY, active: stickPointer !== null };
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", onPointerUp);
      target.removeEventListener("pointercancel", onPointerUp);
    },
  };
}
