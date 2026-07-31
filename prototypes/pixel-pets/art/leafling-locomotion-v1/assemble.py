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
SCALES = {"baby": 0.50, "young": 0.465, "guardian": 0.475}


def is_foreground(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha < 16:
        return False
    return not (red > 210 and blue > 210 and green < 80)


def components(image: Image.Image) -> list[tuple[int, int, int, int]]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    seen: set[tuple[int, int]] = set()
    boxes: list[tuple[int, int, int, int]] = []

    for y in range(height):
        for x in range(width):
            if (x, y) in seen or not is_foreground(pixels[x, y]):
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
                    if (nx, ny) in seen or not is_foreground(pixels[nx, ny]):
                        continue
                    seen.add((nx, ny))
                    queue.append((nx, ny))
            if len(xs) > 500:
                boxes.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))

    boxes.sort(key=lambda box: box[0])
    if len(boxes) != 8:
        raise RuntimeError(f"Expected 8 poses, found {len(boxes)}: {boxes}")
    return boxes


def keyed_crop(image: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    crop = image.convert("RGBA").crop(box)
    data = []
    for red, green, blue, alpha in crop.getdata():
        if red > 210 and blue > 210 and green < 100:
            data.append((red, green, blue, 0))
        else:
            data.append((red, green, blue, alpha))
    crop.putdata(data)
    return crop


def locomotion_row(stage: str, motion: str) -> tuple[Image.Image, dict]:
    source = Image.open(SOURCE / f"{stage}-{motion}-strip.png").convert("RGBA")
    boxes = components(source)
    scale = SCALES[stage]
    overall_top = min(box[1] for box in boxes)
    overall_bottom = max(box[3] for box in boxes)

    # Preserve each pose's authored vertical relationship to the shared source
    # baseline. If the generated row has a few pixels of uneven outer padding,
    # shift the whole row together rather than independently grounding frames.
    placements = []
    min_y = CELL_H
    max_y = 0
    prepared = []
    mirror_to_canonical_facing = stage == "guardian" and motion == "walk"
    for box in boxes:
        crop = keyed_crop(source, box)
        width = max(1, round(crop.width * scale))
        height = max(1, round(crop.height * scale))
        resized = crop.resize((width, height), Image.Resampling.NEAREST)
        if mirror_to_canonical_facing:
            resized = resized.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        x = round((CELL_W - width) / 2)
        y = round(BASELINE - (overall_bottom - box[1]) * scale)
        prepared.append((resized, x, y, box))
        min_y = min(min_y, y)
        max_y = max(max_y, y + height)

    row_shift = max(0, -min_y)
    if max_y + row_shift > CELL_H:
        row_shift -= max_y + row_shift - CELL_H

    row = Image.new("RGBA", (CELL_W * 8, CELL_H), (0, 0, 0, 0))
    for index, (pose, x, y, box) in enumerate(prepared):
        x += index * CELL_W
        y += row_shift
        if x < index * CELL_W or x + pose.width > (index + 1) * CELL_W or y < 0 or y + pose.height > CELL_H:
            raise RuntimeError((stage, motion, index, (x, y, pose.width, pose.height), box, overall_bottom))
        row.alpha_composite(pose, (x, y))
        placements.append({"frame": index, "source_box": box, "destination": [x - index * CELL_W, y, pose.width, pose.height]})

    return row, {
        "stage": stage,
        "motion": motion,
        "scale": scale,
        "source_size": source.size,
        "source_vertical_span": [overall_top, overall_bottom],
        "canonical_facing": "screen-right",
        "mirrored_from_source": mirror_to_canonical_facing,
        "row_shift": row_shift,
        "frames": placements,
    }


def padded_existing_rows(source_path: Path, rows: int) -> Image.Image:
    source = Image.open(source_path).convert("RGBA")
    atlas = Image.new("RGBA", (CELL_W * 8, CELL_H * rows), (0, 0, 0, 0))
    for row in range(rows):
        for column in range(8):
            frame = source.crop((column * 128, row * 128, (column + 1) * 128, (row + 1) * 128))
            atlas.alpha_composite(frame, (column * CELL_W + (CELL_W - 128) // 2, row * CELL_H))
    return atlas


def main() -> None:
    QA.mkdir(parents=True, exist_ok=True)
    report = {"cell": [CELL_W, CELL_H], "baseline": BASELINE, "rows": []}

    young = padded_existing_rows(PUBLIC / "leafling-motion-atlas-v3.png", 7)
    for row_index, motion in ((7, "walk"), (8, "run")):
        row, row_report = locomotion_row("young", motion)
        expanded = Image.new("RGBA", (CELL_W * 8, CELL_H * 9), (0, 0, 0, 0))
        expanded.alpha_composite(young, (0, 0))
        young = expanded
        young.alpha_composite(row, (0, row_index * CELL_H))
        report["rows"].append(row_report)
    young.save(PUBLIC / "leafling-motion-atlas-v4.png")

    stages = padded_existing_rows(PUBLIC / "leafling-stage-atlas-v1.png", 2)
    expanded_stages = Image.new("RGBA", (CELL_W * 8, CELL_H * 6), (0, 0, 0, 0))
    expanded_stages.alpha_composite(stages, (0, 0))
    for row_index, stage, motion in (
        (2, "baby", "walk"),
        (3, "baby", "run"),
        (4, "guardian", "walk"),
        (5, "guardian", "run"),
    ):
        row, row_report = locomotion_row(stage, motion)
        expanded_stages.alpha_composite(row, (0, row_index * CELL_H))
        report["rows"].append(row_report)
    expanded_stages.save(PUBLIC / "leafling-stage-atlas-v2.png")

    (QA / "assembly.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
