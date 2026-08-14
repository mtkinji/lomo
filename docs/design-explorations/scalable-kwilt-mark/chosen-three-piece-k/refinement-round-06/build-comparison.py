from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "refinement-round-01" / "assets" / "f-optically-centered.png"
FINAL = ROOT / "k1-f-shapes-open-air-fair.png"
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


source = Image.open(SOURCE).convert("RGBA")
final = Image.open(FINAL).convert("RGBA")

board = Image.new("RGBA", (1200, 760), CREAM)
draw = ImageDraw.Draw(board)
draw.text((600, 58), "F silhouette vocabulary · Open Air · fair curves", fill=INK, font=font(30), anchor="mm")
draw.text((600, 94), "One consolidated primary", fill=MUTED, font=font(17), anchor="mm")

for center_x, mark, label, note in (
    (330, source, "F · Shape authority", "lemon upper · quadrant lower"),
    (870, final, "K1 · Refined primary", "Open Air spacing · fair curved surfaces"),
):
    large = mark.resize((320, 320), Image.Resampling.LANCZOS)
    board.alpha_composite(large, (center_x - 160, 145))
    draw.rectangle((center_x - 160, 145, center_x + 160, 465), outline=(217, 210, 198, 255), width=1)
    draw.text((center_x, 513), label, fill=INK, font=font(21), anchor="mm")
    draw.text((center_x, 545), note, fill=MUTED, font=font(17), anchor="mm")
    small = mark.resize((28, 28), Image.Resampling.LANCZOS)
    board.alpha_composite(small, (center_x - 14, 594))

draw.text((600, 668), "28-pixel comparison", fill=MUTED, font=font(17), anchor="mm")
board.convert("RGB").save(ROOT / "f-to-k1-comparison.png", quality=100)

opaque = Image.new("RGBA", final.size, CREAM)
opaque.alpha_composite(final)
opaque.convert("RGB").save(ROOT / "k1-f-shapes-open-air-fair-opaque.png", quality=100)

# A contour-detail crop makes the lower quadrant easy to judge without
# introducing another logo variant.
detail = Image.new("RGBA", (1200, 560), CREAM)
detail_draw = ImageDraw.Draw(detail)
detail_draw.text((600, 52), "Lower-right contour detail", fill=INK, font=font(28), anchor="mm")
detail_draw.text((600, 86), "One fair arc meeting intentional bottom and right cuts", fill=MUTED, font=font(17), anchor="mm")
final_large = final.resize((640, 640), Image.Resampling.LANCZOS)
detail.alpha_composite(final_large.crop((245, 325, 640, 640)).resize((474, 378), Image.Resampling.LANCZOS), (363, 125))
detail.convert("RGB").save(ROOT / "k1-lower-quadrant-detail.png", quality=100)
