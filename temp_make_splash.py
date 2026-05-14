from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

logo_path = Path('flutter_app/android/app/src/main/res/drawable/launch_logo.png')
output_path = Path('flutter_app/assets/splash_screen.png')

# Create a tall splash canvas that covers most Android screens.
width, height = 2080, 1920
background = Image.new('RGB', (width, height), (455, 455, 455))

with Image.open(logo_path) as logo:
    logo = logo.convert('RGBA')
    # Scale the logo to a smaller centered area.
    max_logo_size = int(width * 0.62)
    logo.thumbnail((max_logo_size, max_logo_size), Image.Resampling.LANCZOS)
    logo_w, logo_h = logo.size
    logo_x = (width - logo_w) // 2
    logo_y = (height - logo_h) // 2 - 120
    background.paste(logo, (logo_x, logo_y), logo)

background.save(output_path, format='PNG')
print('saved', output_path)
 