from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
CONTROL = ROOT.parent / "refinement-round-07" / "k2-optically-centered-even-gaps.svg"
OPTIONS = [
    ("K2 · Current", "29–31 unit channels", CONTROL),
    ("L1 · Hair more air", "+3–5 units", ROOT / "l1-hair-more-air.svg"),
    ("L2 · Clear small-scale air", "+5–8 units", ROOT / "l2-clear-small-scale-air.svg"),
]

PINE = (49, 85, 69, 255)
WHITE = (255, 255, 255, 255)
PARCHMENT = (250, 247, 237, 255)
INK = (31, 31, 29, 255)
MUTED = (105, 101, 95, 255)


def font(size: int, bold: bool = False):
    candidates = (
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render_svg(source: Path, output: Path) -> Image.Image:
    subprocess.run(
        ["sips", "-s", "format", "png", "-z", "1024", "1024", str(source), "--out", str(output)],
        check=True,
        capture_output=True,
    )
    return Image.open(output).convert("RGBA")


def recolor(mark: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    alpha = mark.getchannel("A")
    result = Image.new("RGBA", mark.size, color)
    result.putalpha(alpha)
    return result


def tile(mark: Image.Image, size: int, background: tuple[int, int, int, int], foreground: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", (88, 88), background)
    small = recolor(mark.resize((size, size), Image.Resampling.LANCZOS), foreground)
    offset = (88 - size) // 2
    canvas.alpha_composite(small, (offset, offset))
    return canvas


board = Image.new("RGBA", (1500, 1060), PARCHMENT)
draw = ImageDraw.Draw(board)
draw.text((750, 48), "K2 small-scale breathing room", fill=INK, font=font(32, True), anchor="mm")
draw.text((750, 88), "Contours locked · placement only · review the 18-point row first", fill=MUTED, font=font(18), anchor="mm")

with TemporaryDirectory() as temporary_directory:
    temporary = Path(temporary_directory)
    for index, (label, note, source) in enumerate(OPTIONS):
        center_x = 270 + index * 480
        mark = render_svg(source, temporary / f"mark-{index}.png")
        large = mark.resize((272, 272), Image.Resampling.LANCZOS)
        board.alpha_composite(large, (center_x - 136, 130))
        draw.text((center_x, 438), label, fill=INK, font=font(22, True), anchor="mm")
        draw.text((center_x, 470), note, fill=MUTED, font=font(17), anchor="mm")

        for row, size in enumerate((18, 21, 28)):
            y = 526 + row * 112
            draw.text((center_x - 132, y + 44), f"{size} pt", fill=MUTED, font=font(16), anchor="rm")
            board.alpha_composite(tile(mark, size, WHITE, PINE), (center_x - 112, y))
            board.alpha_composite(tile(mark, size, PINE, WHITE), (center_x + 12, y))

        pixel_sample = recolor(mark.resize((18, 18), Image.Resampling.LANCZOS), WHITE)
        pixel_sample = pixel_sample.resize((144, 144), Image.Resampling.NEAREST)
        zoom = Image.new("RGBA", (160, 160), PINE)
        zoom.alpha_composite(pixel_sample, (8, 8))
        board.alpha_composite(zoom, (center_x - 80, 878))

draw.text((750, 850), "18-point raster enlarged 8×", fill=MUTED, font=font(17), anchor="mm")
board.convert("RGB").save(ROOT / "small-scale-breathing-room.png", quality=100)
