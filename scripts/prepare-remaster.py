"""Prepare FLUX source art for the engine (run with Pillow installed)."""
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'game/assets/remaster'


def character():
    source = Image.open(ART / 'hero.png').convert('RGB')
    width, height = source.size
    pixels = source.load()
    samples = [pixels[x, y] for x, y in [(8, 8), (width-9, 8), (8, height-9), (width-9, height-9)]]
    bg = tuple(sorted(p[c] for p in samples)[2] for c in range(3))
    # Remove only the connected matte; enclosed costume and eye highlights stay.
    visited = bytearray(width*height)
    queue = deque()
    for x in range(width):
        queue.append((x, 0)); queue.append((x, height-1))
    for y in range(height):
        queue.append((0, y)); queue.append((width-1, y))
    while queue:
        x, y = queue.popleft()
        idx = y*width+x
        if visited[idx]: continue
        px = pixels[x, y]
        distance = sum((px[c]-bg[c])**2 for c in range(3))**.5
        if distance > 67: continue
        visited[idx] = 1
        if x: queue.append((x-1,y))
        if x+1<width: queue.append((x+1,y))
        if y: queue.append((x,y-1))
        if y+1<height: queue.append((x,y+1))
    result = source.convert('RGBA')
    result.putalpha(Image.frombytes('L', (width,height), bytes(0 if v else 255 for v in visited)))
    bounds = result.getbbox()
    if not bounds: raise RuntimeError('Character matte removed the whole image')
    result = result.crop(bounds)
    # A little transparent padding prevents sampling adjacent texels at the edge.
    result = ImageOps.expand(result, border=4, fill=(0,0,0,0))
    result.thumbnail((512,768),Image.Resampling.LANCZOS)
    result.save(ART/'hero-cutout.png',optimize=True)
    result.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(ART/'hero-left.png',optimize=True)
    print('Prepared hero:',result.size,'matte',bg)
    return result


def cover(hero):
    painting = Image.open(ART/'nursery.png').convert('RGBA')
    cover = ImageOps.fit(painting,(1536,1024),Image.Resampling.LANCZOS)
    shade = Image.new('RGBA',cover.size)
    sh = ImageDraw.Draw(shade)
    for x in range(1536):
        opacity = int(235*max(0,1-x/1460)**.7)
        sh.line((x,0,x,1024),fill=(10,30,42,opacity))
    cover = Image.alpha_composite(cover,shade)
    figure = hero.copy();figure.thumbnail((500,720),Image.Resampling.LANCZOS)
    cover.alpha_composite(figure,(1130-figure.width//2,900-figure.height))
    d = ImageDraw.Draw(cover)
    font = ROOT/'game/assets/display.ttf';mono = ROOT/'game/assets/mono.ttf'
    title = ImageFont.truetype(str(font),142)
    small = ImageFont.truetype(str(mono),20)
    d.text((100,134),'LAST',font=title,fill='#fff3d9')
    d.text((100,291),'EDITION',font=title,fill='#fff3d9')
    d.line((107,515,210,515),fill='#e9b969',width=3)
    body = ImageFont.truetype(str(ROOT/'game/assets/body.ttf'),32)
    d.text((107,553),'The future is still unwritten.',font=body,fill='#e8dfc7')
    d.text((107,903),'AN ADVENTURE IN PAPER & INK',font=small,fill='#e9b969')
    cover.convert('RGB').save(ROOT/'game/cover.jpg',quality=93,optimize=True)
    print('Prepared cover')


if __name__ == '__main__':
    cover(character())
