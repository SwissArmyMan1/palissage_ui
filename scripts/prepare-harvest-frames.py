"""Vineyard approach, then harvest from 2s (first 25% removed). Requires ffmpeg.

12 fps keeps roughly one frame per 19 px of scroll, which is the density the scrubber
can actually show, and keeps the whole sequence small enough to buffer ahead of the reader.
"""
from pathlib import Path
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
source = next((root.parent / 'vid').glob('Drone_flying_through_vineyard*20260920023005.mp4'))
intro = next((root.parent / 'vid').glob('Camera_gliding_through_vineyard*20260920022842.mp4'))
destination = root / 'public/media/harvest'
for name, width in [('wide', 1152), ('small', 640)]:
    folder = destination / name
    shutil.rmtree(folder, ignore_errors=True)
    folder.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        'ffmpeg', '-v', 'error', '-i', str(intro), '-i', str(source), '-an',
        '-filter_complex',
        f'[0:v]trim=duration=6,setpts=PTS-STARTPTS,fps=12,scale={width}:-1,setsar=1,settb=AVTB[a];'
        f'[1:v]trim=start=2:end=8,setpts=PTS-STARTPTS,fps=12,scale={width}:-1,setsar=1,settb=AVTB[b];'
        '[a][b]xfade=transition=fade:duration=0.5:offset=5.5[out]',
        '-map', '[out]', '-frames:v', '138', '-c:v', 'libwebp', '-quality', '46',
        '-compression_level', '6', '-start_number', '0', '-y', str(folder / '%03d.webp'),
    ], check=True)
subprocess.run([
    'ffmpeg', '-v', 'error', '-i', str(intro), '-frames:v', '1',
    '-vf', 'scale=1280:-1', '-q:v', '3', '-y', str(destination / 'poster.jpg'),
], check=True)
