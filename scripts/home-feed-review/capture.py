"""Capture explicit dev-only fixture routes. Never publishes household content."""
import argparse
import json
import pathlib
import subprocess
import time
import urllib.parse
catalog = json.loads(pathlib.Path('src/features/dev/homeFeedItemCatalog.json').read_text())
output = pathlib.Path('artifacts/home-sharing-review/feed-item-lab/captures')
output.mkdir(parents=True, exist_ok=True)
udid = 'D437E709-EF87-49B1-A6C1-7AE350C0BF8A'
parser = argparse.ArgumentParser()
parser.add_argument('--media-only', action='store_true')
args = parser.parse_args()
variants = [v for v in catalog['variants'] if not args.media_only or v.get('post', {}).get('media')]
for index, variant in enumerate(variants):
    params = urllib.parse.urlencode(dict(homeItems='1', homeItemId=variant['id'], homeCapture='1'))
    subprocess.run(['xcrun', 'simctl', 'openurl', udid, 'kwilt:///__dev/tools?' + params], check=True, capture_output=True)
    time.sleep(2.5)
    subprocess.run(['xcrun', 'simctl', 'io', udid, 'screenshot', str(output / (variant['id'] + '.png'))], check=True, capture_output=True)
    print(f"{index + 1}/{len(variants)} {variant['id']}", flush=True)
