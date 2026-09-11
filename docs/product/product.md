# Tryslides Product

## Vision

Tryslides is a modern presentation editor focused on making it fast and
simple to create visually expressive presentations.

The editor should feel direct, minimal, and discoverable.

Users should be able to create, design, animate, present, export, and
share presentations without learning a complex professional design tool.

## Product Principle

> If you can see it, you can click it. If you can click it, you can edit it.

Important functionality should be discoverable through the interface.

Keyboard shortcuts may improve experienced workflows later, but core
product functionality must not depend on hidden shortcuts.

## Core Workflow

The primary Tryslides workflow is:

Create → Design → Animate → Present → Share

A user should be able to:

1. Create a presentation.
2. Create and organize slides.
3. Add elements.
4. Edit elements directly.
5. Configure visual appearance.
6. Add animations and transitions.
7. Preview or present the presentation.
8. Save the presentation.
9. Export it as a static PDF.
10. Share it through a public URL.

## MVP

The MVP should remain deliberately small.

The goal is not to reproduce PowerPoint, Keynote, Canva, or Figma.

The goal is to prove the Tryslides editing and presentation experience.

This document defines MVP scope and product contracts. For current
implementation status, see [`ROADMAP.md`](../../ROADMAP.md). In particular,
Present Mode, public Sharing, and PDF Export remain pending MVP capabilities.

### Presentations

The MVP presentation contract includes the ability to:

- create a presentation
- rename a presentation
- open a presentation
- delete a presentation
- save a presentation
- present fullscreen
- share a presentation
- export a static PDF

The current UI implements local creation, opening, and persistence. Renaming
and deleting presentations from the UI, fullscreen presentation, public
sharing, and PDF export are pending.

### Slides

Users can:

- create slides
- select slides
- duplicate slides
- delete slides
- reorder slides
- configure slide backgrounds
- configure transitions

Initial backgrounds:

- solid color
- gradient

### Text

Initial text roles:

- H1
- H2
- H3
- Paragraph

Text can configure:

- content
- font
- font size
- font weight
- color
- gradient
- alignment
- opacity
- position
- width
- height
- rotation

### Initial Text Editor Slice

The implemented text-editor slice creates a selected text element with
localized default content and logical bounds of `x: 240`, `y: 450`,
`width: 1440`, and `height: 180`. The right-side inspector persists content
and these visual properties:

- role (`H1`, `H2`, `H3`, or `Paragraph`)
- font size
- font weight
- color
- alignment
- position
- width and height
- rotation
- opacity

Choosing a role applies its initial typography preset: H1 is 64px/700, H2 is
48px/700, H3 is 32px/700, and Paragraph is 16px/400. Users can then adjust the
basic properties independently. Users can also edit text directly on the
canvas: a blur or Ctrl+Enter confirms the edit, while Escape cancels it. Text
elements can be moved, resized, and rotated directly on the canvas. Font
family and gradients remain outside this initial text-editor slice.

### Images

Users can:

- upload images
- move images
- resize images
- rotate images
- change opacity
- change border radius
- configure object fit
- replace the underlying image asset

Each import accepts at most ten files. The file input and import validation
accept files whose browser-reported MIME type matches `image/*`; there is no
narrower format allowlist at present. Imports that exceed the limit, include a
non-image type, or fail while reading are currently discarded without visible
feedback. Providing user-visible import feedback is a pending product item.

Image binaries are retained locally outside presentation documents. Deleting a
presentation removes locally orphaned image binaries but preserves binaries
still used by another local presentation.

### Shapes

Initial shapes:

- rectangle
- circle
- line

Shapes may configure:

- fill
- border
- border width
- radius
- opacity
- position
- size
- rotation

## Canvas

The canvas must support the fundamental direct manipulation workflow.

### MVP Canvas Contract

Each presentation has one fixed 1920 × 1080 logical canvas (16:9). The
MVP does not support per-slide formats.

Element positions and sizes use logical canvas units. Renderers may scale
those units to fit their display surface, but they must not redefine the
canvas dimensions.

The Core evaluates bounds from unrotated, axis-aligned position and size;
rotation does not expand that envelope. An element may extend beyond any
canvas edge by up to half of its own width or height. At least half of
each dimension must remain inside the canvas.

