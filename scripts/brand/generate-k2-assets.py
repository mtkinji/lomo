from pathlib import Path
from tempfile import TemporaryDirectory
from PIL import Image
import shutil
import subprocess


APP_ROOT = Path(__file__).resolve().parents[2]
SITE_ROOT = APP_ROOT.parent / "kwilt-site"
DESKTOP_ROOT = APP_ROOT.parent / "kwilt-desktop"
MASTER_SVG = APP_ROOT / "assets" / "logo.svg"

PINE = "#315545"
PARCHMENT = "#FAF7ED"
WHITE = "#FFFFFF"


def render_svg(svg_text: str, color: str, size: int, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    colored = svg_text.replace("<g>", f'<g fill="{color}">', 1)
    with TemporaryDirectory() as temporary_directory:
        source = Path(temporary_directory) / "mark.svg"
        source.write_text(colored)
        subprocess.run(
            ["sips", "-s", "format", "png", "-z", str(size), str(size), str(source), "--out", str(output)],
            check=True,
            capture_output=True,
        )


def clean_transparency(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                pixels[x, y] = (0, 0, 0, 0)
            else:
                pixels[x, y] = (red, green, blue, alpha)
    image.save(path)


def opaque_icon(mark_path: Path, output: Path, background=(255, 255, 255, 255)) -> None:
    mark = Image.open(mark_path).convert("RGBA")
    canvas = Image.new("RGBA", mark.size, background)
    canvas.alpha_composite(mark)
    canvas.convert("RGB").save(output)


def centered_foreground(mark_path: Path, output: Path, content_size: int) -> None:
    mark = Image.open(mark_path).convert("RGBA").resize((content_size, content_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    offset = (1024 - content_size) // 2
    canvas.alpha_composite(mark, (offset, offset))
    canvas.save(output)


def resize(source: Path, output: Path, size: int) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    Image.open(source).convert("RGBA").resize((size, size), Image.Resampling.LANCZOS).save(output)


def resize_webp(source: Path, output: Path, size: int, *, opaque: bool = False) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(source).convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    if opaque:
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        canvas.alpha_composite(image)
        image = canvas.convert("RGB")
    image.save(output, format="WEBP", lossless=True)


def write_desktop_svg(svg_text: str) -> None:
    colored = svg_text.replace("<g>", f'<g fill="{PINE}">', 1)
    (DESKTOP_ROOT / "src" / "assets" / "kwilt-logo.svg").write_text(colored)


def write_icns(source: Path, output: Path) -> None:
    with TemporaryDirectory() as temporary_directory:
        iconset = Path(temporary_directory) / "Kwilt.iconset"
        iconset.mkdir()
        sizes = {
            "icon_16x16.png": 16,
            "icon_16x16@2x.png": 32,
            "icon_32x32.png": 32,
            "icon_32x32@2x.png": 64,
            "icon_128x128.png": 128,
            "icon_128x128@2x.png": 256,
            "icon_256x256.png": 256,
            "icon_256x256@2x.png": 512,
            "icon_512x512.png": 512,
            "icon_512x512@2x.png": 1024,
        }
        for name, size in sizes.items():
            resize(source, iconset / name, size)
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(output)], check=True, capture_output=True)


def main() -> None:
    svg_text = MASTER_SVG.read_text()

    pine_1024 = APP_ROOT / "assets" / ".k2-pine-1024.png"
    white_1024 = APP_ROOT / "assets" / ".k2-white-1024.png"
    parchment_1024 = APP_ROOT / "assets" / ".k2-parchment-1024.png"
    render_svg(svg_text, PINE, 1024, pine_1024)
    render_svg(svg_text, WHITE, 1024, white_1024)
    render_svg(svg_text, PARCHMENT, 1024, parchment_1024)
    for path in (pine_1024, white_1024, parchment_1024):
        clean_transparency(path)

    resize(white_1024, APP_ROOT / "assets" / "logo-white.png", 501)
    resize(parchment_1024, APP_ROOT / "assets" / "logo-parchment.png", 501)
    resize(pine_1024, APP_ROOT / "assets" / "favicon.png", 129)
    resize(white_1024, APP_ROOT / "assets" / "notification-icon.png", 96)
    opaque_icon(pine_1024, APP_ROOT / "assets" / "icon.png")
    centered_foreground(pine_1024, APP_ROOT / "assets" / "adaptive-icon.png", 640)

    shutil.copy2(APP_ROOT / "assets" / "icon.png", APP_ROOT / "ios" / "Kwilt" / "Images.xcassets" / "AppIcon.appiconset" / "App-Icon-1024x1024@1x.png")
    shutil.copy2(APP_ROOT / "assets" / "logo-white.png", APP_ROOT / "ios" / "KwiltShieldConfiguration" / "KwiltShieldAppIcon.png")
    shutil.copy2(APP_ROOT / "assets" / "logo-white.png", APP_ROOT / "ios" / "KwiltWidgets" / "KwiltLogoWhite.png")
    for density, size in {"mdpi": 24, "hdpi": 36, "xhdpi": 48, "xxhdpi": 72, "xxxhdpi": 96}.items():
        resize(white_1024, APP_ROOT / "android" / "app" / "src" / "main" / "res" / f"drawable-{density}" / "notification_icon.png", size)
    launcher_sizes = {
        "mdpi": (48, 108),
        "hdpi": (72, 162),
        "xhdpi": (96, 216),
        "xxhdpi": (144, 324),
        "xxxhdpi": (192, 432),
    }
    foreground_1024 = APP_ROOT / "assets" / ".k2-android-foreground-1024.png"
    centered_foreground(pine_1024, foreground_1024, 640)
    for density, (legacy_size, foreground_size) in launcher_sizes.items():
        resource_directory = APP_ROOT / "android" / "app" / "src" / "main" / "res" / f"mipmap-{density}"
        resize_webp(pine_1024, resource_directory / "ic_launcher.webp", legacy_size, opaque=True)
        resize_webp(pine_1024, resource_directory / "ic_launcher_round.webp", legacy_size, opaque=True)
        resize_webp(foreground_1024, resource_directory / "ic_launcher_foreground.webp", foreground_size)
    foreground_1024.unlink()

    site_brand = SITE_ROOT / "public" / "assets" / "brand"
    resize(pine_1024, site_brand / "logo.png", 512)
    resize(white_1024, site_brand / "logo-white.png", 501)
    resize(parchment_1024, site_brand / "logo-parchment.png", 501)
    resize(pine_1024, site_brand / "favicon.ico", 129)
    resize(pine_1024, SITE_ROOT / "public" / "assets" / "email" / "logo@2x.png", 129)

    write_desktop_svg(svg_text)
    desktop_icons = DESKTOP_ROOT / "src-tauri" / "icons"
    resize(pine_1024, desktop_icons / "icon.png", 512)
    resize(pine_1024, desktop_icons / "128x128@2x.png", 256)
    resize(pine_1024, desktop_icons / "128x128.png", 128)
    resize(pine_1024, desktop_icons / "32x32.png", 32)
    resize(white_1024, desktop_icons / "tray-logo-template.png", 44)
    write_icns(pine_1024, desktop_icons / "icon.icns")

    for path in (pine_1024, white_1024, parchment_1024):
        path.unlink()


if __name__ == "__main__":
    main()
