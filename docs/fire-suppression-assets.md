# Fire suppression page materials

Route: `/solutions/fire-suppression`.

## Supplied model

`public/models/fireoff.glb` is derived from the user's `fireoff.glb` using
`scripts/prepare-fireoff-model.py`. All 281,958 triangles are preserved.
The single original mesh is separated into semantic groups: main pipe,
welded saddles, tees and neutral elements. Product dimensions in the UI
follow the user's brief; they are not measurements certified from the mesh.

The fixed orthographic camera shows a connection close-up. The source's
approximately 50 m long runs continue outside the viewport, so the saddle
and tee remain readable. There are no orbit or zoom controls. Model selection
and hover use the prepared groups; all inactive components remain gray.

`tee.png` is a transparent render of one tee from the supplied model.

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
