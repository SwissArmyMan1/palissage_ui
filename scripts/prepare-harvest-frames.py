"""Vineyard approach, then harvest from 2s (first 25% removed). Requires ffmpeg."""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
source = next((root.parent / 'vid').glob('Drone_flying_through_vineyard*20260920023005.mp4'))
intro = next((root.parent / 'vid').glob('Camera_gliding_through_vineyard*20260920022842.mp4'))
destination = root / 'public/media/harvest'
for name, width in [('wide', 1280), ('small', 640)]:
    folder = destination / name
    folder.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        'ffmpeg', '-v', 'error', '-i', str(intro), '-i', str(source), '-an',
        '-filter_complex',
        f'[0:v]trim=duration=6,setpts=PTS-STARTPTS,fps=24,scale={width}:-1,setsar=1,settb=AVTB[a];'
        f'[1:v]trim=start=2:end=8,setpts=PTS-STARTPTS,fps=24,scale={width}:-1,setsar=1,settb=AVTB[b];'
        '[a][b]xfade=transition=fade:duration=0.5:offset=5.5[out]',
        '-map', '[out]', '-frames:v', '276', '-c:v', 'libwebp', '-quality', '64',
        '-compression_level', '5', '-start_number', '0', '-y', str(folder / '%03d.webp'),
    ], check=True)
subprocess.run([
    'ffmpeg', '-v', 'error', '-i', str(intro), '-frames:v', '1',
    '-vf', 'scale=1280:-1', '-q:v', '3', '-y', str(destination / 'poster.jpg'),
], check=True)
