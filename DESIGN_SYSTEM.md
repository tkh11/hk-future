# HEISSKRAFT — Digital Design System

Revision: 2026-10-19 · Apple-informed HEISSKRAFT direction

This file defines the target visual language of the HEISSKRAFT website and the
component-specific behavior that must survive its implementation.

## How to use this document

Read the foundations before a component or page recipe. Sections 11–12 and
23–26 retain detailed page contracts; sections 27–30 define shared component
states, accessibility decisions and the implementation checklist.

**Approved direction:** preserve HEISSKRAFT colors and industrial accuracy;
move composition closer to the supplied Apple reference, retaining the original
control corner radii as reconfirmed on 2026-10-19; separate
display and text typography; retain the established pointer effects and morphs.
The footer is dark. `#CA3C32` is a catalog-landing-only exception. ParkBanner
and HomeHero retain no visible pause button, with reduced-motion still states.

**Implementation status (2026-10-19).** Shared tokens, responsive type roles,
compact actions, readable secondary text and control sizing are applied to the
existing site. `src/app/design-tokens.css` contains the foundations, imported by
`globals.css`; component styles retain local exceptions. SF Pro Display and
SF Pro Text are now loaded from local WOFF2 files through `next/font/local`.
The previous SF UI Text declarations and fallback-stack entries are removed.
The current homepage content and structure are explicitly preserved: three video
slides, company copy without a CTA pair, and six solution cards without an intro
banner. Section 30 records the implementation scope.

**Reference scope.** The supplied `apple.design.md` is an authored analysis,
marked `alpha`, dated 2026-05-12 and credited to Dov Azencot. It is not treated
as an official or exhaustive Apple specification. Its instructions to omit hover,
remove all interface shadows, use blue, exclude weight 500 or enforce a black
header do not override HEISSKRAFT decisions. Resolve its conflicting values
through the explicit tables here rather than importing both versions.

The visual direction combines Apple-like product presentation and component
geometry, Augen-like restraint, HEISSKRAFT identity and engineering precision.
No external reference authorizes changing page content, routes or product facts.

