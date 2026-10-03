Video2dsprite output (Grok Build pipeline)
==========================================
base/           base still on #FF00FF
video/          imagine_image_to_video clip
frames-raw/     decoded frames
frames-clean/   chroma-keyed RGBA frames
sprite/         sampled normalized sprites + strips/grids/GIFs
pipeline-meta.json

This folder was produced for Grok Build (imagine_text_to_image + imagine_image_to_video).
Codex/other agents cannot run the video step; they can still re-sample
existing frames with: python video2dsprite.py sample --clean-dir ...

{
  "mode": "sample",
  "clean_dir": "/tmp/lyra-ne-src",
  "total_clean": 16,
  "sets": [
    {
      "count": 8,
      "tag": "",
      "sprites": [
        "/workspace/assets/sprites/lyra/v2d-ne/sprite/sprite_01.png",
        "/workspace/assets/sprites/lyra/v2d-ne/sprite/sprite_02.png",
        "/workspace/assets/sprites/lyra/v2d-ne/sprite/sprite_03.png",
        "/workspace/assets/sprites/lyra/v2d-ne/sprite/sprite_04.png",
        "/workspace/assets/sprites/lyra/v2d-ne/sprite/sprite_05.png",
        "/workspace/assets/sprites/lyra/v2d-ne/sprite/sprite_06.png",
        "/workspace/assets/sprites/lyra/v2d-ne/sprite/sprite_07.png",
        "/workspace/assets/sprites/lyra/v2d-ne/sprite/sprite_08.png"
      ],
      "strip": "/workspace/assets/sprites/lyra/v2d-ne/sprite/run-strip-8.png",
      "grid": "/workspace/assets/sprites/lyra/v2d-ne/sprite/run-grid-8.png",
      "gif": "/workspace/assets/sprites/lyra/v2d-ne/sprite/run-preview-8.gif",
      "gif_ms": 80,
      "indices": [
        0,
        2,
        4,
        6,
        9,
        11,
        13,
        15
      ]
    }
  ]
}
