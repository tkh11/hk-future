# Fire suppression page materials

Route: `/solutions/fire-suppression`.

## Supplied model

`public/models/parking-sprinkler.glb` replaces the earlier connection-only model.
It is derived from the user's `Parking_Sprinkler_P04.gltf` and accompanying
`Parking_Sprinkler_P04.bin`, supplied on 2026-10-16, using
`scripts/prepare-parking-model.py`. All 1,040,720 triangles and 686 CAD line
segments are preserved. The geometry is batched into 57 render objects by
assembly, material and primitive type. The output includes the source hash.

The model uses six fixed camera presets in `fireoff-model.ts`, matched to the
six supplied screenshots in order: overview, pump station, FireOff network
from above, sprinkler assembly, PK-02 fire cabinet connection, and the outlet
flange between the station manifold and polypropylene pipe. Positions use the
source's Y-up coordinates in metres. Narrow fields of view approximate the
orthographic overview/plan; close-ups retain perspective. There are no orbit,
drag, zoom or automatic rotation controls. Selection animates the camera for
1.05 seconds, then holds it still; reduced motion switches immediately.

The scene retains its material families, including green pipework, red cabinets
and brass fittings. Architecture uses neutral gray; dark pump surfaces are
lifted slightly so their details remain legible on white. The CAD export's
sRGB colors are converted to linear colors for lighting. Hover temporarily
adds a restrained red tint to the corresponding assembly. Selecting a node keeps
that assembly opaque and fades the remaining geometry toward neutral gray with
50% material opacity over 420 ms; returning to the overview restores the original
colors and opacity. Nonselected markers become gray and less prominent while
remaining interactive. Five numbered markers
project the world-space anchors in `fireoff-content.ts` onto the model viewport;
short leader lines connect each marker to its assembly. Hover or keyboard focus
reveals the name; clicking opens the corresponding fixed view and description.
Markers outside the camera frame are hidden, as are markers during camera moves.
The five compact description cards sit inside the model screen at its upper left,
with larger product previews above the title, a single-sentence description,
and a «В каталог» button to `/catalog`, with one description expanded at a time. On phones,
the model sits below this panel inside the same screen to avoid covering the scene.
«Общий вид» returns to the overview. Selection
keeps the camera viewport visible rather than scrolling down to the description.
The two cards without supplied product photos use a gray company-logo placeholder.

The older `fireoff.glb`, its preparation script and the `tee.png` render remain
as previous source assets; the explorer no longer loads that model.

## Supplied product banners

- `fireoff-cover.png`: the user's `fireoffcover.png` (2172 × 724), supplied on
  2026-10-16, replaces the previous FireOff banner.
- `hk-boost-banner.jpg`: the user's `hk-boost.jpg` (6409 × 1276), supplied on
  2026-10-16, appears immediately before the HK-Boost FPA/FPV station block.

Both images are copied without cropping or changing their artwork. Each banner
fills the site's content grid and preserves its natural aspect ratio, including
on mobile. The shared `usePointerTilt` behavior matches ClimatFaser: a stationary
pointer target controls the tilted surface and a soft sheen; touch and reduced
motion disable the hover animation.

## Official product sources

Checked on 2026-10-09. The page uses original, concise descriptions based on
the following HEISSKRAFT catalog pages. Catalog buttons intentionally lead
to the site's `/catalog`; selection links use the existing placeholder pages.

- [FireOff pipe](https://heisskraft.ru/catalog/tekhnologiya9339/sistema_heisskraft_fireoff/truby_fireoff/truba_polipropilenovaya_fireoff818/)
- [FireOff fittings](https://heisskraft.ru/catalog/tekhnologiya9339/sistema_heisskraft_fireoff/fitingi_fireoff/)
- [Welded saddle](https://heisskraft.ru/catalog/tekhnologiya9339/sistema_heisskraft_fireoff/fitingi_fireoff/varnoe_sedlo_fireoff2208/)
- [HK-Boost FPA](https://heisskraft.ru/catalog/nasosy_i_komplektuyushchie/ustanovki_povysheniya_davleniya_hk_boost15655/ustanovka_hk_boost_fpv_922/ustanovka_hk_boost_fpa_2_hmv/): automatic water and foam fire suppression installations (АУП).
- [HK-Boost FPV](https://heisskraft.ru/catalog/nasosy_i_komplektuyushchie/ustanovki_povysheniya_davleniya_hk_boost15655/ustanovka_hk_boost_fpv_/hk_boost_fpv2845/): internal fire water supply (ВПВ).

Official images, stored in `public/images/fire-suppression/`:

- `pipe.png`: https://heisskraft.ru/upload/iblock/3ad/weidwbfpmltdzlydzmev51xa75or244j/truba_polipropilenovaya_fireoff.png
- `saddle.jpg`: https://heisskraft.ru/upload/iblock/535/r87j440wzh9iz358m78l9h5qtk3ru09v/vvarnoe_sedlo.jpg
- `station-fpa.png`: https://heisskraft.ru/upload/iblock/1a2/spexcukc5n9cbnro2rpn9bst60b2fx4a/ustanovka_pozharotusheniya_hk_boost_fpa_2_hmv.png
- `station-fpv.png`: https://heisskraft.ru/upload/iblock/223/3s3utggpd3kw2xcdmca4xwhv1w1clm77/ustanovka_hk_boost_fpv_2_hmv.png

The hero is an original, conceptual SVG sprinkler illustration, not an
installation drawing. Do not add unverified flow, pressure or compliance claims.
