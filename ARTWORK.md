# Last Edition visual remaster

The remaster replaces the original engraved skyline and line-drawn hero with a painted paper city, a paper-cloaked child explorer, and a midnight, ivory, copper and vermilion palette. Each district has its own environment painting. The renderer adds a second parallax plane, warm light sprites, paper dust, textured streets, brass machinery, new citizen portraits, articulated gears, scarf motion and folded glide wings. The title, gameplay HUD and paper menus share the new palette.

The five original raster assets were generated using the user's **FLUX.2 klein base 9B** service at `192.168.8.186:7870`, discovered through `~/system/docs/sources/docs/usage/FLUX2-KLEIN-USAGE.md`. No third-party artwork was downloaded. Each exact prompt, seed, resolution and inference setting is saved beside its source PNG in `game/assets/remaster/`. The full prompt set is also in [scripts/generate-remaster.py](scripts/generate-remaster.py).

- `nursery.png`: moonlit newspaper townhouses and a clocktower; seed 811.
- `factory.png`: copper printworks, pipes and amber windows in teal dusk; seed 912.
- `press.png`: a monumental printing cathedral in navy, copper and wine red; seed 1013.
- `morning.png`: a restored city with gardens, greenhouses and morning light; seed 1114.
- `hero.png`: a child explorer in an ivory paper outfit and rust scarf, isolated on a pink matte; seed 1215.

The engine loads PNG assets. `hero-cutout.png` and `hero-left.png` are padded, transparent runtime sprites derived from the connected background matte. The cover combines the nursery painting, the new hero and precisely typeset lettering. `favicon.svg` is an original folded-page icon. Fonts retain their bundled license. The historical clipping and existing synthesized soundtrack/effects are retained.

To regenerate on the same LAN (Python standard library plus SSH access to the generator host):

```sh
python3 scripts/generate-remaster.py
/usr/bin/python3 scripts/prepare-remaster.py
```

The generation script skips existing source PNGs. Move an asset aside to regenerate it. Pillow is required for sprite and cover preparation. The generator uses an SSH client with progress heartbeats to avoid long idle HTTP connections; it does not change the generator service or its configuration. FLUX model license information is documented in the local service guide.

The hero’s existing painting is now rigged at runtime into head, torso, arms, legs and scarf textures. Open, blinking and crying faces and mirrored joints share the same artwork. Motion is driven by gameplay state, with distance-based strides and smooth transitions into airborne, gliding and landing poses. No additional generated art or 3D model is needed for these 2D animations.
