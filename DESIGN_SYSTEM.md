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

Arial, Helvetica, sans-serif

Use Arial consistently for:
- navigation
- headings
- body text
- labels
- forms
- technical information
- buttons

Do not introduce additional web fonts without explicit approval.

Suggested hierarchy:

Display:
48–88px desktop

Section heading:
32–56px

Body:
16–20px

Navigation:
13–15px

Technical labels:
10–13px

Use large typography sparingly.

Prefer:
large object + restrained typography

instead of:
huge marketing headline + many buttons

Technical labels may use:
- uppercase
- numeric indexes
- slightly increased letter spacing

Example:

01
СИСТЕМЫ ОТОПЛЕНИЯ

Do not overuse this technique.

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

This makes the symbol the preferred mark for the new website Header.

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
- micro typography
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

---

# 9. Industrial character

Industrial character must come from:

- engineering precision
- scale
- technical hierarchy
- material realism
- thin rules
- restrained numbering
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

Glass is a secondary UI material.

Use glass primarily for:

- Header
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

Desktop structure:

LEFT
Каталог
Подбор оборудования
База знаний

CENTER
HEISSKRAFT symbol / logo

RIGHT
Поиск (icon button, aria-label «Поиск»)
Контакты

All five items currently link to /catalog.
«Проектировщикам» is not in the header. The /designers page stays in the site.

The logo must remain geometrically centered in the viewport.

Header:

- fixed
- floating
- compact
- high z-index
- background HEISSKRAFT red (#D8222B)
- white logo and navigation

A transparent home-idle state still exists in code for a `.hero.is-idle` element
(black logo, no bar background). The current homepage does not use that state.

The mobile menu lists the same five items: Каталог, Подбор оборудования,
База знаний, Поиск, Контакты.

# 12. Homepage

The homepage is a static Apple-like sequence on white.
No preloader, no scroll-driven hero video, no glass beats, no scroll-reveal.

Sections, in order, each `data-header-theme="light"`:

1. HomeHero — 100svh, video plays once and holds the last frame («25»).
   Reduced motion shows the last-frame poster. Copy and text links sit in the
   remaining white area. The video stays fully visible (`object-fit: contain`).
2. AboutIntro — caption, heading, paragraph, three static facts
   (25+ лет на рынке, 10 лет гарантии, РФ собственное производство).
   No other figures. No animation.
3. PipesBanner — full-width rounded tile, PE-RT photograph, text in the white area.
4. CategorySplit — two equal tiles. Pumps use MediaPlaceholder until an asset exists.
   Арматура plays its video once when the tile enters the viewport and holds the last frame.
5. Footer — light, see below. It is rendered by the root layout.

Homepage links, header items, and footer product links go to /catalog for now.

Text links use HEISSKRAFT red and a › mark. Hover is the darker red plus an underline.
No pill buttons, gradients, glows, or card clutter on these blocks.

# 13. Motion language

Motion elsewhere on the site should feel:

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

Homepage blocks are static. Do not add scroll-reveal or a scroll-scrubbed video there.

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
- arrows when useful

Use HEISSKRAFT red only when the action deserves strong emphasis.

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