Quick navigation: [colors](#2-colors-and-semantic-roles) ·
[typography](#3-typography) · [layout and shape](#7-layout-spacing-and-shape) ·
[actions](#16-buttons-links-and-action-geometry) ·
[component states](#27-shared-component-contracts-and-states) ·
[motion](#28-motion-presets-and-retained-exceptions) ·
[implementation map](#30-implementation-map-and-review-checklist).

---

# 1. Brand direction

HEISSKRAFT is a manufacturer of engineering systems.

The website must feel:

- precise
- industrial
- technological
- reliable
- restrained
- premium
- architectural
- professional

The website must NOT feel like:

- SaaS startup
- fashion brand
- creative agency
- cyberpunk product
- generic corporate template

Prefer simplicity over decoration.

---

# 2. Colors and semantic roles

The official brand palette remains white `#FFFFFF`, black `#000000` and
HEISSKRAFT red `#D8222B`. The global interaction derivative is `#B81C24`.
Use the following role-based palette instead of adding near-duplicate shades.

| Role / token | Value | Use | Code status at this revision |
|---|---|---|---|
| `--hk-red` | `#D8222B` | Primary action, selected state, brand accent | Exists in `globals.css` |
| `--hk-red-strong` | `#B81C24` | Primary hover and pressed color | Exists in `globals.css` |
| `--catalog-accent` | `#CA3C32` | Catalog entrance covers and its local search treatment | Exists only in `Catalog.module.css` `.landing` |
| `--hk-canvas` | `#FFFFFF` | Page, header, cards, forms | Proposed semantic token |
| `--hk-surface-muted` | `#F5F5F7` | Quiet supporting sections and utility controls | Proposed semantic token |
| `--hk-surface-dark` | `#1D1D1F` | Footer and explicitly chosen dark product sections | Proposed semantic token |
| `--hk-ink` | `#1D1D1F` | Heading and body text on light surfaces | Proposed semantic token |
| `--hk-text-secondary` | `#6E6E73` | Supporting text on white/light neutral surfaces | Proposed semantic token |
| `--hk-on-dark` | `#FFFFFF` | Text on dark surfaces and red primary actions | Proposed semantic token |
| `--hk-on-dark-secondary` | `rgb(255 255 255 / 72%)` | Footer supporting text on `--hk-surface-dark` | Proposed semantic token |
| `--hk-border` | `#D4D4D8` | Readable containers, fields, parameter tables | Proposed semantic token |
| `--hk-hairline` | `rgb(0 0 0 / 10%)` | Subtle separators on light surfaces | Proposed semantic token |
| `--hk-placeholder` | `#E8E8ED` | Unavailable media, not body text | Proposed semantic token |
| `--hk-success-icon` | `#26955A` | Existing form completion check only | Proposed alias for existing component color |

Proposed tokens must be declared before code consumes them. Existing raw values
in component styles are implementation evidence, not extra global brand colors.

Keep red selective. Primary actions and active states can be red; ordinary
navigation stays neutral. Do not turn every interactive link red simply because
the Apple reference uses one interactive blue. On dark sections use white links
with a readable focus treatment; do not invent a lighter brand red for text.

`--catalog-accent` is an approved local exception, not a replacement for `--hk-red`.
Keep it scoped to `/catalog` entrance covers, local search and their matching
loading states. Shared header/footer actions, deeper catalog levels and other
pages continue to use the global palette. Colors inside supplied videos and
product photography remain intrinsic asset colors.

Functional engineering colors belong to section 18. The green completion check
is a status symbol, not another brand accent. Red error messages must include
text explaining the error; color alone does not distinguish error from selection.
Neutral overlays and alpha versions of approved colors are allowed for the
explicit effects in sections 10, 13 and 28, not as new decorative palettes.

---

# 3. Typography

### Font roles

Adopt the Apple principle of separate display and reading faces.

| Role | Loaded family / CSS variable | Scope |
|---|---|---|
| `--hk-font-display` | SF Pro Display via `var(--font-sf-pro-display)` | Hero and editorial section headings, prominent product headings at 24px and above |
| `--hk-font-text` | SF Pro Text via `var(--font-sf-pro-text)` | Paragraphs, navigation, forms, buttons, tables, labels and compact card titles |

Choose the role by purpose, not by an automatic font-size selector: a large
form input remains Text and a short editorial heading remains Display.
The project loads genuine SF Pro Display and SF Pro Text in weights
400/500/600/700 from `public/fonts/sf-pro`. `src/app/layout.tsx` registers both
families with `next/font/local`, preloading and a metric-adjusted Arial fallback
for the brief loading/error state. The chosen typeface does not depend on the
visitor's installed fonts, and no remote font service is requested at runtime.
The generated family names flow through `--font-sf-pro-display` and
`--font-sf-pro-text` into the two semantic `--hk-font-*` tokens.

Files were prepared from Apple's official SF Pro package downloaded on
2026-10-19: https://devimages-cdn.apple.com/design/resources/download/SF-Pro.dmg.
The WOFF2 character sets retain Latin, Cyrillic, punctuation, numerals, currencies,
arrows and mathematical/engineering symbols; unused private-use icon glyphs are
excluded. Original font identity and real weight metadata are retained.
The supplied license is preserved at `public/fonts/sf-pro/Apple-SF-Pro-License.rtf`.
This source record is not a claim of a separate web-use license.

Keep `font-display: swap` and `font-synthesis: none`. Test Cyrillic, Latin,
numerals and units when replacing assets. SF UI Text files are no longer loaded
or used as a fallback. Do not silently substitute Inter or an installed system
font for either chosen face.

### Type scale

These are target presets for new or explicitly migrated components, with px
values shown for review. Implement in rem where appropriate; line heights are
unitless. Body text should wrap naturally rather than fit a fixed-height box.

| Role | Desktop ≥1024px | Tablet 768–1023px | Mobile <768px | Weight | Line height | Tracking |
|---|---:|---:|---:|---:|---:|---:|
| Hero / Display | 56px | 40px | 32px; 28px at ≤419px if needed | 600 | 1.1 | -0.02em |
| Section heading / Display | 40px | 34px | 28px | 600 | 1.15 | -0.02em |
| Product heading / Display | 28px | 28px | 24px | 600 | 1.2 | -0.015em |
| Intro / Text | 21px | 19px | 17px | 400 | 1.45 | -0.01em |
| Body / Text | 17px | 17px | 17px | 400 | 1.5 | 0 |
| Compact body / Text | 15px | 15px | 15px | 400 | 1.6 | 0 |
| Card title / Text | 18px | 18px | 18px | 500 | 1.4 | -0.015em |
| Primary button / Text | 17px | 17px | 17px | 400 | 1.3 | -0.01em |
| Utility / Text | 14px | 14px | 14px | 400 or 500 | 1.4 | 0 |
| Header navigation / Text | 12px | 12px when expanded | 17px in mobile menu | 400 | 1 desktop; 1.4 mobile | -0.01em desktop; 0 mobile |
| Caption / technical label / Text | 13px | 13px | 13px | 400 or 500 | 1.45 | 0 |
| Footer link / Text | 12px | 12px | 13px | 400 | 1.45 | 0 |

Long articles may use body line-height 1.6 and a reading column of 60–70ch.
Inline strong text uses 600 and inherits the paragraph's line height; do not
compress a line just because it contains bold text. Weight 500 remains an
intentional HEISSKRAFT utility/card/active-breadcrumb weight. Weight 700 is for
short exceptional emphasis, not the default heading weight. Keep leading,
tracking and letterforms legible in Russian; do not copy the reference's
contradictory negative tracking instructions or superscript numerals.
Use `tabular-nums` for aligned engineering values, not `numerator` for normal data.

The former 10–13px technical-label range is replaced by a readable 13px default.
Existing 10–12px diagram annotations are component-specific legacy values to
review in context; they are not a template for new content or legal text.
The former 68px ParkBanner and 58px application-hero ceilings are replaced by
the shared hero scale. Retain copy and media geometry when extending this migration.
The 18px/500 Solutions titles and 12px desktop header are deliberate presets.
Header menu text is 17px whenever the mobile menu is shown (below 834px),
including the 768–833px range of the general tablet type column.

Use large typography sparingly: large object plus restrained text. Small labels
are functional information only: equipment names, controls, sources and fields.
Do not add decorative eyebrows, category overlines, section indexes, uppercase
slogans or small text that merely repeats the heading. Preserve existing copy.

---

# 4. Logo rules

The HEISSKRAFT identity consists of:

- symbol
- logotype
- slogan

Use official supplied vector assets only.

Never recreate the logo manually with HTML text.

Never:
- stretch
- compress
- rotate
- redraw
- change proportions
- modify lettering
- add effects
- recolor outside approved variants

Maintain generous clear space around the logo.

Reuse `HeaderLogo` for the approved Rive reveal and its static SVG fallback.
The reveal may uncover the supplied logo; it must not distort its final geometry.
Reduced motion shows the settled logo without the entrance animation.
The current `header-logo.riv` uses the `Mark` artboard (1440×320) and the `Build`
animation (128 frames at 60fps). Use its current lockup bounds, not the previous
`Artboard` / `Reveal` export's crop. Start with a compact slot for the HK mark.
Expand that slot with the rendered logo's right edge so the navigation moves
alongside the reveal, using the animation's own timing and easing. Do not reserve
the full wordmark width before playback. During loading, keep the compact slot
empty; the first visible logo must be the initial colored Rive frame. Show the
static SVG fallback only if Rive fails, never as a loading frame.
Keep the artboard backgrounds transparent on the white header; preserve the logo's
own vector geometry, colors and animation tracks.

The official brandbook defines the recommended clear space as 2X,
where X corresponds to the height of the logo characters.

---

# 5. HEISSKRAFT symbol

The standalone HK symbol may be used independently from the full logo.

It is especially appropriate for:

- compact Header
- favicon
- mobile navigation
- preloader
- floating interface controls
- small UI areas

Use the existing responsive header logo component; do not replace it with a
new mark or independently recreate its animation.

Do not overuse the symbol decoratively.

The homepage does not show a preloader. `Preloader.tsx` stays in the repo unused.

---

# 6. Visual references and composition

The supplied Apple analysis is the primary reference for component geometry,
product-first composition, semantic tokens and the typography hierarchy. Augen
(`https://augen.pro/`) remains secondary inspiration for negative space, quiet
navigation and controlled transitions. Neither overrides this specification.

Adopt these Apple-inspired principles:

- Present one product or engineering idea per major section.
- Let a large, accurately rendered object carry the composition; limit adjacent
  actions to a primary/secondary pair.
- Use calm white, light-neutral and occasional dark surfaces to establish rhythm
  rather than placing a bordered card around every paragraph.
- Use compact actions with restrained rectangular corners, quiet utility controls and consistent rounded
  insets. Full-bleed sections remain rectangular.
- Give product imagery room; use a centered stack for a new single-product hero
  or a precise image/text split for technical explanation.

Do not import Apple blue, a black global header, store/cart interactions,
mandatory light/dark alternation, a 1440px replacement grid or consumer-product
copy. HEISSKRAFT remains industrial and technical. Existing homepage sequence,
left-aligned park copy, application-page narratives and model controls remain
as defined in their recipes; this revision is not a page-reordering instruction.

---

# 7. Layout, spacing and shape

### Content and composition

Keep `--site-content-width: 1280px` for the main content grid, including header,
company, solutions, applications and footer. Include section padding outside
that maximum. Standard side gutters are 24px on tablet/desktop and 16px on
compact screens below 600px. Use a centered 60–70ch inner column for long reading
without changing the surrounding site grid. Align loading states to the same grid.
Full-bleed media can span the viewport; no global 980px/1440px grid is introduced.

The ParkBanner copy gutter remains its named exception: desktop
`clamp(32px, 6.5vw, 112px)`, tablet 36px and 24px inside the mobile card. Its
viewport-centered slide indicators are independent of the content grid.

For a new product section use a centered name → short description → compact
CTA pair → dominant product image, or a two-column image/text composition.
Use 40–64px of separation around a dominant image on desktop and 24–32px on
mobile, adjusting to the real silhouette. Do not crop equipment to meet a gap.
Existing technical stories and card grids retain their page-specific layouts.

### Spacing scale

| Proposed token | Value | Role |
|---|---:|---|
| `--hk-space-1` | 4px | Fine icon/text adjustment |
| `--hk-space-2` | 8px | Closely related controls |
| `--hk-space-3` | 12px | CTA pair gap, label/help grouping |
| `--hk-space-4` | 16px | Paragraph rhythm, compact gutter |
| `--hk-space-5` | 24px | Card inset, grid gap, desktop gutter |
| `--hk-space-6` | 32px | Compact component group separation |
| `--hk-space-7` | 48px | Mobile section rhythm |
| `--hk-space-8` | 64px | Tablet section rhythm, image/text gap |
| `--hk-space-9` | 80px | Desktop major-section rhythm |

Use 80px desktop (≥1024px) / 64px tablet (768–1023px) / 48px mobile (<768px)
as default major-section vertical padding; supporting sections may use the next smaller step. Retain
explicit page-recipe insets when migrating existing sections. Avoid stacking
independent large margins and paddings at the same boundary. Keep the Apple
reference's 17px as a text size, not an additional structural spacing unit.
Do not force diagram geometry, logo clear space or measured animation offsets
onto the spacing scale.

### Radius scale

| Proposed token | Value | Role |
|---|---:|---|
| `--hk-radius-none` | 0 | Full-bleed desktop hero, header, page sections |
| `--hk-radius-utility` | 8px | Shared CTA, article actions/filters/search, mobile menu search, map link and station options |
| `--hk-radius-field` | 12px | Form fields, file controls, designer/stub CTA and station tab container |
| `--hk-radius-card-mobile` | 16px | Inset cards and media on compact screens |
| `--hk-radius-card` | 18px | Standard desktop cards |
| `--hk-radius-panel` | 20px | Inset hero, media panel, dialog |
| `--hk-radius-pill` | 9999px | Existing designer tool chips, timeline tracks and other originally pill-shaped details only |
| `--hk-radius-circle` | 50% | Equal-width/height icon buttons only |

The user explicitly restored the pre-migration control radii on 2026-10-19.
Catalog search and its skeleton use 10px; lead-dialog Next uses 10px; the FireOff
in-panel catalog link uses 9px. Existing 10px tables/help buttons, 14px model-card
morphs, floating catalog-search geometry and other explicit interaction recipes
are local exceptions; do not globally round their internal states to pills.
Nested image corners must fit their parent. Full-width desktop sections must not
acquire rounded outer corners; inset application heroes keep their rounded frame.
Use grids for actual categories and comparisons, not decorative dashboard density.

---

# 8. Product-first design

HEISSKRAFT products are the primary visual language.

Use:

- large fitting renders
- pipes
- pumps
- valves
- engineering assemblies
- technical details
- product close-ups
- wireframe transitions

Products should appear:

- physically realistic
- technically accurate
- premium
- substantial

Never distort product geometry for visual effect.

Do not generate fictitious product details.

Prefer product cutouts with a transparent background. An official pure-white
source may stay unedited on a white section when no image rectangle is visible;
this preserves exact product geometry. Pumps and other equipment
must sit directly on the section surface, without a filled image rectangle
or an enclosing background panel. Preserve the real product, its proportions
and any intrinsic material detail when removing the source background.

The supplied promotional banners and bordered square product-image frames on
the ЦОД page are named exceptions in section 24. Keep those authored assets
and frames; do not add similar panels to standalone cutouts elsewhere.

---

# 9. Industrial character

Industrial character must come from:

- engineering precision
- scale
- technical hierarchy
- material realism
- thin rules
- functional numbering where sequence matters
- structured layouts
- accurate product information

Do NOT create fake industrial aesthetics using:

- random coordinates
- meaningless numbers
- fake CAD grids
- excessive blueprints
- random measurement lines
- sci-fi overlays

Every technical graphic must have a real function.

---

# 10. Surfaces, glass and elevation

White is the default canvas. `--hk-surface-muted` may separate a supporting
section; `--hk-surface-dark` is for the footer and an explicitly selected dark
product presentation. Surface changes can separate sections without extra rules.
Do not recolor the established white homepage/application sections just to
create an alternating pattern. A dark section is not automatic site dark mode.

The header and `CatalogFloatingNav` remain fully opaque white with their
existing thin separator/border; neither becomes frosted glass. Glass is secondary
and functional: compact overlays, floating model controls and tooltips. Keep
blur, neutral tint and border restrained; provide an opaque fallback when blur
is unavailable or when it reduces legibility. Do not put glass behind long copy.

| Elevation role | Treatment | Scope |
|---|---|---|
| Flat | No shadow | Main sections, header, footer, ordinary text |
| Bordered | 1px neutral border | Inputs, tables, model screens; border is not a shadow |
| Card hover | `0 18px 38px -22px rgb(29 29 31 / 24%)` | Existing Solutions and compatible catalog tilt surfaces |
| Catalog entrance | Existing two-layer soft resting shadow | The three portrait entrance covers only |
| Dialog | `0 24px 80px -16px rgb(0 0 0 / 24%)` | Existing lead-dialog surface |
| Local overlay | Existing component-specific soft shadow | Country menu and model-help morph only |
| Product image | Intrinsic contact shadow, or a restrained neutral one if needed | Grounding a real product without changing its geometry |

The Apple reference's blanket prohibition on UI shadows is not adopted. Keep
approved shadows where they communicate an existing interaction or overlay;
do not spread them to all cards, buttons or text. The white ParkBanner CTA's
subtle shadow is an explicit reference-specific exception. Standard compact
CTAs stay shadowless. Never use text shadows, colored glow or blue/neon glass.

Gradients are not generic section decoration. Allowed uses are the specified
video text scrim, photo-caption readability, loading shimmer, pointer-driven
reflection and the existing form-success sweep. Keep each effect scoped to
its component and its reduced-motion behavior.

---

# 11. Header

Reuse the shared `Header` on every page. Its current desktop structure is:

- left: animated HEISSKRAFT logo, linking to the homepage
- navigation: Каталог, База знаний, Проектировщикам, Подбор оборудования
- action: Оставить заявку, opening the existing lead dialog
- right: Контакты and accessible expandable search

«Контакты» links to `/contacts`, with office, service, address and opening hours
verified against the official HEISSKRAFT contacts page. Keep phone numbers and
email addresses actionable. Reuse the official map constructor, loading it only
when its block enters the viewport, with a shimmer while loading and a direct
map link available independently. Use the shared content grid and white surfaces.
«Проектировщикам» links to `/designers`, «База знаний» to `/articles`, and
«Каталог» / «Подбор оборудования» to `/catalog`. Search submits to `/catalog?q=…`.

The header is fixed at `top: 0`, compact and white, with dark navigation.
Its rectangular surface spans the entire viewport width with no outer
gutters, rounded corners or floating shadow. Its inner bar follows the shared
1280px content grid, with responsive side gutters. Reuse these established
dimensions rather than restyling it for an individual page.

Below 834px, show the mobile menu and search with the same navigation and
lead action. Keep focus, Escape-to-close and scroll locking behavior intact.

The header is available immediately on every page, including the homepage.
Its approved logo reveal plays once, three seconds after the loaded logo's first
frame is displayed on screen. Count only visible time; pause the delay and playback
in a hidden tab or when the logo is offscreen. Do not tie it to scrolling or a
banner transition. Cancel pending timers and rendering work when unmounting.

# 12. Homepage

The homepage combines video scenes with restrained white sections. Its existing
content and structure were reconfirmed by the user on 2026-10-19 and take precedence
over the earlier two-slide park/product reference.

1. ParkBanner — a white carousel beneath the header with three existing videos:
   `hero-opening.mp4` («Инженерные системы будущего»), `gali.mp4`
   («Создаём среду для жизни») and `galits.mp4` («Инженерия для городской среды»).
   Preserve their descriptions, the third slide's park attribution, existing
   media treatments and supplied posters. Keep the compact white «Смотреть каталог»
   8px-corner button with its meaningful catalog icon, subtle border and shadow, linking to
   `/catalog`. There is no benefits row. On desktop use full width, square corners,
   a 60svh scene with a 520px minimum, left-aligned dark copy and video on the right.
   Keep the copy gutter `clamp(32px, 6.5vw, 112px)` (36px on tablet).
   On mobile retain small outer gutters and rounded corners; stack copy over media.
   Let scene height grow with text, with a 60svh minimum and reserved media space,
   so the 320px layout and short screens do not clip copy or controls.
   Use three accessible mini-timeline selectors centered horizontally. Advance
   on video end; progress follows actual playback. Preserve the existing fallback
   timings on playback failure (10/10/12 seconds), reset on manual selection, and
   suspend playback offscreen or in a hidden tab. Reduced motion stops automatic
   playback and advance while keeping manual slide selection available; supplied
   posters/first frames remain visible. Do not add a pause button.
   Headings remain readable immediately, without entrance effects, sticky scroll
   stages or scroll-driven transforms. The banner remains in document flow.
2. HomeHero — a white «О компании» section, with the user-approved company copy on
   the left and the existing HEISSKRAFT «25» video on the right. Place the
   video inside a square with softly rounded corners and no visible border;
   keep its complete image visible (`object-fit: contain`) without cropping
   the brand mark.
   Preserve the four paragraphs about the company, the «Качество в деталях»
   motto, quality control and partnerships, followed by «Более 25 лет на рынке…».
   Keep the copy in readable paragraphs; below 900px stack it above the video.
   Do not add the former «Продукция» / «Наши проекты» button pair: the current
   approved block contains copy and video only. Start the video only when its visible area
   enters the viewport and the block has finished loading. Pause offscreen
   or in a hidden browser tab and resume on return. Play automatically in a
   continuous forward-then-reverse cycle using the prepared ping-pong media,
   preserving the original pace and geometry. Do not show a pause button in
   this section. Reduced motion shows the still. Keep the block
   background white.
3. Solutions — six existing application cards without a separate introductory
   banner, extra heading or CTA row. Keep rounded pure-white surfaces with a thin red
   outline at 24% opacity, red icons and restrained
   gray titles (18px, medium weight) below the icons. On mouse hover, turn the
   title HEISSKRAFT red (`--hk-red`) and bring the matching outline to full opacity
   with the same 250ms transition. Fade in the small soft gray gradient toward
   the lower corner and the outer shadow only on hover; keep both absent at rest.
   Preserve the visible keyboard
   focus ring. Use three columns on desktop, two on
   tablet and one on compact mobile screens when needed for readability.
   Center each supplied red icon from `public/images/solutions` above its
   clear section title. Use 280px icon boxes on desktop and 260px on mobile,
   constrained to the available width, with a 24px gap before the title.
   Preserve icon proportions, generous internal spacing and readable lettering.
   Keep a soft shadow only on hover. Do not reproduce the
   reference's numbered badge, decorative overlines or arrow buttons.
   Keep the entire card an accessible application link and preserve its
   existing destination. This user-approved layout replaces the previous
   88px / 72px icon cards and their 4px corner treatment.
   On mouse hover, tilt and slightly lift the entire card using the same
   pointer motion as the ClimatFaser banner. Keep a broad, soft neutral reflection
   whose position and intensity derive from the same tilt angles, as though
   a fixed light were reflecting off a physical card. Do not use a timed sweep
   or a spotlight attached to the cursor. Fade the reflection away on exit.
   Keep the link target stationary, ease the visual surface back on exit,
   preserve keyboard focus, and disable motion for touch and reduced motion.
4. Footer — dark (`#1D1D1F`) and shared by the root layout, see section 23.

HomeHero, Solutions and Footer use `DeferredBlock`: they begin loading on
viewport entry, show a matching skeleton while pending, then reveal once.
The opening banner must remain available without waiting for lower sections.

Product catalog CTAs go to `/catalog` for now. Specific equipment-selection
CTAs use their dedicated routes: «Подбор насосов» links to `/selection/pumps`
and «Подбор трубопровода» to `/selection/pipelines`. Application links may
navigate to their dedicated page once it exists. Preserve existing project,
designer and selection destinations rather than redirecting them to the catalog.

# 13. Motion language

Presentation motion should feel:

- calm
- smooth
- controlled
- physical
- cinematic
- precise

Control feedback remains prompt; use the specific durations in section 28.

Avoid:

- bounce
- elastic movement
- playful transitions
- excessive parallax
- random floating UI
- aggressive zooms

Sections reveal once on viewport entry with a short fade and small vertical
movement. The established `block-enter` treatment is 650ms with a 20px offset
and `--hk-ease`. Reuse it rather than introducing unrelated entrance effects.

Defer below-the-fold block code and media until the block enters the viewport.
Keep a representative layout footprint while loading, with pale neutral
skeleton shapes and a gentle sweeping highlight. The highlight is a loading
state, not decorative glow. Do not add artificial loading delays or a global
preloader. Show a retry action if a block fails to load.

Hidden or loading content must not remain keyboard-focusable. Keep headings
and descriptions readable by assistive technology; decorative motion is
`aria-hidden`. Content must remain accessible with reduced motion, and
skeleton sweeps, typewriter effects and scroll transforms must be disabled
or resolve immediately for that preference.

Lenis smooth scroll may stay site-wide. Respect `prefers-reduced-motion`.

---

# 14. 3D

Use realtime 3D only when interaction provides real value.

Primary example:

Проектировщикам.

The interactive building may include:

- ХВС
- ГВС
- отопление
- other engineering systems

Systems may use functional color coding.

For the designer building, interactions may include:

- select a system
- isolate it
- inspect a node
- zoom into equipment
- select a product
- open description
- navigate to catalog

This list is not a requirement to add camera controls to every model. The ЦОД
model keeps its fixed orthographic view; FireOff keeps its six authored views.
Their no-orbit/no-free-zoom contracts in section 24 remain in force.

Realtime 3D must remain technically readable,
not decorative.

---

# 15. Forms

Forms should feel integrated into the page.

Do not make forms look like an old CRM widget.

Prefer:

- large inputs
- clean labels
- thin borders
- generous spacing
- simple focus state
- two-column desktop grid when appropriate
- one-column mobile layout

Avoid placing the entire form inside a heavy card.

The active header request dialog presents one existing field per step, inspired by
Ando's quiet, centered form transitions: ФИО, Телефон, Email, Ваш город,
Детали обращения, Прикрепите файл, then the existing personal-data consent.
Keep field names, order, required status and file formats unchanged. Files stay
optional. Keep all controls mounted across steps so entered values and attachments
survive Back/Next. Validate the current step before advancing; Enter advances a
single-line field, while Enter in details adds a newline. Preserve phone masking.
Use a white rounded dialog with browser-style Back/Forward icon buttons in its
header, without a visible dialog title or a segmented top status bar. This form
navigation is an explicit exception to the no-arrows rule for action buttons.
Keep the primary Next/Submit action at the bottom. A small circular red progress
ring in the footer advances only after a successful Next action (including the
forward arrow or Enter, and a skipped optional file), never while typing or
changing a field. The final Submit action completes it and shows a green check.
The phone field has a
searchable country-code selector matching the site's rounded white surfaces;
format and validate the number for the selected country. Use soft 160ms exit /
420ms entrance transitions with a small vertical shift and fade. A successful
completion triggers one soft red light sweep across the viewport behind the
dialog. Reverse the step transition direction when going back. Respect
reduced motion, keyboard focus containment, Escape, and focus restoration.
Do not introduce additional questions or imply a connected backend: the current
submission remains the existing local success state until transport is added.

Primary project form heading:

Есть проект?

Расскажите нам о нём.

---

# 16. Buttons, links and action geometry

### Action hierarchy

Use compact rectangular primary and secondary actions with the original 8px
corner radius. The user reverted the capsule migration on 2026-10-19. Preserve
named 9/10/12px component radii and originally circular or pill-shaped controls.

| Variant | Surface and label | Geometry | Behavior |
|---|---|---|---|
| Primary | `--hk-red`, white text | 8px radius; min-height 44px; 10px 22px padding; Text 17/400 | Hover/pressed `--hk-red-strong` |
| Secondary | White/transparent, red text, 1px red border | Same height and 8px radius as adjacent primary | Darken label/border on hover/press |
| Utility | Neutral text, transparent or light-neutral surface | 8px corners; Text 14px; 44px target where practical | Neutral color/surface feedback |
| Icon control | Neutral circle or unfilled utility area | 44×44px hit target; 16–20px glyph | Accessible name and visible focus |
| Inline prose link | Context-appropriate readable text | Inherits paragraph type; underlined | Color change on hover, no animated underline |

One main action per decision area; one adjacent secondary action where useful.
Keep pairs equal in height and wrap or stack without clipping Russian labels.
HomeHero has no CTA pair in the current approved layout. Utility labels may be
smaller than primary CTA labels. Compact
shape does not justify reducing touch targets or shrinking text to force a fit.

Keep the ParkBanner CTA white with dark text and its existing subtle border and
shadow and its original 8px corners. The catalog's inline
morphing search, model help button and browser-style form Back/Forward controls
retain their specific interaction geometry. The header request link remains a
text action rather than becoming a filled button in the 44px header.

All actions need default, hover, pressed, keyboard-focus, disabled and (when
real work is pending) loading states; see section 27. Prefer color feedback on
press. Do not import a global `scale(.95)` from the Apple reference: it would
compound the existing card tilt and is not part of the approved motion system.
Use a visible 2px focus outline with 4px offset where it fits; never clip it.

Do not append decorative arrows to CTAs. Small meaningful vector icons may
clarify a destination but must not replace the label. Directional controls such
as carousel navigation and form Back/Forward are the explicit exceptions.
Avoid oversized pills, gradient fills, glowing CTAs and unnecessary red blocks.

Navigation links, breadcrumbs and footer links use a roughly 280ms color
transition, darkening on light surfaces and becoming whiter on dark surfaces.
Keep the established header/catalog sibling dimming, subject to readable text
contrast. Do not add hover underlines or animated underline effects. Underlines
are reserved for links in running prose; keyboard focus has its own indicator.

In product solution sections keep equipment-selection actions adjacent to
catalog actions: «Подбор насосов» → `/selection/pumps`, «Подбор трубопровода» →
`/selection/pipelines`; catalog CTAs → `/catalog`. These selection pages currently
contain only their matching headings. Do not invent working selectors or reroute
them to the catalog. Preserve existing project and designer destinations.

---

# 17. Imagery

Prioritize:

1. HEISSKRAFT products
2. real engineering systems
3. technical renders
4. real production
5. architecture
6. project documentation

Avoid generic stock imagery.

Do not use generic:

- engineer with helmet
- handshake
- office team
- abstract AI technology
- generic pipes

unless specifically requested.

A tile that does not have media yet uses `MediaPlaceholder`:
neutral gray background (`#e8e8ed`), the monochrome HK symbol centered,
about 40% of the tile width, 12–15% opacity, `aria-hidden`.
Tile text stays readable above the mark.
Do not invent a product image for that state.

`MediaPlaceholder` indicates an unavailable asset. A shimmer skeleton instead
indicates an actual pending block or media load; do not confuse the two states.

---

# 18. Engineering system colors

Brand colors and engineering colors serve different purposes.

Brand UI:
black / white / HEISSKRAFT red

Engineering visualization may use:

ХВС
blue

ГВС
red

Отопление
warm red / orange

These colors are functional identifiers.

Do not spread these colors across unrelated UI.

In the ЦОД model, blue supply/red return and yellow valve highlighting are
explicit category identifiers; HIP pump emphasis uses the existing subtle
pulse. Reuse the model's established material values instead of defining new
global accent tokens. Explain the meaning through product-card names or a
legend, not color alone. The ClimatFaser promotional sheen is a separate
asset-specific exception, not an engineering-system legend color.

---

# 19. Responsive behavior

Adapt composition, not just scale. Keep product prominence, clear hierarchy,
readable Russian copy and native touch scrolling. Existing components have
content-driven thresholds; do not replace them with the contradictory breakpoint
lists in the Apple reference.

| Boundary | Contract |
|---|---|
| ≤419px | Small-phone hero may use 28px; prevent controls and long labels from overflowing |
| <600px | Compact gutters; most card grids become one column; Solutions uses 16px card corners; catalog pipeline photo cards retain their two-column exception |
| 600–759px / ≥760px | Catalog entrance changes from two to three portrait columns; at <600px it is one column |
| <768px | Application/mobile compositions; articles' decorative preview disappears; ParkBanner stacks copy and media |
| <834px | Shared header uses mobile navigation; desktop navigation starts at 834px |
| <900px | HomeHero stacks; Solutions becomes two columns until <600px |
| ≤1000px | Deeper catalog grid and model-card layouts use their existing compact arrangements |
| ≥1024px | Default desktop type/spacing presets; component thresholds still apply |
| Wide viewports | Main content locks at 1280px; extra width becomes margins; full-bleed media remains full width |

For new components prefer the nearest established threshold that actually fits
content. Do not make the entire site switch to mobile at 834px just because the
header does. 1280px is a content maximum, not a universal viewport breakpoint.
Avoid page-level horizontal scrolling. True engineering tables can use a
labeled, keyboard-accessible local scroll region if reflow would lose meaning.
Keep units and values together and ensure users can discover overflow.

Test at 320, 375, 419/420, 599/600, 759/760, 767/768, 833/834, 899/900,
1000/1001, 1024, 1440 and 1920px as relevant to the changed component. Check
short landscape viewports, keyboard focus, touch, 200% text zoom and reduced
motion. Test both sides of a changed breakpoint rather than every unrelated
page. A fixed hero or dialog must grow/scroll when text no longer fits.

---

# 20. Forbidden visual patterns

Do not introduce without explicit approval:

- generic SaaS cards
- purple gradients
- blue gradients
- neon glow
- excessive glass
- rounded cards everywhere
- random decorative blobs
- stock startup illustrations
- pill-shaped primary/secondary CTAs (use the restored rectangular 8px shape)
- fake CAD graphics
- fake technical data
- font families beyond the approved Display/Text roles and their fallback
- brand colors beyond the approved global palette and catalog-landing exception
- noisy backgrounds
- excessive shadows
- underlined links on hover (use the colour shift of the header and footer)

---

# 21. Authority and conflict resolution

Use this order when a design choice conflicts:

1. The user's latest explicit decision for the relevant component.
2. Official HEISSKRAFT identity and supplied, unmodified product/logo assets.
3. This revision's approved decisions and target foundation tables.
4. The component/page recipe, including its explicitly named exceptions.
5. A supplied visual reference consistent with the decisions above.
6. The Apple analysis and Augen as supporting inspiration.
7. Designer or implementation judgment.

A specific recipe overrides a generic default only within its stated scope.
The revised typography roles remain intentional. The latest user decision
restores original control radii; it supersedes the earlier capsule proposal. Existing component behavior,
content and destinations remain binding unless this revision explicitly changes
them. Do not infer approval for a site-wide redesign from a single screenshot.

If a new conflict would change identity, navigation, content, functionality or an
approved interaction, state the concrete difference and ask the user. Do not
silently merge incompatible values or preserve two competing global rules.

---

# 22. Implementation behavior

Before a visual change, read the relevant foundations, page recipe and existing
component. Reuse the component and its data rather than building a parallel one.

- Change the requested component; preserve functioning navigation, copy, data,
  forms, keyboard behavior and technical geometry.
- Apply target typography, spacing and shape together when that component is
  explicitly migrated. Avoid mass CSS replacements across unrelated pages.
- Declare proposed tokens once before using them. Reuse the five existing root
  tokens and the scoped catalog accent rather than renaming them casually.
- Update the skeleton and responsive/reduced-motion states with the component.
- Keep distinctions between unavailable media, actual loading and actual errors.
- Document new local exceptions with a reason, scope and source component.
- Verify the change visually and functionally; a documentation edit is not a
  claim that fonts, routes or behaviors have been implemented or tested live.

Prefer the simpler, more restrained, technically accurate solution. For a new
visual pattern check the state matrix and existing recipes before adding a new
color, radius, shadow, breakpoint or motion curve.

---

# 23. Footer

The footer is dark, matching the existing implementation and the user's
explicit choice. It is not the Apple reference's light parchment footer.

- Background `--hk-surface-dark` (`#1D1D1F`).
- Headings white, Text 12px/600 with line-height 1.3.
- Links Text 12px desktop / 13px mobile, white at 72% opacity, white on hover.
- Supporting text uses the same 72% white, with line-height around 1.45.
- Top border `rgb(255 255 255 / 22%)`; lower separator at 16%.
- Keep the 1280px inner grid, established column spacing and low-opacity wordmark.

Do not import Apple's 17px/2.41 footer link preset: it conflicts with the approved
compact footer. Mobile target sizing can be increased through row padding while
keeping text compact. The materials notice uses the readable 12–13px footer
role rather than a separate micro-text token.

Columns (preserve current destinations, including pages still in development):

- Покупателям — Каталог (`/catalog`), Подбор оборудования (`/catalog`),
  База знаний (`/articles`), Документация (`/docs`).
- Компания — Информация о компании (`/about`), Проекты HEISSKRAFT (`/projects`),
  Сервисный центр (`/contacts#service`), Реквизиты организации (`/requisites`).
- Правовая информация — Политика конфиденциальности (`/privacy`),
  Обработка персональных данных (`/personal-data`).
- Контакты — phone, email, postal address; phone and email remain actionable.

On mobile columns stack. The bottom row retains copyright, privacy links,
materials notice and wordmark. Focus indicators are white and visible against
the dark surface. Do not invent an accordion, remove legal copy or change
navigation destinations as part of the visual migration.

---

# 24. Application pages and engineering storytelling

Follow this narrative for pages such as «Системы охлаждения ЦОД»:

1. A clear opening banner with a meaningful heading and a concise benefit.
   Put it in a separate rectangle with all four corners rounded and a small,
   visible gap below the fixed header. The banner must not touch or visually
   merge into the header; account for the header height at every breakpoint.
   Do not add a redundant «На главную» or «Вернуться на главную» button:
   the shared header logo already provides that navigation.
2. Brief context: what the facility does and why its engineering needs matter.
3. Interactive explanatory illustrations paired with short text. Each control
   should clarify a stage, component or flow, with usable touch and keyboard
   interactions and a readable default state.
4. Relevant HEISSKRAFT solutions, using verified product names, real imagery
   when available, and only documented applications or specifications.
5. Clear catalog and equipment-selection CTAs placed together, as specified
   in the button rules. Catalog CTAs for pumps and ClimatFaser link to
   `/catalog`; their selection CTAs use `/selection/pumps` and
   `/selection/pipelines`. Preserve the distinction between browsing products
   and opening a selection page, even while those pages await implementation.

Use the display/text font roles from section 3, white / neutral surfaces, restrained spacing and red
accents. Favor a legible engineering diagram over decorative dashboards or
fictional readouts. Illustrative flow lines may explain a concept, but label
conceptual schematics as such; do not imply they are a measured installation
plan or a validated equipment selection.

Do not frame the hero with decorative footer captions such as
«HEISSKRAFT / Инженерные системы» or «От тепла — к решению», divider rules,
or a second small caption repeating the heading. This does not prohibit
functional diagram labels or concise factual source notes.

Construct each engineering illustration in a consistent coordinate system.
Use a coherent ground plane, perspective and back-to-front drawing order so
equipment stands on its intended surface and correctly occludes objects
behind it. Supply and return branches must reach the corresponding equipment
ports. Match the number of connections to the illustrated targets; do not leave disconnected
branches floating between racks. Keep pump symbols, flow markers and labels
clear of adjacent lines, with enough space to read each element separately.

The ЦОД page retains the original animated server illustration in its opening
banner, without the pump symbol or the «Решения в каталоге» button. Keep the
hero white and borderless. Use neutral gray and dark gray for the animated
server illustration, without blue tints; retain the red engineering accents.
Use white surfaces with a visible neutral border for the model screen and
product parameter tables; do not rely on near-white gray fills to define these blocks.
Align the outer hero surface to the site content grid (1280px maximum), with
centered side margins and responsive gutters.
Place the introduction immediately after this banner, then the supplied
`public/models/chilling.glb` interactive model, then the product sections. The
model replaces both former schematic explorers; do not restore those explorers.
Keep a fixed orthographic view matching the user's October 8 reference:
server racks on the left, pumps and pipework in front, cooler on the right.
No rotation, dragging, zoom controls or automatic camera movement. Initially
render the entire model in neutral gray. Let the model screen span the full
content grid. Place three compact product cards in a horizontal row below it on
desktop, stacking them on mobile. Collapsed cards show only the short product
name (ClimatFaser, HIP pumps, HEISSKRAFT valves), without description text.
Selecting a card or model part expands that same card smoothly in width and
height, revealing the image and full description inside its border. Do not
append a separate preview panel. Animate closing and switching as well; with
reduced motion, change state immediately. Hovering selectable geometry temporarily
highlights its category; clicking selects its description.
After a model click, start smooth scrolling immediately alongside the cards'
opening/closing morph. Measure their final layout in a hidden, non-interactive
copy with transitions disabled; never wait for the visible morph to finish.
Scroll just enough to reveal the selected description below the fixed header.
Do not scroll if the entire expanded card already fits. Repeated clicks on
the selected model part can reveal its card again. Cancel pending movement if
the visitor starts scrolling; use instant movement with reduced motion.
Preserve native mobile page scrolling and offer the same selection through keyboard-accessible
cards. Show a product preview for the selected category; until product images
are supplied, use the gray HEISSKRAFT logo as its image placeholder. Use the
existing ClimatFaser product photo for the pipe card. ClimatFaser highlights supply blue
and heat return red; HIP «ин-лайн» highlights both pumps with a subtle light
pulse; HEISSKRAFT valves highlights only the ball valves in yellow. Preserve the geometry
and its detail shading, identify parts by asset names/materials, and keep modes
mutually exclusive. Re-selecting the active option or clearing selection restores
gray. Do not show a separate «Снять выделение» button. In the lower right of
the model screen, place an accent-red «Как пользоваться» control. Morph its
shared surface upward from the compact button into the instructions, using
the same 600ms easing as product cards, a fixed lower-right corner, and a
gentle delayed content reveal. Reverse the morph when closing; do not show a
detached floating panel or scale the text. Respect reduced motion. Explain hover, selecting geometry and toggling product
cards with small cursor, tap and card icons. Hide hover instructions on
touch-only devices; support outside-click and Escape dismissal.
Stop pulse animation offscreen, in hidden tabs and with reduced motion.
Load the model on viewport entry with a shimmer placeholder and a retry state.
Keep the page's introduction, product cards and catalog/selection destinations.
In the introduction, a brief definition of a data center in small gray text sits
below the main heading, rather than the label «Что такое ЦОД». Omit the former long definition paragraphs; retain the
narrative about increasing computing loads and cooling requirements.

On the ЦОД product section, place ClimatFaser imagery left and its copy right;
place pump copy left and imagery right. Stack image before copy on mobile.
Enclose these square images in rounded, clipped frames with visible neutral
borders, preserving their aspect ratio without additional cropping. The wide
ClimatFaser banner tilts toward the mouse with a slight lift and enlargement,
like the cards in Higgsfield Academy. A subtle green sheen follows the same
pointer position. Measure pointer coordinates on a stationary wrapper, and
smoothly return the banner to its flat state and fade the sheen on exit. Keep
its lettering legible; disable these decorative effects for touch input and
reduced motion.

Show product selection parameters and short feature lists in a compact
table with a softly rounded outer shape. Use clear labels and values with
comfortable cell spacing. Do not decorate these rows with plus signs,
horizontal rules or accordion-like markers when the rows are not controls.

The fire suppression page at `/solutions/fire-suppression` follows this same
sequence: animated sprinkler hero, reliability context, supplied FireOff model,
FireOff promotional banner, HK-Boost FPA/FPV stations, project CTA. Reuse the
same card morph, help panel, white surfaces and lazy-loading placeholders.
Use the supplied Parking_Sprinkler_P04 parking scene with six fixed views:
overview, pump station, top-down FireOff network, sprinkler assembly, fire
cabinet connection and the station's flange transition. Selecting one of the
five cards, a numbered model marker or an assembly smoothly changes the camera,
then holds it still. Place the compact description cards in the upper-left corner
inside the model screen, with one expanded description: a large product preview,
the title below it, one sentence of text and a catalog button without arrows.
Anchor the five numbered hints to the actual model nodes, with names on hover/focus
and short leader lines. Keep the camera framing clear of the panel; on phones the
model sits below the compact panel within the same screen.
No orbit, drag, free zoom or automatic rotation. Keep the camera viewport
visible on selection; «Общий вид» and toggling the active card return to the
overview. Respect reduced motion and stop rendering when idle/offscreen.
Retain the model's material families and use restrained hover highlighting.
On selection, keep the chosen assembly opaque while the surrounding geometry
fades to a partially transparent neutral tone; mute other markers to gray without
disabling them. Restore every material and marker on return to the overview.
Use a restrained red/neutral hover sheen
for the FireOff banner. FPA and FPV have distinct applications; preserve their
separate descriptions and imagery. Keep provenance in
`docs/fire-suppression-assets.md`. Do not infer certified pipe dimensions or
hydraulic performance from the model geometry.

Keep the narrative factual and calm. Verify current industry trends and
product claims against primary sources, and make the sources available where
useful. Do not invent capacities, temperatures, pressure ratings, savings,
certifications, project participation or guarantees. Distinguish general
cooling principles from the documented capabilities of a HEISSKRAFT product.

---

# 25. Catalog navigation

The catalog starts at `/catalog` and unfolds one level at a time. Each category
has its own shareable address and functional breadcrumbs back through its parents.
Keep this user-approved hierarchy and order in `src/lib/catalog.ts`:

- Трубопроводные системы: Heisskraft Therm, Heisskraft Multilayer, Heisskraft HDPE,
  Heisskraft FireOff, Heisskraft Black Pipe.
- Насосное оборудование: Повышение давления, Циркуляционные, Скважинные,
  Дренажные, Канализационные, Насосные станции, Автоматика / принадлежности.
- Вспомогательное оборудование, with no invented subcategories.

The first catalog page has a white search area below the shared header and an
accessible, visually hidden «Каталог» h1. Preserve this existing composition.
Its search fills the grid width. Show
three red portrait cards with an exact 9:16 aspect ratio. Their background and
local search accent use the approved `--catalog-accent: #CA3C32`, scoped only
to this entrance as specified in section 2. Put each section name
in white at the bottom, with a large animated engineering illustration above.
Omit «5 систем», «7 категорий» and other card quantity captions. Preserve the
search field and all three existing destinations. Use three columns on desktop,
two on smaller tablets and one on mobile, keeping the portrait ratio.
Give the three entrance cards soft resting shadows. When one is hovered, preserve
its existing tilt and smoothly scale the other two to 96.5% with smaller, lighter
shadows, like settling onto a surface. Restore them on exit; disable this motion
for touch and reduced-motion preferences.
All three entrance covers use supplied muted, inline, looping videos filling the
portrait cards: pipes.mp4, pumpscategory.mp4 and accessories.mp4 respectively.
Start illustrations on viewport entry, pause them offscreen and in hidden tabs,
and show still illustrations with reduced motion. Match loading placeholders to
the portrait cards and the search field.

Deeper catalog levels and search results retain the shared content grid, white
surfaces, readable neutral borders, restrained headings and rounded category cards.
Reuse the homepage's pointer tilt, slight
lift and smooth return unchanged. Add a soft neutral hover reflection that reacts
to the existing tilt, including on video covers; fade it out on pointer exit.
Keep the whole card a keyboard-accessible link. Reduce to two columns on tablets
and one on narrow screens. Disable decorative motion for touch and reduced motion.

Pipeline system photo cards are the exception: keep two columns on mobile,
with readable portrait proportions and descriptions always visible. On desktop
with a fine hover pointer, slide each description and its bottom gradient up
from below the card on hover or keyboard focus, and retract them on exit.
Keep this reveal clipped inside the rounded card without moving the grid or
changing its existing tilt/reflection. Touch devices show the descriptions
immediately; reduced motion removes the sliding transition.

Reveal cards with the existing 650ms block entrance on first viewport entry.
Mount their illustrations only on entry; show pale shimmer placeholders while
loading, with no artificial delay. Offscreen placeholders remain static. Functional
search spans the complete hierarchy and accepts `?q=` from the shared header.

Category pages (every level below `/catalog`) have no visible heading, description,
breadcrumbs or search field in the page body (the `h1` stays as screen-reader text).
Instead, `CatalogFloatingNav` places a single light, fully opaque surface at the top left of
the content, where the heading would be: functional breadcrumbs («Каталог / … / текущий
раздел») and a search icon. It is `position: sticky` just below the fixed header
(header height + 10px), so it rests against the header and travels with the page while
scrolling. Below 600px the middle of a long path collapses to «…», which links
one level up. The icon expands the same surface horizontally into an input (600ms,
the product-card easing, delayed content fade); on narrow screens the path yields its
width to the field. Typing searches the whole hierarchy and replaces the card grid;
Enter writes `?q=`. Escape or the close button clears and collapses it, and a blur with an
empty field collapses it too. Keep the field inert while collapsed. The surface is solid
white (`#fff`, no transparency or backdrop blur) with a thin `rgb(0 0 0 / 10%)` border
and no shadow. Text is `#6e6e73`, the current (active) crumb HEISSKRAFT red (`--hk-red`) at weight 500;
links darken to `#1d1d1f` on hover (no underline) while the other path items and the
search icon dim in the same manner as header navigation; the current 28% opacity
is a legacy value to replace with a contrast-safe floor during migration. Apply
this only on hover-capable fine pointers; keep text readable per section 29.
The focused search field is marked by a thin red border only, with no glow or
outer ring; red also colours the open search icon. Never show section counts («Разделов: N»,
«Найдено разделов: N») on any catalog screen. The catalog landing keeps its own
full-width search and is unaffected.

Current illustrations are conceptual engineering drawings, not product photographs
or dimensional diagrams. Until real assortment data is supplied, category leaves
show a clear availability placeholder and the existing equipment-selection link
where applicable. Do not invent products, SKUs, prices, technical specifications
or additional hierarchy levels.

---

# 26. Articles library

The `/articles` library uses `ArticleAccordion`, adapted from the supplied
`services-animation` reference. Keep the existing search and topic filters.
The first result is expanded by default; clicking a heading opens its summary
and closes the previous one. Clicking it again collapses it. Each expanded
summary keeps its category, reading time and a real «Читать статью» link.

Use a 620ms height transition with cubic-bezier(.625,.05,0,1). Reveal description
lines through masks over 480ms, starting after 180ms with a 45ms line stagger.
SplitText must adapt to font loading and resizing and revert on unmount.
On desktop, crossfade existing HEISSKRAFT category imagery over 300ms and let
the preview follow the selected heading vertically with .055 interpolation.
While a summary is open, hover changes heading emphasis but keeps its preview;
when all summaries are closed, hover or keyboard focus can change the preview.
Images illustrate the topic, not the exact product discussed in every article.

Below 768px hide the decorative preview and use a readable single-column list.
Respect reduced motion: expand immediately, show unsplit text and disable image
and movement transitions. Keep collapsed summaries inert and out of the
accessibility tree. Apply the locally loaded Display/Text roles from section 3. Preserve white surfaces, the 1280px content grid and
restrained red accents. Do not copy the reference's agency copy or artwork.

---

# 27. Shared component contracts and states

A component specification includes its purpose, semantic element, geometry,
responsive behavior and interaction states. Hover is documented for this site;
the Apple reference's instruction to omit it is not adopted. Hover supplements
click, tap and keyboard use and must never be the only way to reach information.

### State matrix

| Component | Default | Hover / pressed | Keyboard focus / selection | Disabled / pending / error |
|---|---|---|---|---|
| Primary / secondary CTA | Section 16 geometry and color | Darker red; no global press scaling | Visible outline independent of hover | Prevent repeat activation during real pending work; keep label and width stable; explain an unavailable action |
| Navigation / prose link | Neutral navigation; underlined prose link | Color shift; only header/catalog siblings may dim | Visible focus; `aria-current="page"` for current navigation | No fake disabled anchors; omit a link only when there is genuinely no destination and explain why |
| Linked category / solution card | Full-card link with its page-specific image and border | Approved tilt/reflection and local shadow only | Focus on the stationary link wrapper; reveal any hover-only description on focus too | Skeleton only while loading; explicit empty state if no real assortment exists |
| Selectable model card / filter | Button with clear label; unselected neutral surface | Subtle color feedback; preserve existing morph | Expose selected/expanded state with appropriate semantics; color plus border/text/state indicator | Keep other options operable; no fabricated counts, results or disabled products |
| Field / search | Persistent label, text-role font, neutral border | Border feedback without moving content | Visible border/focus treatment; preserve typed value | Invalid state has specific text and `aria-invalid`; pending does not erase data; successful state describes what actually happened |
| Dialog / popover | Opened by an explicit control with accessible name | Existing local transitions | Focus placement, Escape and return-to-trigger behavior; modal focus containment | Error/retry stays inside the current flow; maintain entered values |
| Async media / section | Reserved aspect ratio and useful surrounding copy | No decorative loading feedback on hover | Pending content is not focusable; retry control is focusable | Loading, empty, unavailable and failed are separate states |

Do not nest buttons inside an all-card link. For a model card containing its own
actions, use a container with separate selection and navigation controls rather
than making the entire container an interactive ancestor of another control.
Use links for navigation and buttons for changes on the current page.

### Fields and forms

Default new field geometry: white surface, 1px `--hk-border`, 12px radius,
16–18px input text, minimum 48px height and readable vertical padding. The
existing lead flow retains its 58px fields, optional file step and 20px dialog
(16px on compact screens). Its navigation controls can keep smaller visual
circles within a larger touch target. Standalone catalog search retains 10px
corners; article and mobile-menu searches retain 8px. The `CatalogFloatingNav`
morph remains its explicit exception.

A placeholder is an example, not the label. Connect supporting/error text to
its field. Validate on submission/step advance, then update an existing error
as the person corrects it; do not announce an error on every keystroke before
interaction. Keep consent wording, required status, file formats and phone
formatting unchanged. Show upload progress only for a real upload. The current
lead dialog's local completion is not proof of server delivery.

The lead dialog has no visible title by design, but still needs an accessible
name. On step changes focus the next relevant field or step heading without
reading hidden steps. Back/Forward keeps field values and attachments intact.

### Empty, loading and failed states

- **Loading:** a pale, aspect-ratio-matched skeleton and `aria-busy` on its region;
  sweep only while visible and motion is allowed. No artificial wait.
- **Unavailable media:** `MediaPlaceholder` with the supplied HK symbol, static;
  no endless shimmer and no invented product image.
- **No search results:** keep the query visible, say no matches were found and
  offer clearing/editing the query; do not show invented section counts.
- **Empty category:** explain that product data is not available yet and retain
  the real equipment-selection link where applicable.
- **Failed load:** concise explanation and a real retry control; preserve the
  surrounding page, current selection and typed values where possible.

### Icons and engineering data

Use one coherent family of simple vector UI icons. Default glyph sizes are
16px in compact controls, 20px in primary controls and 24px where emphasis is
needed, with a consistent optical stroke around 1.5–2px. Size the hit target
separately. Keep supplied solution illustrations and the logo at their authored
proportions; they are not ordinary UI icons to normalize to this scale.
Decorative icons are hidden from assistive technology; icon-only controls have
names. Directional icons express an actual direction, never CTA decoration.

Keep values aligned, units explicit and typography readable in tables. Use
`tabular-nums` for numeric columns, actual table headers and a caption/name.
Do not infer product data from illustrations. Do not replace a simple parameter
comparison with a dashboard, nonfunctional accordion or random CAD notation.

---

# 28. Motion presets and retained exceptions

Motion has two speeds: brief feedback for controls and slower, controlled
transitions for presentation. "Cinematic" never means delaying input feedback.
Use the existing `--hk-ease: cubic-bezier(.22, 1, .36, 1)` where specified;
component-specific curves and durations below are intentional exceptions.

| Purpose | Established treatment | Boundary |
|---|---|---|
| Simple action feedback | 200–280ms color/background change; utility `ease` | No positional movement on navigation hover |
| Solutions emphasis | 250ms title/outline; 450ms shadow/reflection | Hover-capable fine pointers only |
| Shared pointer tilt | 300ms tracking / 600ms return; perspective 1600px; lift 12px; scale 1.015 | Reuse `use-pointer-tilt`; stationary hit target, no timer-driven light sweep |
| Block entrance | 650ms, 20px upward settle, `--hk-ease` | Once on viewport entry, not a repeated scroll animation |
| Model card/help/search morph | 600ms, existing easing and delayed content reveal | Change surface geometry without scaling text; specific recipe owns anchors and scroll behavior |
| Lead step | 160ms exit / 420ms entrance, small directional shift | Back reverses direction; validation before advance |
| Article accordion | 620ms height with `cubic-bezier(.625,.05,0,1)`; 480ms text reveal after 180ms, 45ms stagger | Reuse section 26; not the default for all accordions |
| Logo | Existing Rive Build timing and three visible seconds before playback | Preserve section 4/11 asset, lockup and lifecycle rules |

Reuse the existing tilt amplitude (up to about ±5° on X and ±3.125° on Y);
do not add independent rotation, stronger zoom or a second press transform.
Solutions reflections stay neutral. The ClimatFaser green sheen and FireOff
red/neutral sheen are asset-specific exceptions, not new interface accents.
The catalog entrance retains its sibling settling effect at 96.5% scale.

Reduced motion removes tilt, parallax, decorative sheen/sweeps, staggered text,
skeleton sweep, entrance displacement and animated auto-scroll. Expanded states
remain available immediately; videos show their stills and slides remain
manually selectable. Pause video/3D/animation work while hidden or offscreen;
render 3D on demand when idle. Clean up timers, observers and font/text-splitting
work when a component unmounts.

**Playback decision:** retain no visible pause button in ParkBanner or HomeHero,
as explicitly confirmed by the user. Keep system reduced-motion support, still
fallbacks and offscreen/hidden-tab suspension. This choice is not a claim of
full accessibility conformance; see section 29. For new decorative media prefer
a still or manual start rather than adding another automatic loop by default.

---

# 29. Readability, accessibility and media delivery

### Readability and control access

Target at least 4.5:1 text contrast; the 3:1 large-text exception applies only
at 24px regular or approximately 18.7px bold and above. Check the actual text,
background and composited opacity, including hover states. Small gray copy is
not exempt. Inactive controls and decorative marks are different from readable
navigation links. See [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Preserve navigation sibling dimming as an interaction, but do not normalize the
current 28% opacity into a global token. During migration raise the minimum
opacity enough to retain readable contrast. Logos/placeholders may remain low
opacity because they are not the only carrier of functional information.

Use a 44×44 CSS-pixel touch target for standalone controls; a smaller visible
icon can sit inside that area. This is the project's preferred target, aligned
with [W3C's enhanced target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html),
not a statement that every existing desktop link already meets it. Inline links
stay within readable prose; compact desktop menus need sufficient spacing.
Do not enlarge targets through overlapping invisible hit areas.

Retain logical heading order, accessible names and keyboard access to all
selection, search and model-card operations. Hidden panels/steps cannot receive
focus. Focus must remain visible and unobscured by the fixed header. The
catalog morphing input's red-border-only focus is a scoped exception to the
outer ring; its keyboard focus still needs to be clearly visible. On dark
surfaces prefer a white ring instead of low-contrast red. Do not encode selected,
invalid or successful states solely through color.

### Accepted playback limitation

The user retained automatic ParkBanner/HomeHero motion without visible pause
controls. Reduced-motion and visibility-based stopping help, but are not proof
that every visitor has an in-page mechanism to stop automatic movement. Do not
claim compliance with [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
on that basis. Keep this as an explicit accepted design limitation, not an
instruction to add a pause button against the decision. The same consideration
applies when assessing other existing autoplay media.

### Media and performance

Keep the first meaningful hero image available eagerly; defer below-the-fold
media/code as specified by `DeferredBlock`. Set intrinsic width/height or an
aspect ratio before media arrives. Supply responsive image sizes so a phone
does not download an unnecessarily large desktop render. Prefer appropriate
WebP/AVIF derivatives where they preserve the source, with a compatible fallback;
keep exact SVG/vector assets for the official logo and authored illustrations.

Use `contain` for product geometry and branded company video; only use `cover`
where the page recipe explicitly permits cropping. The ParkBanner video's
horizontal crop is a specific exception, not permission to crop engineering
products elsewhere. Provide meaningful alternative text for informative imagery,
empty alt text for purely decorative imagery, and still/error fallbacks for
motion/WebGL. The product-card list must work without selecting geometry in 3D.

Do not treat everything above the footer as eagerly loaded or introduce a
site-wide preloader. Keep useful page content available while optional media
fails. Font switching must not clip headings, shift a fixed control out of reach
or break article line splitting; remeasure those components after fonts load.

---

# 30. Implementation map and review checklist

The visual migration is applied to the existing homepage, catalog, articles,
contacts, application pages, designer viewer, lead dialog and shared navigation.
It does not introduce backend features or replace established page content.

| Area | Implemented state / retained exception |
|---|---|
| Fonts | Local SF Pro Display/Text WOFF2, real 400/500/600/700 faces, preloading and adjusted loading fallback; SF UI Text is disconnected |
| Typography | Shared responsive scale: 56px desktop hero, 40px section title, 17px reading text; named compact roles remain |
| Main CTA | Original 8px shared corners restored, 44px minimum; decorative arrows removed from stub/viewer CTAs; meaningful icons retained |
| Search | Original corners restored: catalog 10px, articles/mobile menu 8px; floating breadcrumb-search retains its local shape |
| Foundations | `src/app/design-tokens.css` defines semantic colors, type, spacing, radii and selected shadows; imported by `globals.css` |
| Header / grid | White 44px header and 1280px content grid retained |
| Footer | Dark surface retained; 12–13px readable notice and link text |
| Catalog entrance | Scoped `#CA3C32` retained; global brand red remains `#D8222B` |
| Effects | Existing tilt, reflections, shadows, morphs and reveal behavior retained; component reduced-motion handling preserved |
| Navigation dimming | Readable secondary color replaces 28% sibling opacity in header/catalog navigation |
| Touch controls | Search, dialog navigation, viewer pins and relevant actions enlarged to 44px without enlarging their glyphs |
| Homepage | Existing three-slide content, company copy without actions, and six cards without an extra banner retained; mobile banner grows to fit text |
| Playback | No visible pause in ParkBanner/HomeHero; existing reduced-motion and visibility behavior retained |
| Loading | Matching search geometry and section spacing updated in existing skeletons |

`--catalog-accent` remains local. Component-specific engineering colors, media
geometry, morph radii and deliberate compact labels are not replaced globally.
SF Pro assets are bundled and connected. Verify loaded font faces in the browser,
not just the declared family stack, when reviewing typography.

For each implementation change verify:

1. The correct component/page recipe and any explicitly approved exception.
2. Real routes, product facts, field order and required/optional behavior.
3. Correct font role, actual loaded face, Cyrillic wrapping and zoom behavior.
4. Default, hover, pressed, focus, selected, loading, empty and failed states
   that actually apply to the component; no fabricated state or fake backend.
5. Responsive layout at the affected boundaries and a short viewport.
6. Keyboard, touch and reduced-motion behavior; readable text after dimming.
7. Media aspect ratio, skeleton alignment and offscreen/hidden-tab suspension.
8. A clear statement of what changed in code versus what remains specification.

Do not mark a documentation-only edit as visual implementation, completed
accessibility testing or a working equipment-selection/backend feature.
