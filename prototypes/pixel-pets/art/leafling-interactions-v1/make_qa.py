from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
ART = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
QA = ART / "qa"
PREVIEWS = QA / "previews"
CELL = (160, 128)

TIMING = {
    "jump": [150, 70, 55, 60, 140, 60, 85, 220],
    "pounce": [150, 80, 60, 55, 80, 85, 100, 110],
    "rollover": [160, 100, 90, 140, 130, 100, 110, 370],
}

ROWS = (
    ("baby", "jump", "leafling-stage-atlas-v3.png", 6, 38),
    ("baby", "pounce", "leafling-stage-atlas-v3.png", 7, 38),
    ("baby", "rollover", "leafling-stage-atlas-v3.png", 8, 38),
    ("young", "jump", "leafling-motion-atlas-v5.png", 9, 46),
    ("young", "pounce", "leafling-motion-atlas-v5.png", 10, 46),
    ("young", "rollover", "leafling-motion-atlas-v5.png", 11, 46),
    ("guardian", "jump", "leafling-stage-atlas-v3.png", 9, 62),
    ("guardian", "pounce", "leafling-stage-atlas-v3.png", 10, 62),
    ("guardian", "rollover", "leafling-stage-atlas-v3.png", 11, 62),
)


def frames(atlas_name: str, row: int) -> list[Image.Image]:
    atlas = Image.open(PUBLIC / atlas_name).convert("RGBA")
    return [
        atlas.crop((column * CELL[0], row * CELL[1], (column + 1) * CELL[0], (row + 1) * CELL[1]))
        for column in range(8)
    ]


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
    row_height = 174
    sheet = Image.new("RGBA", (160 * 8, row_height * len(ROWS)), "#f5f0e6")
    draw = ImageDraw.Draw(sheet)
    for row_index, (stage, motion, atlas_name, atlas_row, height) in enumerate(ROWS):
        motion_frames = frames(atlas_name, atlas_row)
        for column, frame in enumerate(motion_frames):
            rendered = world_frame(frame, height, (160, 144))
            sheet.alpha_composite(rendered, (column * 160, row_index * row_height + 24))
        draw.text(
            (12, row_index * row_height + 6),
            f"{stage.upper()} / {motion.upper()} / {height}px world height",
            fill="#20331c",
        )

        preview_frames = [world_frame(frame, height, (320, 200)) for frame in motion_frames]
        preview_frames[0].save(
            PREVIEWS / f"{stage}-{motion}.gif",
            save_all=True,
            append_images=preview_frames[1:],
            duration=TIMING[motion],
            loop=0,
            disposal=2,
        )
    sheet.save(QA / "contact-sheet.png")


if __name__ == "__main__":
    main()
