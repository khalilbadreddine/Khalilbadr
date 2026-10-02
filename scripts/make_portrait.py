"""Turn a selfie into the two images the browser samples into dots:

    public/portrait.png  head + shoulders (hero)
    public/head.png      head only, cut under the jaw (big-head figure)

    pip install pillow numpy "rembg[cpu]"
    python scripts/make_portrait.py path/to/photo.jpg

The face is made upright and neutral: the eyes are levelled, the low camera
angle is corrected with a mild perspective warp, and the mouth corners are
eased down a little. Coordinates below are in source-photo pixels and are
tuned for the current photo; re-measure them if you swap it.
"""
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from rembg import new_session, remove

PUBLIC = Path(__file__).resolve().parent.parent / "public"

LEFT_EYE = (427, 496)
RIGHT_EYE = (550, 508)
MOUTH_CORNERS = [(431, 620), (537, 619)]
MOUTH_EASE_PX = 4  # how far the smile corners are pulled down
# Perspective: shrink the bottom of the frame relative to the top, so the chin
# and neck stop dominating (the photo was taken from below).
KEYSTONE = 0.07
# Background bits the segmentation keeps (things showing next to the ears).
ERASE = [
    [(305, 628), (370, 628), (377, 660), (386, 694), (305, 704)],
    [(592, 622), (645, 622), (645, 692), (583, 692), (580, 660), (589, 632)],
]
# Crops after levelling: (left, top, right, bottom).
PORTRAIT_CROP = (240, 300, 740, 950)
PORTRAIT_FADE = (850, 945)
SHIRT_TOP = 800  # shirt pixels are dimmed so the face stays the focus
HEAD_CROP = (300, 320, 680, 790)
HEAD_FADE = (735, 785)


def level_and_correct(img: Image.Image) -> Image.Image:
    (lx, ly), (rx, ry) = LEFT_EYE, RIGHT_EYE
    angle = math.degrees(math.atan2(ry - ly, rx - lx))
    centre = ((lx + rx) / 2, (ly + ry) / 2)
    img = img.rotate(angle, resample=Image.BICUBIC, center=centre)

    w, h = img.size
    k = KEYSTONE * w
    # Map the output rectangle onto a quad that is wider at the bottom.
    src = [(0, 0), (w, 0), (w + k, h), (-k, h)]
    dst = [(0, 0), (w, 0), (w, h), (0, h)]
    return img.transform(img.size, Image.PERSPECTIVE, perspective_coeffs(dst, src), Image.BICUBIC)


def perspective_coeffs(dst, src):
    rows = []
    for (x, y), (u, v) in zip(dst, src):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    a = np.array(rows, dtype=np.float64)
    b = np.array([c for p in src for c in p], dtype=np.float64)
    return np.linalg.solve(a, b).tolist()


def ease_smile(img: Image.Image, corners) -> Image.Image:
    """Pull pixels around each mouth corner down a few pixels (gaussian falloff)."""
    arr = np.asarray(img).astype(np.float32)
    h, w = arr.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    dy = np.zeros((h, w), np.float32)
    for cx, cy in corners:
        dy += MOUTH_EASE_PX * np.exp(-(((xs - cx) / 16) ** 2 + ((ys - cy) / 12) ** 2))
    sy = np.clip(np.round(ys - dy), 0, h - 1).astype(int)
    return Image.fromarray(arr[sy, xs.astype(int)].astype(np.uint8), img.mode)


def to_gray_alpha(rgba: Image.Image, fade, dim_below=None) -> Image.Image:
    alpha = np.asarray(rgba.getchannel("A"), np.float32) / 255
    ys = np.arange(rgba.height, dtype=np.float32)[:, None]
    alpha *= np.clip((fade[1] - ys) / (fade[1] - fade[0]), 0, 1)
    gray = ImageOps.grayscale(rgba.convert("RGB"))
    mask = Image.fromarray(((alpha > 0.5) * 255).astype(np.uint8))
    gray = ImageOps.equalize(ImageOps.autocontrast(gray, cutoff=1), mask=mask)
    g = np.asarray(gray, np.float32)
    if dim_below is not None:
        g *= 1 - 0.45 * np.clip((ys - dim_below) / 40, 0, 1)
    return Image.merge("LA", (Image.fromarray(g.astype(np.uint8)), Image.fromarray((alpha * 255).astype(np.uint8))))


def save(img: Image.Image, crop, name: str, height: int) -> None:
    img = img.crop(crop)
    img = img.resize((round(img.width * height / img.height), height), Image.LANCZOS)
    img.save(PUBLIC / name, optimize=True)
    print(f"wrote public/{name} ({img.width}x{img.height})")


def main(src: str) -> None:
    photo = Image.open(src).convert("RGB")
    cut = remove(photo, session=new_session("u2net_human_seg"))

    erase = Image.new("L", photo.size, 0)
    draw = ImageDraw.Draw(erase)
    for poly in ERASE:
        draw.polygon(poly, fill=255)
    erase = erase.filter(ImageFilter.GaussianBlur(3))
    a = np.asarray(cut.getchannel("A"), np.float32) * (1 - np.asarray(erase, np.float32) / 255)
    cut.putalpha(Image.fromarray(a.astype(np.uint8)))

    cut = ease_smile(cut, MOUTH_CORNERS)
    cut = level_and_correct(cut)

    PUBLIC.mkdir(parents=True, exist_ok=True)
    save(to_gray_alpha(cut, PORTRAIT_FADE, SHIRT_TOP), PORTRAIT_CROP, "portrait.png", 400)
    save(to_gray_alpha(cut, HEAD_FADE), HEAD_CROP, "head.png", 320)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python scripts/make_portrait.py <photo>")
    main(sys.argv[1])
