#!/usr/bin/env python3
"""Compose Ashen Vale og.jpg + x-banner.jpg from in-game identity art."""
from __future__ import annotations

import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = "/workspace"
IDENTITY = f"{ROOT}/assets/sprites/lyra/identity-raw.jpg"
FONT_PATH = f"{ROOT}/.grok/fonts/Cinzel-700.ttf"
STAGE = f"{ROOT}/.grok"

PINE = (12, 16, 14)  # #0c100e
PARCHMENT = (236, 231, 220)  # #ece7dc
SAGE = (139, 146, 136)  # #8b9288
STONE = (197, 205, 198)  # #c5cdc6
ELEVATED = (22, 28, 24)  # #161c18


def load_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def tracked_width(text: str, font: ImageFont.FreeTypeFont, tracking: float) -> float:
    if not text:
        return 0.0
    return sum(font.getlength(ch) for ch in text) + tracking * (len(text) - 1)


def draw_tracked(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: float,
    stroke_width: int = 0,
    stroke_fill: tuple[int, int, int] | None = None,
) -> None:
    x, y = xy
    for i, ch in enumerate(text):
        draw.text(
            (x, y),
            ch,
            font=font,
            fill=fill,
            stroke_width=stroke_width,
            stroke_fill=stroke_fill,
        )
        x += font.getlength(ch) + (tracking if i < len(text) - 1 else 0)


def crop_cover(im: Image.Image, tw: int, th: int, y_bias: float = 0.0) -> Image.Image:
    """Cover-crop to tw×th. y_bias shifts the window (-1 top, +1 bottom)."""
    w, h = im.size
    target = tw / th
    src = w / h
    if src > target:
        nw = int(round(h * target))
        x0 = (w - nw) // 2
        box = (x0, 0, x0 + nw, h)
    else:
        nh = int(round(w / target))
        slack = h - nh
        y0 = int(round(slack * (0.5 + 0.5 * y_bias)))
        y0 = max(0, min(slack, y0))
        box = (0, y0, w, y0 + nh)
    return im.crop(box).resize((tw, th), Image.Resampling.LANCZOS)


def vignette(arr: np.ndarray, strength: float = 0.55, inner: float = 0.55) -> np.ndarray:
    h, w = arr.shape[:2]
    yy, xx = np.ogrid[:h, :w]
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    r = np.sqrt(((xx - cx) / (w * inner)) ** 2 + ((yy - cy) / (h * 0.78)) ** 2)
    v = np.clip(1.15 - r * strength, 0.28, 1.0)
    out = arr.astype(np.float32) * v[..., None]
    return np.clip(out, 0, 255)


def left_fade(arr: np.ndarray, pine=PINE, start: float = 0.06, end: float = 0.48) -> np.ndarray:
    h, w = arr.shape[:2]
    t = np.linspace(0.0, 1.0, w, dtype=np.float32)
    fade = np.clip((t - start) / (end - start), 0.0, 1.0)
    fade = fade * fade * (3 - 2 * fade)  # smoothstep
    mix = 0.18 + 0.82 * fade
    base = np.array(pine, dtype=np.float32)
    out = arr.astype(np.float32) * mix[None, :, None] + base * (1.0 - mix)[None, :, None]
    return np.clip(out, 0, 255)


def title_scrim(size: tuple[int, int], box: tuple[int, int, int, int], opacity: int = 118) -> Image.Image:
    w, h = size
    x0, y0, x1, y1 = box
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    pad_x, pad_y = 48, 28
    d.rounded_rectangle(
        (x0 - pad_x, y0 - pad_y, x1 + pad_x, y1 + pad_y),
        radius=18,
        fill=(*PINE, opacity),
    )
    return overlay.filter(ImageFilter.GaussianBlur(8))


