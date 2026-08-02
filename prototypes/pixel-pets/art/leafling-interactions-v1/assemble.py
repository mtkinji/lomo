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
BASE_SCALES = {"baby": 0.50, "young": 0.465, "guardian": 0.475}


def looks_like_key(pixel: tuple[int, int, int, int], key: tuple[int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha < 16:
        return True
    distance = ((red - key[0]) ** 2 + (green - key[1]) ** 2 + (blue - key[2]) ** 2) ** 0.5
    return red > 175 and blue > 175 and green < 155 and abs(red - blue) < 110 and distance < 150


def border_key(image: Image.Image) -> tuple[int, int, int]:
    rgba = image.convert("RGBA")
    samples: list[tuple[int, int, int]] = []
    step_x = max(1, rgba.width // 96)
    step_y = max(1, rgba.height // 96)
    for x in range(0, rgba.width, step_x):
        samples.append(rgba.getpixel((x, 0))[:3])
        samples.append(rgba.getpixel((x, rgba.height - 1))[:3])
    for y in range(0, rgba.height, step_y):
        samples.append(rgba.getpixel((0, y))[:3])
        samples.append(rgba.getpixel((rgba.width - 1, y))[:3])
    channels = [sorted(sample[index] for sample in samples) for index in range(3)]
    middle = len(samples) // 2
    return channels[0][middle], channels[1][middle], channels[2][middle]


def remove_connected_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    key = border_key(rgba)
    queue: deque[tuple[int, int]] = deque()
    background: set[tuple[int, int]] = set()

    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if (x, y) in background or not looks_like_key(pixels[x, y], key):
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
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
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
        raise RuntimeError(f"Expected 8 poses, found {len(boxes)}: {boxes}")
    return boxes


def remove_tiny_detached_pixels(image: Image.Image, minimum_pixels: int = 300) -> tuple[Image.Image, int]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    seen: set[tuple[int, int]] = set()
    removed = 0

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
            if len(group) >= minimum_pixels:
                continue
            for px, py in group:
                red, green, blue, _ = pixels[px, py]
                pixels[px, py] = (red, green, blue, 0)
            removed += len(group)
    return rgba, removed


def interaction_row(stage: str, motion: str) -> tuple[Image.Image, dict]:
    source_path = SOURCE / f"{stage}-{motion}-strip.png"
    source = remove_connected_key(Image.open(source_path))
    boxes = components(source)
    overall_top = min(box[1] for box in boxes)
    overall_bottom = max(box[3] for box in boxes)
    widest = max(box[2] - box[0] for box in boxes)
    scale = min(
        BASE_SCALES[stage],
        (CELL_W - 8) / widest,
        (CELL_H - 4) / max(1, overall_bottom - overall_top),
    )

    prepared: list[tuple[Image.Image, int, int, tuple[int, int, int, int]]] = []
    removed_pixels = 0
    min_y = CELL_H
    max_y = 0
    for box in boxes:
        crop, removed = remove_tiny_detached_pixels(source.crop(box))
        removed_pixels += removed
        width = max(1, round(crop.width * scale))
        height = max(1, round(crop.height * scale))
        resized = crop.resize((width, height), Image.Resampling.NEAREST)
        x = round((CELL_W - width) / 2)
        y = round(BASELINE - (overall_bottom - box[1]) * scale)
        prepared.append((resized, x, y, box))
        min_y = min(min_y, y)
        max_y = max(max_y, y + height)

    row_shift = max(0, -min_y)
    if max_y + row_shift > CELL_H:
        row_shift -= max_y + row_shift - CELL_H

    row = Image.new("RGBA", (CELL_W * 8, CELL_H), (0, 0, 0, 0))
    placements = []
    for index, (pose, x, y, box) in enumerate(prepared):
        x += index * CELL_W
        y += row_shift
        if x < index * CELL_W or x + pose.width > (index + 1) * CELL_W or y < 0 or y + pose.height > CELL_H:
            raise RuntimeError((stage, motion, index, (x, y, pose.width, pose.height), box))
        row.alpha_composite(pose, (x, y))
        placements.append({
            "frame": index,
            "source_box": box,
            "destination": [x - index * CELL_W, y, pose.width, pose.height],
        })

    return row, {
        "stage": stage,
        "motion": motion,
        "scale": scale,
        "source": str(source_path.relative_to(ROOT)),
        "source_size": source.size,
        "source_vertical_span": [overall_top, overall_bottom],
        "canonical_facing": "direction-neutral" if motion == "rollover" else "screen-right",
        "mirrored_from_source": False,
        "row_shift": row_shift,
        "removed_tiny_detached_pixels": removed_pixels,
        "frames": placements,
    }


def append_rows(source_path: Path, source_rows: int, rows: list[tuple[int, str, str]]) -> tuple[Image.Image, list[dict]]:
    source = Image.open(source_path).convert("RGBA")
    expected = (CELL_W * 8, CELL_H * source_rows)
    if source.size != expected:
        raise RuntimeError(f"Unexpected atlas size for {source_path}: {source.size}, expected {expected}")
    total_rows = max(row_index for row_index, _, _ in rows) + 1
    atlas = Image.new("RGBA", (CELL_W * 8, CELL_H * total_rows), (0, 0, 0, 0))
    atlas.alpha_composite(source, (0, 0))
    reports = []
    for row_index, stage, motion in rows:
        row, report = interaction_row(stage, motion)
        atlas.alpha_composite(row, (0, row_index * CELL_H))
        report["atlas_row"] = row_index
        reports.append(report)
    return atlas, reports


def main() -> None:
    QA.mkdir(parents=True, exist_ok=True)
    report = {"cell": [CELL_W, CELL_H], "baseline": BASELINE, "rows": []}

    young, young_reports = append_rows(
        PUBLIC / "leafling-motion-atlas-v4.png",
        9,
        [(9, "young", "jump"), (10, "young", "pounce"), (11, "young", "rollover")],
    )
    young.save(PUBLIC / "leafling-motion-atlas-v5.png")
    report["rows"].extend(young_reports)

    stages, stage_reports = append_rows(
        PUBLIC / "leafling-stage-atlas-v2.png",
        6,
        [
            (6, "baby", "jump"),
            (7, "baby", "pounce"),
            (8, "baby", "rollover"),
            (9, "guardian", "jump"),
            (10, "guardian", "pounce"),
            (11, "guardian", "rollover"),
        ],
    )
    stages.save(PUBLIC / "leafling-stage-atlas-v3.png")
    report["rows"].extend(stage_reports)

    (QA / "assembly.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
