# HEISSKRAFT — Digital Design System

This file is the source of truth for the visual language of the new HEISSKRAFT website.

Before creating or modifying visual UI, follow these rules.

Main visual reference:
https://augen.pro/

Do not copy the reference literally.

The goal is:

Augen-like minimalism
+
HEISSKRAFT brand identity
+
industrial engineering
+
architectural precision

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

# 2. Official brand colors

Use the official HEISSKRAFT palette:

White
#FFFFFF

Black
#000000

HEISSKRAFT Red
#D8222B

Red is the primary brand accent.

The only approved derivative is the darker pressed/hover shade
#B81C24

In code both live as design tokens:
--hk-red
--hk-red-strong

Do not invent additional brand colors.

Neutral greys may be used for:
- borders
- secondary text
- disabled states
- glass surfaces
- technical UI

Use red selectively.

Red should indicate:
- important actions
- active states
- brand accents
- meaningful engineering information

Do not make large parts of the interface red without a clear reason.

---

# 3. Typography

Website UI font:

"SF UI Text", sans-serif

Use the locally bundled SF UI Text files consistently for:
- navigation
- headings
- body text
- labels
- forms
- technical information
- buttons

Reuse the existing 400, 500, 600 and 700 weights in `globals.css`.
Do not introduce additional web fonts without explicit approval.

Suggested hierarchy:

Display:
32–56px desktop; scale down for mobile

Section heading:
22–40px

Body:
15–18px

Navigation:
13–15px

Technical labels:
10–13px

Use large typography sparingly.

Prefer:
large object + restrained typography

instead of:
huge marketing headline + many buttons

Small labels are for functional information only: diagram equipment names,
interactive controls, factual table labels, sources and form fields.

Do not add decorative eyebrow text, category overlines, section indexes or
small slogans above headings. Avoid labels such as «Системы охлаждения ЦОД»,
«Инфраструктура цифрового мира» or «01 / Циркуляция» when they merely repeat
or decorate the content. Put the meaningful subject directly in the heading
or body text instead. Do not use uppercase or letter spacing to turn these
decorative captions into a visual pattern.

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

# 6. Visual reference: Augen

Reference:

https://augen.pro/

Use it as inspiration for:

- negative space
- restrained layout
- premium product presentation
- lightweight glass UI
- subtle navigation
- large visual objects
- calm transitions
- compact, functional typography
- minimal interface

Do NOT copy:
- exact layouts
- exact animation timing
- exact component proportions
- exact text placement

HEISSKRAFT must be more industrial and technical.

---

# 7. Layout philosophy

Use generous negative space.

Sections should usually communicate one strong idea.

Prefer:

- large areas
- clear grid
- precise alignment
- asymmetric compositions when appropriate
- large product imagery
- simple typography
- clear visual hierarchy

Avoid:

- grids of many small cards
- unnecessary containers
- dashboard layouts
- excessive borders
- crowded interfaces

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

# 10. Glassmorphism

Glass is a secondary UI material. The current header has a solid white surface.

Use glass primarily for:

- floating navigation
- 3D controls
- tooltips
- product information
- small overlays

Glass style:

- subtle transparency
- backdrop blur
- thin neutral border
- very soft shadow
- restrained saturation

Avoid:

- blue glass
- neon glass
- strong glow
- thick shadows
- glass cards everywhere

Content sections should normally remain clean and flat.

---

# 11. Header

Reuse the shared `Header` on every page. Its current desktop structure is:

- left: animated HEISSKRAFT logo, linking to the homepage
- navigation: Каталог, База знаний, Проектировщикам, Подбор оборудования
- action: Оставить заявку, opening the existing lead dialog
- right: Контакты and accessible expandable search

«Проектировщикам» links to `/designers`; the other catalog-based navigation
items currently link to `/catalog`. Search submits to `/catalog?q=…`.

The header is fixed at `top: 0`, compact and white, with dark navigation.
Its rectangular surface spans the entire viewport width with no outer
gutters, rounded corners or floating shadow. Following the Apple navigation
reference, the inner bar is constrained to 1024px including 22px horizontal
padding on desktop, with responsive padding on smaller screens. Reuse these established
dimensions rather than restyling it for an individual page.

