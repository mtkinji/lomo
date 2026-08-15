from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
K1 = ROOT.parent / "refinement-round-06" / "k1-f-shapes-open-air-fair.png"
K2 = ROOT / "k2-optically-centered-even-gaps.png"
CREAM = (247, 242, 232, 255)
INK = (23, 24, 23, 255)
MUTED = (98, 95, 88, 255)


def font(size):
    for candidate in ("/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


source = Image.open(K1).convert("RGBA")
final = Image.open(K2).convert("RGBA")
board = Image.new("RGBA", (1200, 760), CREAM)
draw = ImageDraw.Draw(board)
draw.text((600, 58), "K1 to K2 · optical centering and even gaps", fill=INK, font=font(30), anchor="mm")
draw.text((600, 94), "Contours locked · placement only", fill=MUTED, font=font(17), anchor="mm")

for center_x, mark, label, note in (
    (330, source, "K1 · Open Air fair", "uneven channels"),
    (870, final, "K2 · Centered + even", "balanced negative space"),
):
    large = mark.resize((320, 320), Image.Resampling.LANCZOS)
    board.alpha_composite(large, (center_x - 160, 145))
    draw.rectangle((center_x - 160, 145, center_x + 160, 465), outline=(217, 210, 198, 255), width=1)
    draw.text((center_x, 513), label, fill=INK, font=font(21), anchor="mm")
    draw.text((center_x, 545), note, fill=MUTED, font=font(17), anchor="mm")
    small = mark.resize((28, 28), Image.Resampling.LANCZOS)
    board.alpha_composite(small, (center_x - 14, 594))

draw.text((600, 668), "28-pixel comparison", fill=MUTED, font=font(17), anchor="mm")
board.convert("RGB").save(ROOT / "k1-to-k2-comparison.png", quality=100)

opaque = Image.new("RGBA", final.size, CREAM)
opaque.alpha_composite(final)
opaque.convert("RGB").save(ROOT / "k2-optically-centered-even-gaps-opaque.png", quality=100)
