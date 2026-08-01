from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
ART = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
QA = ART / "qa"
PREVIEWS = QA / "previews"
CELL = (160, 128)
TIMING = [180, 70, 55, 65, 75, 150, 110, 260]
LIFT = [0, 0, -10, -28, -38, -45, 0, 0]


def frames() -> list[Image.Image]:
    atlas = Image.open(PUBLIC / "leafling-stage-atlas-v4.png").convert("RGBA")
    return [
        atlas.crop((column * CELL[0], 12 * CELL[1], (column + 1) * CELL[0], 13 * CELL[1]))
        for column in range(8)
    ]


def world_frame(frame: Image.Image, frame_index: int, canvas=(320, 240)) -> Image.Image:
    output = Image.new("RGBA", canvas, "#d6e4c5")
    draw = ImageDraw.Draw(output)
    ground = 198
    draw.rectangle((0, ground, canvas[0], canvas[1]), fill="#78955a")
    draw.line((0, ground, canvas[0], ground), fill="#445f38", width=2)
    scale = 62 / CELL[1]
    display = frame.resize((round(CELL[0] * scale), 62), Image.Resampling.NEAREST)
    anchor_x = round(80 * scale)
    anchor_y = round(120 * scale)
    output.alpha_composite(
        display,
        (canvas[0] // 2 - anchor_x, ground - anchor_y + LIFT[frame_index]),
    )
    return output


def main() -> None:
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    motion_frames = frames()
    rendered = [world_frame(frame, index) for index, frame in enumerate(motion_frames)]
    sheet = Image.new("RGBA", (320 * 4, 240 * 2), "#f5f0e6")
    for index, frame in enumerate(rendered):
        sheet.alpha_composite(frame, ((index % 4) * 320, (index // 4) * 240))
    sheet.save(QA / "contact-sheet.png")
    rendered[0].save(
        PREVIEWS / "guardian-aerial.gif",
        save_all=True,
        append_images=rendered[1:],
        duration=TIMING,
        loop=0,
        disposal=2,
    )


if __name__ == "__main__":
    main()
