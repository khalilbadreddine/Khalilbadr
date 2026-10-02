"""Turn a selfie into public/portrait.png: a cropped, background-free,
grayscale head-and-shoulders cutout that the browser samples into dots.

    pip install pillow numpy "rembg[cpu]"
    python scripts/make_portrait.py path/to/photo.jpg

The crop box and clean-up polygons below are tuned for the current photo;
adjust them if you swap in a different one.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from rembg import new_session, remove

OUT = Path(__file__).resolve().parent.parent / "public" / "portrait.png"
OUT_HEIGHT = 360

# Region kept (in source-photo pixels): hair top down to the collar.
CROP = (60, 170, 660, 830)
# Soft fade-out at the bottom so the neck dissolves instead of ending in a line.
FADE_START, FADE_END = 770, 825
# Leftovers from the background that the segmentation keeps (sack strand on
# top, straw next to the neck).
ERASE = [
    [(150, 0), (360, 0), (330, 215), (240, 230), (150, 160)],
    [(512, 612), (620, 600), (620, 830), (457, 830), (457, 722), (464, 700),
     (473, 680), (483, 660), (493, 640), (503, 622)],
]


def main(src: str) -> None:
    photo = Image.open(src).convert("RGB")
    cut = remove(photo, session=new_session("u2net_human_seg"))
    alpha = np.asarray(cut.getchannel("A"), dtype=np.float32) / 255.0

    erase = Image.new("L", photo.size, 0)
    draw = ImageDraw.Draw(erase)
    for poly in ERASE:
        draw.polygon(poly, fill=255)
    erase = erase.filter(ImageFilter.GaussianBlur(4))
    alpha *= 1.0 - np.asarray(erase, dtype=np.float32) / 255.0

    ys = np.arange(photo.height, dtype=np.float32)[:, None]
    alpha *= np.clip((FADE_END - ys) / (FADE_END - FADE_START), 0.0, 1.0)

    gray = ImageOps.autocontrast(ImageOps.grayscale(photo), cutoff=1)
    gray = ImageOps.equalize(gray, mask=Image.fromarray((alpha > 0.5).astype(np.uint8) * 255))

    out = Image.merge("LA", (gray, Image.fromarray((alpha * 255).astype(np.uint8))))
    out = out.crop(CROP)
    w = round(out.width * OUT_HEIGHT / out.height)
    out = out.resize((w, OUT_HEIGHT), Image.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT, optimize=True)
    print(f"wrote {OUT} ({out.width}x{out.height})")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python scripts/make_portrait.py <photo>")
    main(sys.argv[1])
