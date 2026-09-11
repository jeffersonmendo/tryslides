# Tryslides Roadmap

This roadmap reflects **implementation status**. Product scope and intended
contracts are defined in [`docs/product/`](./docs/product/README.md).

## In progress

The current desktop editor provides these implemented foundations:

- Local presentation creation, opening, and persistence.
- Slide creation, selection, duplication, deletion, background and transition
  editing, and drag-and-drop reordering.
- Text, image, and rectangle creation with canvas selection, movement, resize,
  rotation, opacity, inspector controls, and undo/redo.
- Direct text editing, multi-selection, marquee selection, and group rotation
  and opacity editing.
- Local image import and rendering, limited to ten image files per import.

## Pending MVP

These capabilities remain part of the MVP contract but are not available yet:

- Animate: animation authoring and playback.
- Present mode: fullscreen slide playback and its navigation controls.
- Public sharing and publication through public presentation URLs.
- Static PDF export.
- Renaming and deleting presentations from the UI.
- Visible feedback when an image import is rejected or cannot be processed.

## Out of scope / deferred

The initial MVP does not include AI or MCP editing, real-time collaboration,
comments, video, audio, charts, tables, embeds, advanced animation systems,
template marketplaces, PowerPoint export, responsive presentations, or a
mobile editor.
