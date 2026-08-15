from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
PREVIOUS = ROOT.parent / "refinement-round-03" / "g2-balanced-air.png"
CURRENT = ROOT / "h1-balanced-air-restored-quadrant.png"
CREAM = (247, 242, 232, 255)
INK = (23, 24, 23, 255)
MUTED = (98, 95, 88, 255)


def font(size):
    for candidate in (
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


board = Image.new("RGBA", (1200, 720), CREAM)
draw = ImageDraw.Draw(board)
draw.text((600, 58), "Balanced Air · lower-piece correction", fill=INK, font=font(30), anchor="mm")
draw.text((600, 94), "Same spacing system · only the lower-right perimeter changes", fill=MUTED, font=font(17), anchor="mm")

for center_x, path, label, note in (
    (330, PREVIOUS, "Previous · fully rounded", "pebble / rock character"),
    (870, CURRENT, "H1 · restored quadrant", "intentional bottom and right cut planes"),
):
    mark = Image.open(path).convert("RGBA").resize((320, 320), Image.Resampling.LANCZOS)
    board.alpha_composite(mark, (center_x - 160, 150))
    draw.rectangle((center_x - 160, 150, center_x + 160, 470), outline=(217, 210, 198, 255), width=1)
    draw.text((center_x, 518), label, fill=INK, font=font(21), anchor="mm")
    draw.text((center_x, 550), note, fill=MUTED, font=font(17), anchor="mm")
    small = mark.resize((28, 28), Image.Resampling.LANCZOS)
    board.alpha_composite(small, (center_x - 14, 598))

draw.text((600, 674), "28-pixel comparison", fill=MUTED, font=font(17), anchor="mm")
board.convert("RGB").save(ROOT / "balanced-air-lower-piece-before-after.png", quality=100)

opaque = Image.new("RGBA", (1024, 1024), CREAM)
opaque.alpha_composite(Image.open(CURRENT).convert("RGBA"))
opaque.convert("RGB").save(ROOT / "h1-balanced-air-restored-quadrant-opaque.png", quality=100)
