from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
CREAM = (247, 242, 232, 255)
INK = (23, 24, 23, 255)
MUTED = (98, 95, 88, 255)


def font(size):
    candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


options = [
    ("G1 · Moderate air", "8% slimmer stem", "g1-moderate-air.png"),
    ("G2 · Balanced air", "12% slimmer · all gaps opened", "g2-balanced-air.png"),
    ("G3 · Open air", "16% slimmer · maximum separation", "g3-open-air.png"),
]

title_font = font(30)
label_font = font(21)
note_font = font(17)

board = Image.new("RGBA", (1536, 760), CREAM)
draw = ImageDraw.Draw(board)
draw.text((768, 58), "Option F1 · stem weight and spacing", fill=INK, font=title_font, anchor="mm")
draw.text((768, 94), "Fair contours locked · progressively more air", fill=MUTED, font=note_font, anchor="mm")

centers = (260, 768, 1276)
for center_x, (label, note, filename) in zip(centers, options):
    mark = Image.open(ROOT / filename).convert("RGBA")
    large = mark.resize((256, 256), Image.Resampling.LANCZOS)
    board.alpha_composite(large, (center_x - 128, 150))
    draw.rectangle((center_x - 128, 150, center_x + 128, 406), outline=(217, 210, 198, 255), width=1)
    draw.text((center_x, 454), label, fill=INK, font=label_font, anchor="mm")
    draw.text((center_x, 484), note, fill=MUTED, font=note_font, anchor="mm")

    small = mark.resize((28, 28), Image.Resampling.LANCZOS)
    board.alpha_composite(small, (center_x - 14, 590))

draw.text((768, 564), "28-pixel navigation-size comparison", fill=MUTED, font=note_font, anchor="mm")
board.convert("RGB").save(ROOT / "spacing-comparison-flat.png", quality=100)

for label, _, filename in options:
    mark = Image.open(ROOT / filename).convert("RGBA")
    preview = Image.new("RGBA", (1024, 1024), CREAM)
    preview.alpha_composite(mark)
    output = ROOT / filename.replace(".png", "-opaque.png")
    preview.convert("RGB").save(output, quality=100)
