from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sys


SOURCE = Path(sys.argv[1])
OUTPUT = Path(sys.argv[2])
OUTPUT.mkdir(parents=True, exist_ok=True)

PINE = (49, 85, 69, 255)
CREAM = (247, 242, 232, 255)
INK = (23, 24, 23, 255)
MUTED = (98, 95, 88, 255)


def component_masks(image):
    rgb = image.convert("RGB")
    width, height = rgb.size
    remaining = set()
    for y in range(height):
        for x in range(width):
            r, g, b = rgb.getpixel((x, y))
            if r < 120 and g < 150 and b < 130:
                remaining.add((x, y))

    components = []
    while remaining:
        start = remaining.pop()
        stack = [start]
        points = [start]
        while stack:
            x, y = stack.pop()
            for neighbor in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    stack.append(neighbor)
                    points.append(neighbor)
        if len(points) > 100:
            components.append(points)

    components.sort(key=len, reverse=True)
    pieces = []
    for points in components[:3]:
        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
        crop = image.crop(box).convert("RGBA")
        pixels = crop.load()
        for y in range(crop.height):
            for x in range(crop.width):
                r, g, b, _ = pixels[x, y]
                darkness = max(0.0, min(1.0, (225 - ((r + g + b) / 3)) / 170))
                pixels[x, y] = (*PINE[:3], round(255 * darkness)) if darkness > 0.03 else (0, 0, 0, 0)
        pieces.append({"image": crop, "box": box})

    # Source component order by area is stem, upper, lower.
    return pieces


def transform_piece(piece, scale_x=1.0, scale_y=1.0):
    image = piece["image"]
    width = max(1, round(image.width * scale_x))
    height = max(1, round(image.height * scale_y))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def compose(pieces, adjustments):
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    source_origin = (46, 34)
    names = ("stem", "upper", "lower")
    for name, piece in zip(names, pieces):
        settings = adjustments.get(name, {})
        transformed = transform_piece(
            piece,
            settings.get("scale_x", 1.0),
            settings.get("scale_y", 1.0),
        )
        x0, y0, _, _ = piece["box"]
        x = 8 + (x0 - source_origin[0]) + settings.get("dx", 0)
        y = 8 + (y0 - source_origin[1]) + settings.get("dy", 0)

        if settings.get("anchor") == "right":
            x -= transformed.width - piece["image"].width
        if settings.get("anchor_y") == "bottom":
            y -= transformed.height - piece["image"].height

        canvas.alpha_composite(transformed, (round(x), round(y)))
    return canvas


source = Image.open(SOURCE).convert("RGBA")
pieces = component_masks(source)

variants = [
    ("A", "Canonical control", {}),
    ("B", "Tighter lower tuck", {"lower": {"dx": -6, "dy": -1}}),
    ("C", "More open counter", {"upper": {"dx": 5}, "lower": {"dx": 5}}),
    ("D", "Lighter stem", {"stem": {"scale_x": 0.92}}),
    ("E", "Balanced right mass", {"upper": {"scale_x": 0.96, "anchor": "right"}, "lower": {"scale_x": 0.94, "anchor": "right", "dy": 1}}),
    ("F", "Optically centered", {"stem": {"dx": 2}, "upper": {"dx": -2, "dy": 2}, "lower": {"dx": -3, "dy": -2}}),
]

rendered = []
for code, label, adjustments in variants:
    mark = compose(pieces, adjustments)
    path = OUTPUT / f"{code.lower()}-{label.lower().replace(' ', '-')}.png"
    mark.resize((1024, 1024), Image.Resampling.LANCZOS).save(path)
    rendered.append((code, label, mark))

board = Image.new("RGBA", (1536, 1050), CREAM)
draw = ImageDraw.Draw(board)

try:
    title_font = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 30)
    label_font = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 20)
    note_font = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 17)
except OSError:
    title_font = label_font = note_font = ImageFont.load_default()

draw.text((768, 48), "Chosen three-piece K · controlled refinement", font=title_font, fill=INK, anchor="ma")
draw.text((768, 88), "One variable changes per option; the source contours remain the authority.", font=note_font, fill=MUTED, anchor="ma")

cell_width = 460
cell_height = 410
start_x = 78
start_y = 150

for index, (code, label, mark) in enumerate(rendered):
    row = index // 3
    column = index % 3
    cell_x = start_x + column * 500
    cell_y = start_y + row * 430
    display = mark.resize((280, 280), Image.Resampling.LANCZOS)
    board.alpha_composite(display, (cell_x + 90, cell_y))
    draw.text((cell_x + 230, cell_y + 318), f"{code} · {label}", font=label_font, fill=INK, anchor="ma")

draw.text((768, 1010), "Locked: three pieces · implied K · 1:1 bounds · asymmetrical quilt character", font=note_font, fill=MUTED, anchor="ma")
board.save(OUTPUT / "chosen-k-refinement-board-01.png")
