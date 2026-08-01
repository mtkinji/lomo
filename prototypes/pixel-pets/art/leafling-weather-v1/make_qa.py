from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
ART = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
QA = ART / "qa"
PREVIEWS = QA / "previews"

CELL = (160, 128)
LABEL_WIDTH = 152
ROW_HEIGHT = 148
BACKGROUND = "#f4f1e8"
ALT_BACKGROUND = "#e8eee0"
INK = "#263327"


CLIPS = {
    "baby": {
        "weather-notice": ("leafling-stage-atlas-v3.png", [(0, 0), (3, 0), (3, 0), (0, 0)], [390, 90, 250, 470]),
        "wind-brace": ("leafling-stage-atlas-v3.png", [(0, 7), (1, 7), (2, 7), (1, 7), (0, 0)], [230, 80, 420, 95, 320]),
        "rain-flinch": ("leafling-stage-atlas-v3.png", [(3, 0), (1, 7), (2, 7), (3, 0), (0, 0)], [240, 70, 90, 80, 340]),
        "sun-bask": ("leafling-stage-atlas-v3.png", [(0, 0), (2, 0), (5, 0), (6, 0), (7, 0), (7, 0)], [280, 90, 180, 240, 560, 640]),
    },
    "young": {
        "weather-notice": ("leafling-motion-atlas-v5.png", [(0, 4), (1, 4), (2, 4), (3, 4), (0, 4)], [360, 80, 90, 240, 430]),
        "wind-brace": ("leafling-motion-atlas-v5.png", [(0, 10), (1, 10), (2, 10), (1, 10), (0, 0)], [220, 90, 560, 130, 420]),
        "rain-flinch": ("leafling-motion-atlas-v5.png", [(0, 4), (1, 2), (2, 2), (6, 2), (0, 0)], [250, 70, 90, 80, 320]),
        "sun-bask": ("leafling-motion-atlas-v5.png", [(2, 0), (3, 0), (4, 0), (5, 0), (4, 0)], [260, 90, 520, 340, 460]),
    },
    "guardian": {
        "weather-notice": ("leafling-stage-atlas-v4.png", [(0, 1), (3, 1), (3, 1), (0, 1)], [390, 90, 250, 470]),
        "wind-brace": ("leafling-stage-atlas-v4.png", [(0, 10), (1, 10), (2, 10), (1, 10), (0, 1)], [230, 80, 660, 160, 520]),
        "rain-flinch": ("leafling-stage-atlas-v4.png", [(3, 1), (1, 10), (2, 10), (3, 1), (0, 1)], [240, 70, 90, 80, 340]),
        "sun-bask": ("leafling-stage-atlas-v4.png", [(0, 1), (3, 1), (2, 1), (3, 1), (2, 1)], [320, 120, 680, 220, 580]),
    },
}


def atlas_frame(atlas: Image.Image, column: int, row: int) -> Image.Image:
    left = column * CELL[0]
    top = row * CELL[1]
    return atlas.crop((left, top, left + CELL[0], top + CELL[1]))


def on_background(frame: Image.Image, color: str, scale: int = 1) -> Image.Image:
    canvas = Image.new("RGB", (CELL[0], CELL[1]), color)
    canvas.paste(frame, (0, 0), frame)
    return canvas.resize((CELL[0] * scale, CELL[1] * scale), Image.Resampling.NEAREST)


def main() -> None:
    QA.mkdir(parents=True, exist_ok=True)
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    atlas_cache: dict[str, Image.Image] = {}
    rows = sum(len(clips) for clips in CLIPS.values())
    max_frames = max(len(cells) for clips in CLIPS.values() for _, cells, _ in clips.values())
    sheet = Image.new("RGB", (LABEL_WIDTH + CELL[0] * max_frames, ROW_HEIGHT * rows + 28), BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 8), "LEAFLING WEATHER ACTING · APPROVED DRAWING REMIX", fill=INK)

    row_index = 0
    for stage, clips in CLIPS.items():
        for clip_id, (atlas_name, cells, durations) in clips.items():
            atlas = atlas_cache.setdefault(atlas_name, Image.open(PUBLIC / atlas_name).convert("RGBA"))
            y = 28 + row_index * ROW_HEIGHT
            row_color = ALT_BACKGROUND if row_index % 2 == 0 else BACKGROUND
            draw.rectangle((0, y, sheet.width, y + ROW_HEIGHT), fill=row_color)
            draw.text((12, y + 48), stage.upper(), fill=INK)
            draw.text((12, y + 66), clip_id, fill=INK)
            frames = [atlas_frame(atlas, column, row) for column, row in cells]
            for frame_index, frame in enumerate(frames):
                sheet.paste(on_background(frame, row_color), (LABEL_WIDTH + frame_index * CELL[0], y))
                draw.text((LABEL_WIDTH + frame_index * CELL[0] + 6, y + 130), str(frame_index + 1), fill=INK)

            gif_frames = [on_background(frame, BACKGROUND, scale=2) for frame in frames]
            gif_frames[0].save(
                PREVIEWS / f"{stage}-{clip_id}.gif",
                save_all=True,
                append_images=gif_frames[1:],
                duration=durations,
                loop=0,
                disposal=2,
            )
            row_index += 1

    sheet.save(QA / "contact-sheet.png")


if __name__ == "__main__":
    main()
