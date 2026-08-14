from pathlib import Path
from xml.etree import ElementTree
from collections import Counter

from PIL import Image


APP_ROOT = Path(__file__).resolve().parents[2]
SITE_ROOT = APP_ROOT.parent / "kwilt-site"
DESKTOP_ROOT = APP_ROOT.parent / "kwilt-desktop"
APP_SVG = APP_ROOT / "assets" / "logo.svg"
APPROVED_SVG = (
    APP_ROOT
    / "docs"
    / "design-explorations"
    / "scalable-kwilt-mark"
    / "chosen-three-piece-k"
    / "refinement-round-08"
    / "l2-clear-small-scale-air.svg"
)

PINE = (49, 85, 69)
WHITE = (255, 255, 255)
PARCHMENT = (250, 247, 237)


def paths(path: Path) -> list[tuple[str, str]]:
    root = ElementTree.parse(path).getroot()
    return [
        (node.attrib.get("transform", ""), node.attrib["d"])
        for node in root.findall("{http://www.w3.org/2000/svg}g/{http://www.w3.org/2000/svg}path")
    ]


def component_count(mask: Image.Image) -> int:
    width, height = mask.size
    pixels = mask.load()
    seen: set[tuple[int, int]] = set()
    components = 0
    for y in range(height):
        for x in range(width):
            if pixels[x, y] == 0 or (x, y) in seen:
                continue
            components += 1
            stack = [(x, y)]
            seen.add((x, y))
            while stack:
                current_x, current_y = stack.pop()
                for neighbor in (
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x, current_y - 1),
                    (current_x, current_y + 1),
                ):
                    neighbor_x, neighbor_y = neighbor
                    if not (0 <= neighbor_x < width and 0 <= neighbor_y < height):
                        continue
                    if neighbor in seen or pixels[neighbor_x, neighbor_y] == 0:
                        continue
                    seen.add(neighbor)
                    stack.append(neighbor)
    return components


def verify_transparent_mark(path: Path, size: int, color: tuple[int, int, int]) -> None:
    image = Image.open(path).convert("RGBA")
    assert image.size == (size, size), f"Unexpected dimensions for {path}: {image.size}"
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    assert alpha.getbbox(), f"No visible mark in {path}"
    assert component_count(alpha) == 3, f"K2 must remain three separate pieces in {path}"
    visible_colors = [pixel[:3] for pixel in image.getdata() if pixel[3] >= 250]
    dominant = Counter(visible_colors).most_common(1)[0][0]
    assert dominant == color, f"Unexpected brand color in {path}: {dominant}"


def verify_opaque_icon(path: Path, size: int) -> None:
    image = Image.open(path).convert("RGB")
    assert image.size == (size, size), f"Unexpected dimensions for {path}: {image.size}"
    pine_mask = Image.new("1", image.size)
    pine_mask.putdata([1 if pixel == PINE else 0 for pixel in image.getdata()])
    assert component_count(pine_mask) == 3, f"K2 must remain three separate pieces in {path}"
    assert image.getpixel((0, 0)) == WHITE, f"Expected white app-icon background in {path}"


def main() -> None:
    approved_paths = paths(APPROVED_SVG)
    assert len(approved_paths) == 3
    assert paths(APP_SVG) == approved_paths, "Production SVG contours or placement drifted from approved K2"
    assert paths(DESKTOP_ROOT / "src" / "assets" / "kwilt-logo.svg") == approved_paths
    assert "#315545" in (DESKTOP_ROOT / "src" / "assets" / "kwilt-logo.svg").read_text()

    transparent_assets = [
        (APP_ROOT / "assets" / "logo-white.png", 501, WHITE),
        (APP_ROOT / "assets" / "logo-parchment.png", 501, PARCHMENT),
        (APP_ROOT / "assets" / "favicon.png", 129, PINE),
        (APP_ROOT / "assets" / "notification-icon.png", 96, WHITE),
        (SITE_ROOT / "public" / "assets" / "brand" / "logo.png", 512, PINE),
        (SITE_ROOT / "public" / "assets" / "brand" / "logo-white.png", 501, WHITE),
        (SITE_ROOT / "public" / "assets" / "brand" / "logo-parchment.png", 501, PARCHMENT),
        (SITE_ROOT / "public" / "assets" / "email" / "logo@2x.png", 129, PINE),
        (DESKTOP_ROOT / "src-tauri" / "icons" / "icon.png", 512, PINE),
        (DESKTOP_ROOT / "src-tauri" / "icons" / "tray-logo-template.png", 44, WHITE),
    ]
    for path, size, color in transparent_assets:
        verify_transparent_mark(path, size, color)

    verify_opaque_icon(APP_ROOT / "assets" / "icon.png", 1024)
    assert (APP_ROOT / "assets" / "archive" / "pre-k2-2026-08-13" / "logo.svg").read_text() != APP_SVG.read_text()

    config = (APP_ROOT / "app.config.ts").read_text()
    assert "icon: './assets/icon.png'" in config
    assert "foregroundImage: './assets/adaptive-icon.png'" in config
    assert "icon: './assets/notification-icon.png'" in config
    assert "color: '#315545'" in config
    print("K2 brand assets verified across Kwilt, kwilt-site, and kwilt-desktop.")


if __name__ == "__main__":
    main()
