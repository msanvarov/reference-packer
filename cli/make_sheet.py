"""Pack reference images into one even grid on a plain background.

The same layout as the web app (and the script in the guide):
https://www.sal-anvarov.com/blog/seedance-reference-sheets-higgsfield

usage:
  python make_sheet.py out.png front.png three_quarter.png profile.png back.png face.png detail.png
  python make_sheet.py out.png *.jpg --cols 3 --cell 1024 --gap 48 --bg "#ececee"
"""
import argparse
import math

from PIL import Image, ImageColor


def make_sheet(paths, out, cols=0, cell=1024, gap=48, bg="#ececee"):
    images = [Image.open(p).convert("RGB") for p in paths]
    if not images:
        raise SystemExit("no input images")
    cols = min(cols, len(images)) if cols > 0 else math.ceil(math.sqrt(len(images)))
    rows = math.ceil(len(images) / cols)
    width = cols * cell + (cols + 1) * gap
    height = rows * cell + (rows + 1) * gap
    sheet = Image.new("RGB", (width, height), ImageColor.getrgb(bg))

    for i, img in enumerate(images):
        img.thumbnail((cell, cell), Image.LANCZOS)  # fit inside the cell, keep aspect, never upscale
        r, c = divmod(i, cols)
        x = gap + c * (cell + gap) + (cell - img.width) // 2
        y = gap + r * (cell + gap) + (cell - img.height) // 2
        sheet.paste(img, (x, y))

    sheet.save(out, quality=95)
    return width, height


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("images", nargs="+")
    ap.add_argument("--cols", type=int, default=0, help="columns (default: auto)")
    ap.add_argument("--cell", type=int, default=1024, help="panel box size in px")
    ap.add_argument("--gap", type=int, default=48, help="gutter in px")
    ap.add_argument("--bg", default="#ececee", help="background colour")
    a = ap.parse_args()
    w, h = make_sheet(a.images, a.out, a.cols, a.cell, a.gap, a.bg)
    print(f"wrote {a.out} ({w}x{h})")
