"""Build/check the silent onboarding loop. Requires imageio-ffmpeg and numpy.

Run --check against either export to measure its wrap versus normal motion.
The original stays intact; no reversed or AI-generated wave frames are used.
"""
import argparse
from pathlib import Path
import subprocess

import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def check(path):
    decoded = subprocess.check_output([
        FFMPEG, '-v', 'error', '-i', str(path), '-vf', 'scale=72:128',
        '-f', 'rawvideo', '-pix_fmt', 'gray', '-'])
    frames = np.frombuffer(decoded, dtype=np.uint8).reshape(-1, 128, 72).astype(float)
    steps = np.mean(np.abs(np.diff(frames, axis=0)), axis=(1, 2))
    seam = np.mean(np.abs(frames[-1] - frames[0]))
    ratio = seam / max(float(np.median(steps)), 0.001)
    print(f'{path.name}: wrap={seam:.3f}, typical={np.median(steps):.3f}, ratio={ratio:.2f}x')
    if ratio > 4:
        raise SystemExit('FAIL: wrap discontinuity exceeds normal frame motion')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', type=Path)
    args = parser.parse_args()
    if args.check:
        check(args.check)
    else:
        output = ROOT / 'assets/onboarding/shoreline-smooth.mp4'
        # 20 seconds at 30fps. Begin at t=2; dissolve the final two seconds
        # into t=0..2. The wrap then continues forward from t=2 naturally.
        subprocess.run([
            FFMPEG, '-v', 'error', '-y', '-i', str(ROOT / 'assets/onboarding/shoreline.mp4'),
            '-filter_complex',
            '[0:v]fps=30,trim=end_frame=600,setpts=PTS-STARTPTS,split[a][b];'
            '[a]trim=start_frame=60,setpts=PTS-STARTPTS,fps=30[body];'
            '[b]trim=end_frame=60,setpts=PTS-STARTPTS,fps=30[head];'
            '[body][head]xfade=transition=fade:duration=2:offset=16,format=yuv420p[v]',
            '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21',
            '-movflags', '+faststart', str(output)], check=True)
        check(output)