Below 834px, show the mobile menu and search with the same navigation and
lead action. Keep focus, Escape-to-close and scroll locking behavior intact.

The header is available immediately on every page, including the homepage.
Its approved logo reveal starts when the logo asset loads and does not wait
for scrolling or a banner transition.

# 12. Homepage

The homepage combines a photographic opening with restrained white sections.
Its current sequence is:

1. ParkBanner — a pure-white (#FFFFFF) carousel beneath the header, following
   the approved October 6 park reference. On desktop use the full width, square
   corners and a stable height filling the viewport beneath the header for both
   slides. Keep small outer gutters and rounded corners only on mobile, with
   enough room for all copy. Place dark, left-aligned copy on the left and the
   user's latest park cutout (`galitsky-hero-cutout.png`) on the right; preserve
   its clean white background and silhouette without an extra fading mask.
   Do not darken the photograph. Keep a compact white catalog CTA with dark
   text, a subtle border and shadow as in the reference, and three small
   line-icon benefits below the copy. On mobile, stack the copy above the image.
   Show the park for 7 seconds, then play the supplied pipeline product video
   muted and inline before returning to the photograph. Include accessible
   slide selectors as mini timelines: fill the photograph's bar over 7 seconds
   and the video's bar according to its actual playback position. Reset progress
   on manual selection; preserve progress offscreen and in hidden tabs. Do not
   show a pause button. Fit the video to the full desktop slide height without
   vertical cropping, letterboxing or a top fade; horizontal cropping can fill
   its media area. Reduced motion keeps the slides still and manually selectable.
   Keep headings readable immediately, without typewriter or entrance
   effects, sticky scroll stages or scroll-driven transforms. The banner
   remains in regular document flow; other sections retain their entry effects.
2. HomeHero — a white «О компании» section, with concise company copy on
   the left and the existing HEISSKRAFT «25» video on the right. Place the
   video inside a square with softly rounded corners and no visible border;
   keep its complete image visible (`object-fit: contain`) without cropping
   the brand mark.
   Stack the text above the video on mobile. Reuse compact «Продукция» and
   «Наши проекты» buttons with small meaningful vector icons, linking to
   `/catalog` and `/projects`. Start the video only when its visible area
   enters the viewport and the block has finished loading. Pause offscreen
   or in a hidden browser tab and resume on return. Play automatically in a
   continuous forward-then-reverse cycle using the prepared ping-pong media,
   preserving the original pace and geometry. A small accessible control
   allows pause and resume. Reduced motion shows the still. Keep the block
   background white.
3. Solutions — start with a separate light banner with softly rounded
   corners, the heading «Инженерные решения», a concise description and the
   established compact «Каталог» / «Подбор оборудования» buttons. Follow it
   with six large, light, rounded application cards, based on the user's
   supplied image-card reference. Use three columns on desktop, two on
   tablet and one on compact mobile screens when needed for readability.
   Each card pairs its clear section title with a prominent supplied image
   from the user's «иконки» asset folder. Preserve image proportions and
   equipment details; do not replace these images with the former small
   SVG-only tiles. Use restrained borders or soft shadows, generous internal
   spacing and the existing neutral / red palette. Do not reproduce the
   reference's numbered badge, decorative overlines or arrow buttons.
   Keep the entire card an accessible application link and preserve its
   existing destination. This user-approved layout replaces the previous
   88px / 72px icon cards and their 4px corner treatment.
4. Footer — light and shared by the root layout, see below.

HomeHero, Solutions and Footer use `DeferredBlock`: they begin loading on
viewport entry, show a matching skeleton while pending, then reveal once.
The opening banner must remain available without waiting for lower sections.

Product catalog CTAs go to `/catalog` for now. Specific equipment-selection
CTAs use their dedicated routes: «Подбор насосов» links to `/selection/pumps`
and «Подбор трубопровода» to `/selection/pipelines`. Application links may
navigate to their dedicated page once it exists. Preserve existing project,
designer and selection destinations rather than redirecting them to the catalog.

# 13. Motion language

Motion throughout the site should feel:

- slow
- smooth
- controlled
- physical
- cinematic
- precise

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

Users should be able to:

- select a system
- isolate it
- inspect a node
- zoom into equipment
- select a product
- open description
- navigate to catalog

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

Primary project form heading:

Есть проект?

Расскажите нам о нём.

---

# 16. Buttons

Buttons must remain restrained.

Avoid:

- huge pill buttons
- gradient buttons
- glowing CTA
- unnecessary red blocks

Prefer:

- compact geometry
- clear text
- subtle hover
- thin borders

Do not append decorative arrows or arrow icons to CTA buttons, including
catalog and equipment-selection links. Functional directional controls such
as carousel navigation are allowed when the arrow is the control's meaning.

Use HEISSKRAFT red only when the action deserves strong emphasis.

Reuse the established homepage button treatment for application pages:
8px corners, compact padding, red primary surface with white text, and a
transparent or white secondary surface with a thin red outline. Use the
existing red tokens for hover and a visible keyboard focus ring. Small
vector icons may clarify a destination; they must not replace the label.

In product solution sections, place the equipment-selection action beside
the catalog action: «Подбор насосов» for pumps and «Подбор трубопровода» for
pipe systems. Catalog actions link to `/catalog`; the selection actions link
to `/selection/pumps` and `/selection/pipelines`, respectively. These two
selection pages currently contain only their matching headings, as explicitly
requested, and will receive their tools later. Do not redirect these actions
to the catalog or invent selection functionality. Additional empty selection
pages are allowed when the user explicitly authorizes them. Keep the actions
adjacent on desktop and allow them to wrap or stack cleanly on mobile.

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

---

# 19. Responsive design

Do not simply shrink desktop layouts.

Mobile should preserve:

- visual hierarchy
- product prominence
- whitespace
- readability
- premium feeling

On mobile:

- use simpler compositions
- hide secondary navigation
- use clean menu
- reduce technical overlays
- use single-column forms
- avoid horizontal scrolling

Test:

320px
375px
768px
1024px
1440px
1920px

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
- huge pill CTA buttons
- fake CAD graphics
- fake technical data
- new fonts
- invented brand colors
- noisy backgrounds
- excessive shadows

---

# 21. Design hierarchy

When deciding how to solve a visual problem, use this priority:

1. HEISSKRAFT official brand identity
2. user-provided Figma / screenshot
3. this DESIGN_SYSTEM.md
4. Augen as visual inspiration
5. designer/AI interpretation

A direct user instruction always overrides a generic design guideline.

---

# 22. Development behavior

When modifying a section:

- change only the requested section
- preserve working functionality
- preserve established spacing
- preserve typography
- reuse existing components
- reuse design tokens
- do not redesign unrelated elements

Before adding a new visual pattern,
check whether an existing pattern can be reused.

When uncertain:

choose the simpler,
more restrained,
more technically precise solution.

---

# 23. Footer

The footer is light, in the manner of apple.com.

- background `#f5f5f7`
- headings `#1d1d1f`
- links 12–13px, `#6e6e73`, darker on hover
- thin top border `rgba(0, 0, 0, .12)`

Columns:

- Продукция — Трубопроводные системы, Насосное оборудование, Арматура (all /catalog)
- Покупателям — Каталог, Подбор оборудования, База знаний (all /catalog for now)
- Компания — Информация о компании, Документация, Сервисный центр, Реквизиты организации
  (keep an existing href when the page already has one, otherwise /catalog)
- Контакты — phone, email, postal address

On mobile the columns stack. The bottom row carries the copyright, privacy links,
the materials notice, and a small low-opacity wordmark.

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

Use the existing font, white / neutral surfaces, restrained spacing and red
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
ports. Match the number of connections to the illustrated targets (for
example, all six server racks in the ЦОД hero); do not leave disconnected
branches floating between racks. Keep pump symbols, flow markers and labels
clear of adjacent lines, with enough space to read each element separately.

Show product selection parameters and short feature lists in a compact
table with a softly rounded outer shape. Use clear labels and values with
comfortable cell spacing. Do not decorate these rows with plus signs,
horizontal rules or accordion-like markers when the rows are not controls.

Keep the narrative factual and calm. Verify current industry trends and
product claims against primary sources, and make the sources available where
useful. Do not invent capacities, temperatures, pressure ratings, savings,
certifications, project participation or guarantees. Distinguish general
cooling principles from the documented capabilities of a HEISSKRAFT product.
