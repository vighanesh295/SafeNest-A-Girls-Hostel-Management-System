from pathlib import Path
from PIL import Image
p = Path('flutter_app/android/app/src/main/res/drawable/launch_logo.png')
with Image.open(p) as im:
    im = im.convert('RGB')
    pixels = list(im.getdata())
    avg = [sum(c[i] for c in pixels)/len(pixels) for i in range(3)]
    print('avg', avg)
    print('mode', im.mode)
    print('size', im.size)
