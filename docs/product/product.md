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

### Presentations

Users can:

- create a presentation
- rename a presentation
- open a presentation
- delete a presentation
- save a presentation
- present fullscreen
- share a presentation
- export a static PDF

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

A presentation can be made available through a public URL.

Public presentation rendering must reuse the presentation rendering
system rather than creating an independent visual implementation.

The exact publishing/snapshot semantics must be documented before the
sharing implementation is finalized.

## PDF Export

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
