from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "refinement-round-01" / "assets" / "f-optically-centered.png"
CREAM = (247, 242, 232, 255)
INK = (23, 24, 23, 255)
MUTED = (98, 95, 88, 255)


def connected_pieces(image):
    active = set()
    for y in range(image.height):
        for x in range(image.width):
            if image.getpixel((x, y))[3] > 32:
                active.add((x, y))

    components = []
    while active:
        seed = active.pop()
        stack = [seed]
        points = [seed]
        while stack:
            x, y = stack.pop()
            for neighbor in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if neighbor in active:
                    active.remove(neighbor)
                    stack.append(neighbor)
                    points.append(neighbor)
        if len(points) > 100:
            xs = [point[0] for point in points]
            ys = [point[1] for point in points]
            box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
            crop = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
            source_pixels = image.load()
            crop_pixels = crop.load()
            for x, y in points:
                crop_pixels[x - box[0], y - box[1]] = source_pixels[x, y]
            components.append({"area": len(points), "box": box, "image": crop})

    components.sort(key=lambda item: item["area"], reverse=True)
    return components


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
stem, upper, lower = connected_pieces(source)

# Preserve the actual F upper and lower contours byte-for-byte. Balanced Air
# changes only stem width and spacing: narrow the stem from its right side,
# then move the untouched right pieces outward and slightly apart.
output = Image.new("RGBA", source.size, (0, 0, 0, 0))

stem_image = stem["image"].resize(
    (round(stem["image"].width * 0.88), stem["image"].height),
    Image.Resampling.LANCZOS,
)
stem_x, stem_y = stem["box"][0], stem["box"][1]
output.alpha_composite(stem_image, (stem_x, stem_y))

upper_x, upper_y = upper["box"][0] + 12, upper["box"][1] - 4
lower_x, lower_y = lower["box"][0] + 12, lower["box"][1] + 8
output.alpha_composite(upper["image"], (upper_x, upper_y))
output.alpha_composite(lower["image"], (lower_x, lower_y))

output.save(ROOT / "j1-f-contours-balanced-air.png")

opaque = Image.new("RGBA", source.size, CREAM)
opaque.alpha_composite(output)
opaque.convert("RGB").save(ROOT / "j1-f-contours-balanced-air-opaque.png", quality=100)

board = Image.new("RGBA", (1200, 720), CREAM)
draw = ImageDraw.Draw(board)
draw.text((600, 58), "Return to F · original contour authority", fill=INK, font=font(30), anchor="mm")
draw.text((600, 94), "Original lemon and quadrant contours preserved · Balanced Air spacing only", fill=MUTED, font=font(17), anchor="mm")

for center_x, mark, label, note in (
    (330, source, "F · Original", "optically centered source"),
    (870, output, "J1 · F + Balanced Air", "12% slimmer stem · modestly wider gaps"),
):
    large = mark.resize((320, 320), Image.Resampling.LANCZOS)
    board.alpha_composite(large, (center_x - 160, 150))
    draw.rectangle((center_x - 160, 150, center_x + 160, 470), outline=(217, 210, 198, 255), width=1)
    draw.text((center_x, 518), label, fill=INK, font=font(21), anchor="mm")
    draw.text((center_x, 550), note, fill=MUTED, font=font(17), anchor="mm")
    small = mark.resize((28, 28), Image.Resampling.LANCZOS)
    board.alpha_composite(small, (center_x - 14, 598))

draw.text((600, 674), "28-pixel comparison", fill=MUTED, font=font(17), anchor="mm")
board.convert("RGB").save(ROOT / "f-original-vs-balanced-air.png", quality=100)
