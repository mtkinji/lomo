from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ART = Path(__file__).resolve().parent
SOURCE = ART / "source"
PUBLIC = ROOT / "public"
QA = ART / "qa"

CELL_W = 160
CELL_H = 128
BASELINE = 120
SCALE = 0.40
KEY = (255, 0, 255)


def looks_like_key(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha < 16:
        return True
    distance = ((red - KEY[0]) ** 2 + green**2 + (blue - KEY[2]) ** 2) ** 0.5
    return red > 175 and blue > 175 and green < 155 and abs(red - blue) < 110 and distance < 150


def remove_connected_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    queue: deque[tuple[int, int]] = deque()
    background: set[tuple[int, int]] = set()

    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if (x, y) in background or not looks_like_key(pixels[x, y]):
            continue
        background.add((x, y))
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in background:
                queue.append((nx, ny))

    output = rgba.copy()
    output_pixels = output.load()
    for x, y in background:
        red, green, blue, _ = output_pixels[x, y]
        output_pixels[x, y] = (red, green, blue, 0)
    return output


def components(image: Image.Image) -> list[tuple[int, int, int, int]]:
    width, height = image.size
    pixels = image.load()
    seen: set[tuple[int, int]] = set()
    boxes: list[tuple[int, int, int, int]] = []

    for y in range(height):
        for x in range(width):
            if (x, y) in seen or pixels[x, y][3] < 16:
                continue
            queue = deque([(x, y)])
            seen.add((x, y))
            xs: list[int] = []
            ys: list[int] = []
            while queue:
                px, py = queue.popleft()
                xs.append(px)
                ys.append(py)
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    if (nx, ny) in seen or pixels[nx, ny][3] < 16:
                        continue
                    seen.add((nx, ny))
                    queue.append((nx, ny))
            if len(xs) > 500:
                boxes.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))

    boxes.sort(key=lambda box: box[0])
    if len(boxes) != 8:
        raise RuntimeError(f"Expected eight poses, found {len(boxes)}: {boxes}")
    return boxes


def keep_largest_component(image: Image.Image) -> tuple[Image.Image, int]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    seen: set[tuple[int, int]] = set()
    groups: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            if (x, y) in seen or pixels[x, y][3] < 16:
                continue
            queue = deque([(x, y)])
            seen.add((x, y))
            group: list[tuple[int, int]] = []
            while queue:
                px, py = queue.popleft()
                group.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    if (nx, ny) in seen or pixels[nx, ny][3] < 16:
                        continue
                    seen.add((nx, ny))
                    queue.append((nx, ny))
            groups.append(group)

    if not groups:
        raise RuntimeError("Pose crop contains no opaque component")
    keep = max(groups, key=len)
    removed = 0
    for group in groups:
        if group is keep:
            continue
        for x, y in group:
            red, green, blue, _ = pixels[x, y]
            pixels[x, y] = (red, green, blue, 0)
            removed += 1
    return rgba, removed


def main() -> None:
    QA.mkdir(parents=True, exist_ok=True)
    generated_path = SOURCE / "guardian-aerial-generated.png"
    attention_path = ROOT / "art/leafling-interactions-v1/source/guardian-jump-strip.png"
    generated = remove_connected_key(Image.open(generated_path))
    attention = remove_connected_key(Image.open(attention_path))
    generated_boxes = components(generated)
    attention_boxes = components(attention)

    # Image generation produced excellent acrobatic drawings but began in
    # midair. Reuse the approved Guardian sightline drawing, then order the new
    # poses into one physically coherent performance.
    selection = [
        ("guardian-jump", attention, attention_boxes[0], 0),
        ("guardian-aerial", generated, generated_boxes[1], 1),
        ("guardian-aerial", generated, generated_boxes[2], 2),
        ("guardian-aerial", generated, generated_boxes[0], 0),
        ("guardian-aerial", generated, generated_boxes[4], 4),
        ("guardian-aerial", generated, generated_boxes[5], 5),
        ("guardian-aerial", generated, generated_boxes[6], 6),
        ("guardian-aerial", generated, generated_boxes[7], 7),
    ]

    row = Image.new("RGBA", (CELL_W * 8, CELL_H), (0, 0, 0, 0))
    report_frames = []
    for column, (source_id, source, box, source_index) in enumerate(selection):
        crop, removed_pixels = keep_largest_component(source.crop(box))
        width = max(1, round(crop.width * SCALE))
        height = max(1, round(crop.height * SCALE))
        if width > CELL_W - 8 or height > CELL_H - 4:
            raise RuntimeError(f"Frame {column} exceeds its cell after normalization: {(width, height)}")
        pose = crop.resize((width, height), Image.Resampling.NEAREST)
        x = column * CELL_W + round((CELL_W - width) / 2)
        y = BASELINE - height
        if y < 0:
            raise RuntimeError(f"Frame {column} crosses the top cell edge: y={y}")
        row.alpha_composite(pose, (x, y))
        report_frames.append({
            "frame": column,
            "source": source_id,
            "source_frame": source_index,
            "source_box": box,
            "destination": [x - column * CELL_W, y, width, height],
            "removed_intruding_pixels": removed_pixels,
        })

    row.save(SOURCE / "guardian-aerial-approved-strip.png")

    source_atlas = Image.open(PUBLIC / "leafling-stage-atlas-v3.png").convert("RGBA")
    expected_size = (CELL_W * 8, CELL_H * 12)
    if source_atlas.size != expected_size:
        raise RuntimeError(f"Unexpected stage atlas size: {source_atlas.size}, expected {expected_size}")
    atlas = Image.new("RGBA", (CELL_W * 8, CELL_H * 13), (0, 0, 0, 0))
    atlas.alpha_composite(source_atlas, (0, 0))
    atlas.alpha_composite(row, (0, CELL_H * 12))
    atlas.save(PUBLIC / "leafling-stage-atlas-v4.png")

    report = {
        "cell": [CELL_W, CELL_H],
        "baseline": BASELINE,
        "scale": SCALE,
        "atlas": "public/leafling-stage-atlas-v4.png",
        "atlas_row": 12,
        "canonical_facing": "screen-right",
        "frames": report_frames,
    }
    (QA / "assembly.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