Users can:

- select
- move
- resize
- rotate
- delete
- duplicate
- bring forward
- send backward

Undo and redo are required.

### Implemented selection and ordering behavior

The desktop editor supports the following interaction rules:

- Ctrl-click on Windows/Linux or Cmd-click on macOS adds or removes an element
  from the current selection.
- A marquee selection includes an element only when the element's unrotated,
  axis-aligned bounds are fully contained by the marquee.
- For multiple selected elements, the group inspector currently edits rotation
  and opacity. Other group properties are not currently exposed.
- Slides can be reordered by dragging their entries in the slide navigation.

## Animations

Animations are a core Tryslides capability, not an optional decoration.

Animations belong to three categories:

### Entrance

Initial capabilities:

- Fade In
- Slide In
- Scale In
- Typewriter for text

### Exit

Initial capabilities:

- Fade Out
- Slide Out
- Scale Out

### Always

“Always” is the product-facing name for the Core's `continuous` animation
category.

Initial capabilities:

- Float
- Pulse
- Rotate

Animation configuration may include:

- duration
- delay
- easing

Continuous animations may additionally support:

- repeat
- interval

Animation availability may depend on element type.

For example, Typewriter is valid for text but not for images.

An element can have at most one configured animation in each category:
Entrance, Exit, and Always. Configuring a new animation replaces the
existing animation in that category.

## Transitions

Initial slide transitions:

- None
- Fade
- Slide
- Scale

Transitions may configure duration.

## Editor

The editor should prioritize direct manipulation and visible controls.

A typical layout contains:

- slide navigation
- presentation canvas
- add-element controls
- properties panel
- animation controls
- undo / redo
- present action

The current editor requires a desktop viewport. On mobile viewports it shows a
desktop-required notice and does not provide editing controls.

Selecting an element should expose controls appropriate to that element.

Examples:

Text:

- content
- appearance
- position
- animation

Image:

- image
- appearance
- position
- animation

Shape:

- appearance
- position
- animation

Slide:

- background
- transition

## Present Mode

**Status: pending MVP implementation.** The following is the intended
contract, not a currently available mode.

Present mode uses the same presentation semantics as the editor.

A presentation progresses conceptually through:

Slide
→ entrance animations
→ persistent animations
→ exit animations
→ transition
→ next slide

Initial controls:

- next
- previous
- fullscreen
- click navigation
- arrow navigation

## Sharing

**Status: pending MVP implementation.** The following is the intended public
sharing and publication contract, not a currently available feature.

A presentation can be made available through a public URL.

Public URLs use an opaque six-character Base62 `publicId` and the route
`/p/{publicId}`. Internal UUID presentation IDs are never used as public URLs.
New presentations begin as drafts. A presentation becomes published only after
the publishing boundary confirms success; subsequent editing preserves its
published availability while the current editable content may advance.

Public presentation rendering must reuse the presentation rendering
system rather than creating an independent visual implementation.

The exact publishing/snapshot semantics must be documented before the
sharing implementation is finalized.

## PDF Export

**Status: pending MVP implementation.** The following defines the intended
export contract; PDF export is not currently available.

Tryslides supports static PDF export.

PDF export does not need to reproduce interactive animations.

The exported document should preserve the visual static state of each
slide as accurately as practical.

## Authentication

The initial product uses Google authentication only.

Email/password authentication is not part of the initial product.

## Product Access

Tryslides is a paid product.

There is no Free, Basic, Pro, Plus, or Enterprise feature tier in the
initial product.

There is one Tryslides product with one level of access.

Users may choose monthly or annual billing.

Annual billing provides the same product access at a discounted
effective price.

## Deferred Capabilities

The following are intentionally outside the initial MVP:

- AI presentation editing
- MCP
- real-time collaboration
- comments
- video
- audio
- charts
- tables
- embeds
- advanced parallax
- scroll-driven animations
- motion paths
- advanced timeline
- template marketplace
- PowerPoint export
- responsive presentations
- mobile editor

These capabilities must not be implemented merely because the
architecture anticipates them.

## Future AI

AI is expected to become an interface over the existing presentation
system.

AI must not own presentation state.

AI will request valid Presentation Core operations in the same way the
manual editor does.

The manual editor must therefore remain a complete product without AI.