def compose_og(src: Image.Image) -> Image.Image:
    W, H = 2400, 1260
    scene = crop_cover(src, W, H, y_bias=0.0)
    arr = vignette(np.array(scene), strength=0.48, inner=0.60)
    base = Image.fromarray(arr.astype(np.uint8)).convert("RGBA")

    font_a = load_font(288)
    font_b = load_font(288)
    track_a, track_b = 32.0, 48.0
    line1, line2 = "ASHEN", "VALE"
    w1 = tracked_width(line1, font_a, track_a)
    w2 = tracked_width(line2, font_b, track_b)
    block_w = max(w1, w2)
    gap = 14
    h1 = 288
    h2 = 288
    rule_h = 5
    block_h = h1 + gap + rule_h + gap + h2
    x_mid = W / 2
    y0 = (H - block_h) / 2 + 18

    scrim = title_scrim(
        (W, H),
        (
            int(x_mid - block_w / 2),
            int(y0),
            int(x_mid + block_w / 2),
            int(y0 + block_h),
        ),
        opacity=108,
    )
    base = Image.alpha_composite(base, scrim)
    draw = ImageDraw.Draw(base)

    x1 = x_mid - w1 / 2
    x2 = x_mid - w2 / 2
    y1 = y0
    y_rule = y0 + h1 + gap
    y2 = y_rule + rule_h + gap

    draw_tracked(
        draw, (x1, y1), line1, font_a, PARCHMENT, track_a,
        stroke_width=8, stroke_fill=PINE,
    )
    rule_w = int(block_w * 0.42)
    rx0 = int(x_mid - rule_w / 2)
    draw.rectangle((rx0, int(y_rule), rx0 + rule_w, int(y_rule) + rule_h), fill=STONE)
    draw_tracked(
        draw, (x2, y2), line2, font_b, PARCHMENT, track_b,
        stroke_width=8, stroke_fill=PINE,
    )

    # Guard: title must sit in the middle half of the frame, away from edges.
    assert y1 > H * 0.18, y1
    assert y2 + h2 < H * 0.82, y2 + h2
    assert x_mid - block_w / 2 > W * 0.16, block_w
    assert block_w < W * 0.72, block_w
    print(f"OG title box w={block_w:.0f} ({block_w/W:.0%}) y={y1:.0f}-{y2+h2:.0f}")
    return base.convert("RGB")


def compose_banner(src: Image.Image) -> Image.Image:
    W, H = 2400, 528
    scene = crop_cover(src, W, H, y_bias=0.0)
    arr = left_fade(np.array(scene), start=0.04, end=0.52)
    arr = vignette(arr, strength=0.28, inner=0.85)
    base = Image.fromarray(arr.astype(np.uint8)).convert("RGBA")
    draw = ImageDraw.Draw(base)

    font_a = load_font(100)
    font_b = load_font(100)
    track_a, track_b = 14.0, 22.0
    line1, line2 = "ASHEN", "VALE"
    w1 = tracked_width(line1, font_a, track_a)
    w2 = tracked_width(line2, font_b, track_b)
    block_w = max(w1, w2)

    left = 88
    top = 32
    gap = 4
    h1 = 100
    rule_h = 3
    y1 = top
    y_rule = y1 + h1 + gap
    y2 = y_rule + rule_h + gap
    h2 = 100
    bottom = y2 + h2

    # Safe lockup: left-most 50% × top-most 80%, entirely above the midline.
    assert left + block_w < W * 0.50, (left, block_w, W)
    assert bottom < H * 0.50, (bottom, H)
    assert y1 > 24, y1
    print(
        f"banner title left={left} w={block_w:.0f} ({(left+block_w)/W:.0%} of width) "
        f"y={y1}-{bottom} (mid={H/2:.0f}, 80%={H*0.8:.0f})"
    )

    # Soft scrim only under the lockup, not the ranger.
    scrim = title_scrim(
        (W, H),
        (int(left), int(y1), int(left + block_w), int(bottom)),
        opacity=150,
    )
    base = Image.alpha_composite(base, scrim)
    draw = ImageDraw.Draw(base)

    draw_tracked(
        draw, (left, y1), line1, font_a, PARCHMENT, track_a,
        stroke_width=4, stroke_fill=PINE,
    )
    rule_w = int(block_w * 0.38)
    draw.rectangle((left, int(y_rule), left + rule_w, int(y_rule) + rule_h), fill=STONE)
    draw_tracked(
        draw, (left, y2), line2, font_b, PARCHMENT, track_b,
        stroke_width=4, stroke_fill=PINE,
    )
    return base.convert("RGB")


def main() -> None:
    os.makedirs(STAGE, exist_ok=True)
    src = Image.open(IDENTITY).convert("RGB")
    og = compose_og(src)
    bn = compose_banner(src)
    og_path = f"{STAGE}/og-raw.png"
    bn_path = f"{STAGE}/banner-raw.png"
    og.save(og_path, "PNG")
    bn.save(bn_path, "PNG")
    print("wrote", og_path, og.size)
    print("wrote", bn_path, bn.size)


if __name__ == "__main__":
    main()
