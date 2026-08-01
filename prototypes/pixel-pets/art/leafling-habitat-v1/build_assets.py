from collections import deque
from pathlib import Path

from PIL import Image


ART = Path(__file__).resolve().parent
ROOT = ART.parents[1]
SOURCE = ART / "source"
PUBLIC = ROOT / "public"


def remove_connected_magenta(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def key_like(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return red >= 165 and blue >= 135 and green <= 125 and red + blue >= green * 3.2

    for x in range(width):
        if key_like(x, 0):
            queue.append((x, 0))
        if key_like(x, height - 1):
            queue.append((x, height - 1))
    for y in range(height):
        if key_like(0, y):
            queue.append((0, y))
        if key_like(width - 1, y):
            queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        offset = y * width + x
        if visited[offset] or not key_like(x, y):
            continue
        visited[offset] = 1
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        if x:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    # Canopy and grass silhouettes contain enclosed background pockets that are
    # not connected to an outer edge. The prompt forbids magenta in the art, so
    # removing every remaining key-like pixel is deterministic and safe.
    for y in range(height):
        for x in range(width):
            if key_like(x, y):
                red, green, blue, _ = pixels[x, y]
                pixels[x, y] = (red, green, blue, 0)
                continue
            red, green, blue, alpha = pixels[x, y]
            if alpha and red > green * 1.28 and blue > green * 1.28:
                # Neutralize antialiased key-color spill into an olive-brown
                # edge that belongs to the habitat palette.
                pixels[x, y] = (
                    min(255, max(green, round((red + green) * 0.52))),
                    green,
                    min(green, round((blue + green) * 0.34)),
                    alpha,
                )

    return rgba


def alpha_crop(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("Chroma removal produced an empty asset")
    return image.crop(bounds)


def build_backdrop() -> None:
    source = Image.open(SOURCE / "backdrop-source.png").convert("RGB")
    width, height = source.size
    source_ground = round(height * 0.75)
    sky = source.crop((0, 0, width, source_ground)).resize((480, 208), Image.Resampling.NEAREST)
    earth = source.crop((0, source_ground, width, height)).resize((480, 32), Image.Resampling.NEAREST)
    output = Image.new("RGB", (480, 240))
    output.paste(sky, (0, 0))
    output.paste(earth, (0, 208))
    output.save(PUBLIC / "leafling-habitat-backdrop-v1.png", optimize=True)


def build_tree() -> None:
    source = alpha_crop(remove_connected_magenta(Image.open(SOURCE / "shelter-tree-keyed.png")))
    source.thumbnail((176, 196), Image.Resampling.NEAREST)
    output = Image.new("RGBA", (176, 196))
    output.alpha_composite(source, ((176 - source.width) // 2, 196 - source.height))
    output.save(PUBLIC / "leafling-shelter-tree-v1.png", optimize=True)


def build_foreground() -> None:
    source = alpha_crop(remove_connected_magenta(Image.open(SOURCE / "foreground-keyed.png")))
    source = source.resize((480, 8), Image.Resampling.NEAREST)
    output = Image.new("RGBA", (480, 64))
    output.alpha_composite(source, (0, 0))
    output.save(PUBLIC / "leafling-meadow-foreground-v1.png", optimize=True)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    build_backdrop()
    build_tree()
    build_foreground()


if __name__ == "__main__":
    main()
