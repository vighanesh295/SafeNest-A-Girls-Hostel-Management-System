from pathlib import Path
from PIL import Image, ImageChops
p = Path('flutter_app/android/app/src/main/res/drawable/launch_logo.png')
with Image.open(p) as im:
    bg = Image.new('RGB', im.size, (255,255,255))
    diff = ImageChops.difference(im, bg).convert('L')
    bbox = diff.getbbox()
    print('bbox', bbox)
