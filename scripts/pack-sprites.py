#!/usr/bin/env python3
"""Copy processed sprites into public/sprites with engine names."""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path("/workspace/assets/sprites")
PUB = Path("/workspace/public/sprites")


def copy_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)


def save_frames(imgs: list[Image.Image], dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for i, im in enumerate(imgs):
        im.convert("RGBA").save(dest / f"{i}.png")


def load_strip(folder: Path) -> list[Image.Image]:
    frames = sorted(folder.glob("sprite_*.png"))
    if not frames:
        frames = sorted((folder / "x8").glob("*.png"))
    if len(frames) < 8:
        raise SystemExit(f"expected 8 frames in {folder}, got {len(frames)}")
    return [Image.open(p).convert("RGBA") for p in frames[:8]]


def flip_h(imgs: list[Image.Image]) -> list[Image.Image]:
    return [im.transpose(Image.FLIP_LEFT_RIGHT) for im in imgs]


def pack_stills() -> None:
    copy_file(ROOT / "tiles/processed/tile-1.png", PUB / "tiles/grass.png")
    copy_file(ROOT / "tiles/processed/tile-2.png", PUB / "tiles/dirt.png")
    copy_file(ROOT / "tiles/processed/tile-3.png", PUB / "tiles/cobble.png")
    copy_file(ROOT / "tiles/processed/tile-4.png", PUB / "tiles/water.png")

    for name in ("tree", "pillar", "chest", "bush", "lantern"):
        copy_file(ROOT / "props" / name / "clean.png", PUB / "props" / f"{name}.png")

    for i in range(1, 5):
        copy_file(
            ROOT / "props/crystal" / f"idle-{i}.png",
            PUB / "crystal" / f"{i - 1}.png",
        )
        copy_file(
            ROOT / "props/campfire" / f"idle-{i}.png",
            PUB / "campfire" / f"{i - 1}.png",
        )

    copy_file(ROOT / "lyra/identity/clean.png", PUB / "lyra/idle.png")

    wolf_dir = ROOT / "wolf/processed2"
    if not (wolf_dir / "wolf-1.png").exists():
        wolf_dir = ROOT / "wolf/processed"
    mapping = {
        "s": [1, 2, 3, 4],
        "w": [5, 6, 7, 8],
        "e": [9, 10, 11, 12],
        "n": [13, 14, 15, 16],
    }
    for d, idxs in mapping.items():
        dest = PUB / "wolf" / d
        dest.mkdir(parents=True, exist_ok=True)
        for i, idx in enumerate(idxs):
            copy_file(wolf_dir / f"wolf-{idx}.png", dest / f"{i}.png")


def pack_lyra() -> None:
    se = load_strip(ROOT / "lyra/v2d-se/sprite")
    s = load_strip(ROOT / "lyra/v2d-s/sprite")
    e = load_strip(ROOT / "lyra/v2d-e/sprite")
    ne_dir = ROOT / "lyra/v2d-ne/sprite"
    ne = load_strip(ne_dir) if (ne_dir / "sprite_01.png").exists() else e
    save_frames(se, PUB / "lyra/se")
    save_frames(s, PUB / "lyra/s")
    save_frames(e, PUB / "lyra/e")
    save_frames(flip_h(se), PUB / "lyra/sw")
    save_frames(flip_h(e), PUB / "lyra/w")
    save_frames(ne, PUB / "lyra/ne")
    save_frames(flip_h(ne), PUB / "lyra/nw")
    save_frames(ne, PUB / "lyra/n")


if __name__ == "__main__":
    pack_stills()
    e_ready = (ROOT / "lyra/v2d-e/sprite/sprite_01.png").exists()
    if e_ready:
        pack_lyra()
        print("packed stills + lyra 8-dir")
    else:
        print("packed stills; lyra walk not ready")
