from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
ART = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
QA = ART / "qa"
PREVIEWS = QA / "previews"
CELL = (160, 128)
WALK_TIMING = [120, 90, 100, 105, 120, 90, 100, 105]
RUN_TIMING = [70, 45, 65, 55, 70, 50, 65, 55]

ROWS = (
    ("baby", "walk", "leafling-stage-atlas-v2.png", 2, 38),
    ("baby", "run", "leafling-stage-atlas-v2.png", 3, 38),
    ("young", "walk", "leafling-motion-atlas-v4.png", 7, 46),
    ("young", "run", "leafling-motion-atlas-v4.png", 8, 46),
    ("guardian", "walk", "leafling-stage-atlas-v2.png", 4, 62),
    ("guardian", "run", "leafling-stage-atlas-v2.png", 5, 62),
)


def frames(atlas_name: str, row: int) -> list[Image.Image]:
    atlas = Image.open(PUBLIC / atlas_name).convert("RGBA")
    return [atlas.crop((column * CELL[0], row * CELL[1], (column + 1) * CELL[0], (row + 1) * CELL[1])) for column in range(8)]


def world_frame(frame: Image.Image, height: int, canvas=(240, 144)) -> Image.Image:
    output = Image.new("RGBA", canvas, "#d6e4c5")
    draw = ImageDraw.Draw(output)
    ground = 119
    draw.rectangle((0, ground, canvas[0], canvas[1]), fill="#78955a")
    draw.line((0, ground, canvas[0], ground), fill="#445f38", width=2)
    scale = height / CELL[1]
    display = frame.resize((round(CELL[0] * scale), height), Image.Resampling.NEAREST)
    anchor_x = round(80 * scale)
    anchor_y = round(120 * scale)
    output.alpha_composite(display, (canvas[0] // 2 - anchor_x, ground - anchor_y))
    return output


def main() -> None:
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (240 * 4, 186 * 6), "#f5f0e6")
    draw = ImageDraw.Draw(sheet)
    for row_index, (stage, motion, atlas_name, atlas_row, height) in enumerate(ROWS):
        motion_frames = frames(atlas_name, atlas_row)
        for column, frame_index in enumerate((0, 2, 4, 6)):
            rendered = world_frame(motion_frames[frame_index], height)
            sheet.alpha_composite(rendered, (column * 240, row_index * 186 + 28))
        draw.text((12, row_index * 186 + 7), f"{stage.upper()} / {motion.upper()} / {height}px world height", fill="#20331c")

        preview_frames = [world_frame(frame, height, (320, 200)) for frame in motion_frames]
        durations = WALK_TIMING if motion == "walk" else RUN_TIMING
        preview_frames[0].save(
            PREVIEWS / f"{stage}-{motion}.gif",
            save_all=True,
            append_images=preview_frames[1:],
            duration=durations,
            loop=0,
            disposal=2,
        )
    sheet.save(QA / "contact-sheet.png")


if __name__ == "__main__":
    main()
