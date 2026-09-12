"use client";

import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  EditorCapability,
  ImageImportInput,
} from "@/features/presentations/application/editor-capability";
import type { EditorSession } from "@/features/presentations/application/editor-session";
import type {
  ElementPatch,
  ElementSize,
  PresentationState,
  Slide,
  SlideBackground,
  TextElement,
  TextStylePatch,
  TransitionType,
} from "@/features/presentations/core/presentation-core";
import type { EditorIntentDraft } from "./editor-drafts";
import type { DragCommitResult } from "./editor-drag";
import {
  hasGeometryPatch,
  normalizeGeometryDraftPatch,
} from "./editor-geometry-draft";
import {
  getImageUrlRecordIfChanged,
  type ImageAssetReference,
  type ImageUrlEntry,
  reconcileImageUrlEntries,
} from "./editor-image-urls";
import type { EditorSelection } from "./editor-model";
import { toEditorSlide } from "./editor-projection";
import { EditorShell } from "./editor-shell";
import { useEditorStore, useEditorStoreApi } from "./editor-store-provider";
import { useEditorSession } from "./use-editor-session";

type EditorControllerProps = {
  readonly capability: EditorCapability;
  readonly presentationId: string;
};

type EditorStatus =
  | { readonly kind: "loading" }
  | { readonly kind: "not-found" }
  | { readonly kind: "error" }
  | { readonly kind: "ready"; readonly state: PresentationState };

type EditorCommandRunResult = DragCommitResult;
const MAX_IMAGE_IMPORT_COUNT = 10;

export function EditorController({
  capability,
  presentationId,
}: EditorControllerProps) {
  const t = useTranslations("Editor");
  const store = useEditorStoreApi();
  const snapshot = useEditorStore((state) => state.snapshot);
  const effective_state = useEditorStore((state) => state.effectiveState);
  const active_slide_id = useEditorStore((state) => state.activeSlideId);
  const selection = useEditorStore((state) => state.selection);
  const {
    loadStatus: load_status,
    sessionRef: session_ref,
    schedulerRef: scheduler_ref,
  } = useEditorSession({ capability, presentationId, store });
  const status: EditorStatus =
    snapshot === null || effective_state === null
      ? load_status
      : { kind: "ready", state: effective_state };
  const [image_urls, set_image_urls] = useState<
    Readonly<Record<string, string>>
  >({});
  const image_import_pending_ref = useRef(false);
  const image_url_entries_ref = useRef(new Map<string, ImageUrlEntry>());
  const image_load_generation_ref = useRef(0);
  const image_asset_reference_key = getImageAssetReferenceKey(
    effective_state?.slides ?? [],
  );
  const get_image_asset_references = useEffectEvent(() =>
    getImageAssetReferences(effective_state?.slides ?? []),
  );
  const has_image_asset_reference_key = useEffectEvent(
    (key: string) =>
      getImageAssetReferenceKey(effective_state?.slides ?? []) === key,
  );

  useEffect(() => {
    const generation = ++image_load_generation_ref.current;
    const image_asset_references = get_image_asset_references();
    const reconciliation = reconcileImageUrlEntries(
      image_url_entries_ref.current,
      image_asset_references,
    );
    reconciliation.removed.forEach((entry) => {
      URL.revokeObjectURL(entry.url);
    });
    image_url_entries_ref.current = new Map(reconciliation.retained);
    set_image_urls((current) =>
      getImageUrlRecordIfChanged(current, image_url_entries_ref.current),
    );

    void Promise.all(
      reconciliation.missing.map(async (reference) => {
        try {
          const result = await capability.loadAsset(reference.id);
          if (!result.success) return null;
          return {
            ...reference,
            url: URL.createObjectURL(result.asset.binary),
          } satisfies ImageUrlEntry;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      const loaded_entries = entries.filter(
        (entry): entry is ImageUrlEntry => entry !== null,
      );
      if (
        image_load_generation_ref.current !== generation ||
        !has_image_asset_reference_key(image_asset_reference_key)
      ) {
        loaded_entries.forEach((entry) => {
          URL.revokeObjectURL(entry.url);
        });
        return;
      }
      for (const entry of loaded_entries)
        image_url_entries_ref.current.set(entry.id, entry);
      set_image_urls((current) =>
        getImageUrlRecordIfChanged(current, image_url_entries_ref.current),
      );
    });
  }, [capability, image_asset_reference_key]);

  useEffect(
    () => () => {
      image_load_generation_ref.current += 1;
      image_url_entries_ref.current.forEach((entry) => {
        URL.revokeObjectURL(entry.url);
      });
      image_url_entries_ref.current.clear();
    },
    [],
  );

  function runCommand(
    command: (state: PresentationState) => ReturnType<EditorCapability["undo"]>,
    select_created_slide = false,
    on_success?: (state: PresentationState) => void,
    on_accepted?: () => void,
  ): Promise<EditorCommandRunResult> {
    const session = session_ref.current;
    if (session === null) return Promise.resolve({ persisted: false });
    let dispatched: ReturnType<EditorSession["dispatch"]>;
    try {
      dispatched = session.dispatch(command);
    } catch {
      return Promise.resolve({ persisted: false });
    }
    if (!dispatched.accepted) return Promise.resolve({ persisted: false });
    on_accepted?.();
    const next_state = dispatched.state;
    const next_active_slide_id = select_created_slide
      ? (next_state.slides.at(-1)?.id ?? null)
      : getActiveSlideId(next_state.slides, store.getState().activeSlideId);
    store.getState().setActiveSlideId(next_active_slide_id);
    store
      .getState()
      .setSelection(
        getSelection(
          next_state,
          next_active_slide_id,
          store.getState().selection,
        ),
      );
    on_success?.(next_state);
    return dispatched.persisted.then((persisted) => ({ persisted }));
  }

  function runSlideHistoryCommand(
    command: EditorCapability["undoSlide"] | EditorCapability["redoSlide"],
    stack: "undoStack" | "redoStack",
  ): Promise<EditorCommandRunResult> {
    scheduler_ref.current?.flushAll();
    const session = session_ref.current;
    const active_slide_id = store.getState().activeSlideId;
    const entry =
      active_slide_id === null
        ? undefined
        : session
            ?.getSnapshot()
            .state.slideHistories[active_slide_id]?.[stack].at(-1);
    if (active_slide_id === null || entry === undefined)
      return Promise.resolve({ persisted: false });
    return runCommand((state) => command(state, { slideId: active_slide_id }));
  }
  function runPresentationHistoryCommand(
    command:
      | EditorCapability["undoPresentation"]
      | EditorCapability["redoPresentation"],
    stack: "undoStack" | "redoStack",
  ): Promise<EditorCommandRunResult> {
    scheduler_ref.current?.flushAll();
    if (
      session_ref.current
        ?.getSnapshot()
        .state.presentationHistory[stack].at(-1) === undefined
    )
      return Promise.resolve({ persisted: false });
    return runCommand(command);
  }

  function runSlideCommand(
    command: (state: PresentationState) => ReturnType<EditorCapability["undo"]>,
    on_success?: (state: PresentationState) => void,
  ): Promise<EditorCommandRunResult> {
    scheduler_ref.current?.flushAll();
    return runCommand(command, false, on_success);
  }

  function dispatchEditorIntent(draft: EditorIntentDraft): boolean {
    let accepted = false;
    if (draft.kind === "text") {
      void runCommand(
        (state) =>
          capability.editTextElement(state, {
            slideId: draft.slideId,
            elementId: draft.elementId,
            content: draft.content,
          }),
        false,
        undefined,
        () => {
          accepted = true;
        },
      );
      return accepted;
    }
    if (draft.kind === "slide") {
      void runCommand(
        (state) => {
          if (draft.patch.background !== undefined)
            return capability.editSlideBackground(state, {
              slideId: draft.slideId,
              background: draft.patch.background,
            });
          const transition = draft.patch.transition;
          return capability.configureTransition(state, {
            slideId: draft.slideId,
            type: transition?.type ?? "none",
            configuration:
              transition === undefined
                ? undefined
                : { duration: transition.duration },
          });
        },
        false,
        undefined,
        () => {
          accepted = true;
        },
      );
      return accepted;
    }
    void runCommand(
      (state) =>
        draft.elementIds.length === 1
          ? capability.editElement(state, {
              slideId: draft.slideId,
              elementId: draft.elementIds[0] ?? "",
              patch: draft.patch,
            })
          : capability.editElements(state, {
              slideId: draft.slideId,
              elementIds: draft.elementIds,
              patch: draft.patch,
            }),
      false,
      undefined,
      () => {
        accepted = true;
      },
    );
    return accepted;
  }

  function scheduleTextEdit(
    slide_id: string,
    element_id: string,
    content: string,
  ): string {
    const key = `text:${slide_id}:${element_id}`;
    scheduler_ref.current?.schedule({
      key,
      draft: {
        kind: "text",
        slideId: slide_id,
        elementId: element_id,
        content,
      },
      delay: 300,
      dispatch: dispatchEditorIntent,
    });
    return key;
  }

  function scheduleElementPatch(
    slide_id: string,
    element_ids: readonly string[],
    patch: ElementPatch,
  ): void {
    const normalized_ids = [...element_ids].sort();
    if (normalized_ids.length > 1 && hasGeometryPatch(patch)) {
      for (const element_id of normalized_ids)
        scheduleElementPatch(slide_id, [element_id], patch);
      return;
    }
    const key = `element:${slide_id}:${normalized_ids.join(",")}`;
    const existing = scheduler_ref.current?.getDrafts().get(key);
    const previous_patch =
      existing?.kind === "element" ? existing.patch : undefined;
    const merged_patch = mergeElementPatches(previous_patch, patch);
    const element = getActiveSlide(
      effective_state?.slides ?? [],
      slide_id,
    )?.elements.find(
      (current_element) => current_element.id === normalized_ids[0],
    );
    scheduler_ref.current?.schedule({
      key,
      draft: {
        kind: "element",
        slideId: slide_id,
        elementIds: normalized_ids,
        patch:
          element === undefined
            ? merged_patch
            : normalizeGeometryDraftPatch(element, merged_patch),
      },
      delay: 150,
      dispatch: dispatchEditorIntent,
    });
  }

  function flushElementIntents(slide_id: string, element_id: string): void {
    const scheduler = scheduler_ref.current;
    if (scheduler === null) return;
    for (const [key, draft] of scheduler.getDrafts()) {
      if (
        draft.kind === "element" &&
        draft.slideId === slide_id &&
        draft.elementIds.includes(element_id)
      )
        scheduler.flush(key);
    }
  }

  function commitElementPatch(
    slide_id: string,
    element_ids: readonly string[],
    patch: ElementPatch,
  ): void {
    scheduleElementPatch(slide_id, element_ids, patch);
    for (const element_id of element_ids)
      flushElementIntents(slide_id, element_id);
  }

  function applyElementPatch(
    slide_id: string,
    element_ids: readonly string[],
    patch: ElementPatch,
  ): void {
    for (const element_id of element_ids)
      flushElementIntents(slide_id, element_id);
    void runCommand((state) =>
      element_ids.length === 1
        ? capability.editElement(state, {
            slideId: slide_id,
            elementId: element_ids[0] ?? "",
            patch,
          })
        : capability.editElements(state, {
            slideId: slide_id,
            elementIds: element_ids,
            patch,
          }),
    );
  }

  function scheduleSlidePatch(
    slide_id: string,
    patch: Extract<EditorIntentDraft, { readonly kind: "slide" }>["patch"],
  ): string {
    const key = `slide:${slide_id}:${patch.background === undefined ? "transition" : "background"}`;
    const existing = scheduler_ref.current?.getDrafts().get(key);
    const previous_patch =
      existing?.kind === "slide" ? existing.patch : undefined;
    scheduler_ref.current?.schedule({
      key,
      draft: {
        kind: "slide",
        slideId: slide_id,
        patch: { ...previous_patch, ...patch },
      },
      delay: 150,
      dispatch: dispatchEditorIntent,
    });
    return key;
  }

  if (status.kind === "loading") return <EditorLoading label={t("loading")} />;
  if (status.kind === "not-found")
    return (
      <EditorMessage
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
      />
    );
  if (status.kind === "error")
    return (
      <EditorMessage
        title={t("loadErrorTitle")}
        description={t("loadErrorDescription")}
      />
    );

  const transition_labels: Record<TransitionType, string> = {
    none: t("transitionNone"),
    fade: t("transitionFade"),
    slide: t("transitionSlide"),
    scale: t("transitionScale"),
  };
  const slides = status.state.slides.map((slide, index) =>
    toEditorSlide(
      slide,
      index,
      t("slideNumber", { number: index + 1 }),
      transition_labels,
    ),
  );
  const active_slide =
    slides.find((slide) => slide.id === active_slide_id) ?? null;
  const accepted_active_slide =
    snapshot?.state.slides
      .map((slide, index) =>
        toEditorSlide(
          slide,
          index,
          t("slideNumber", { number: index + 1 }),
          transition_labels,
        ),
      )
      .find((slide) => slide.id === active_slide_id) ?? null;
  const slide_history =
    active_slide_id === null
      ? undefined
      : status.state.slideHistories[active_slide_id];
  const can_undo =
    active_slide_id !== null && slide_history?.undoStack.at(-1) !== undefined;
  const can_redo =
    active_slide_id !== null && slide_history?.redoStack.at(-1) !== undefined;
  const can_undo_presentation =
    status.state.presentationHistory.undoStack.at(-1) !== undefined;
  const can_redo_presentation =
    status.state.presentationHistory.redoStack.at(-1) !== undefined;

  return (
    <EditorShell
      title={status.state.title}
      slides={slides}
      activeSlide={active_slide}
      acceptedActiveSlide={accepted_active_slide}
      activeSlideId={active_slide_id}
      canvas={status.state.canvas}
      canRedo={can_redo}
      canUndo={can_undo}
      canRedoPresentation={can_redo_presentation}
      canUndoPresentation={can_undo_presentation}
      selection={selection}
      labels={{
        addSlide: t("addSlide"),
        addText: t("addText"),
        addImage: t("addImage"),
        addShape: t("addShape"),
        shapeType: t("shapeType"),
        shapeRectangle: t("shapeRectangle"),
        shapeCircle: t("shapeCircle"),
        shapeLine: t("shapeLine"),
        alignment: t("textAlign"),
        layoutAlign: t("layoutAlign"),
        alignmentCenter: t("alignmentCenter"),
        alignmentLeft: t("alignmentLeft"),
        alignmentRight: t("alignmentRight"),
        canvasLabel: t("canvasLabel"),
        color: t("textColor"),
        content: t("content"),
        desktopRequiredDescription: t("desktopRequiredDescription"),
        desktopRequiredTitle: t("desktopRequiredTitle"),
        emptySlide: t("emptySlide"),
        fontSize: t("fontSize"),
        fontWeight: t("fontWeight"),
        fontWeightBold: t("fontWeightBold"),
        fontWeightRegular: t("fontWeightRegular"),
        textRoleH1: t("textRoleH1"),
        textRoleH2: t("textRoleH2"),
        textRoleH3: t("textRoleH3"),
        textRoleParagraph: t("textRoleParagraph"),
        presentation: t("presentation"),
        properties: t("properties"),
        actions: t("actions"),
        appearance: t("appearance"),
        layers: t("layers"),
        transform: t("transform"),
        redo: t("redo"),
        resizeElement: t("resizeElement"),
        resizeHandleLabels: {
          north: t("resizeNorth"),
          "north-east": t("resizeNorthEast"),
          east: t("resizeEast"),
          "south-east": t("resizeSouthEast"),
          south: t("resizeSouth"),
          "south-west": t("resizeSouthWest"),
          west: t("resizeWest"),
          "north-west": t("resizeNorthWest"),
        },
        slide: t("slide"),
        slideBackground: t("slideBackground"),
        slideTransition: t("slideTransition"),
        transitionDuration: t("transitionDuration"),
        transitionFade: t("transitionFade"),
        transitionNone: t("transitionNone"),
        transitionScale: t("transitionScale"),
        transitionSlide: t("transitionSlide"),
        slides: t("slides"),
        role: t("role"),
        undo: t("undo"),
        position: t("position"),
        size: t("size"),
        rotation: t("rotation"),
        opacity: t("opacity"),
        width: t("width"),
        height: t("height"),
        x: t("x"),
        y: t("y"),
        fill: t("fill"),
        border: t("border"),
        borderWidth: t("borderWidth"),
        radius: t("radius"),
        fit: t("fit"),
        fitContain: t("fitContain"),
        fitCover: t("fitCover"),
        imageUnavailable: t("imageUnavailable"),
        moveInstruction: t("moveInstruction"),
        rotationElement: t("rotationElement"),
        rotationInstruction: t("rotationInstruction"),
        moveForward: t("moveForward"),
        moveBackward: t("moveBackward"),
        deleteElement: t("deleteElement"),
        deleteSlide: t("deleteSlide"),
        duplicateSlide: t("duplicateSlide"),
        centerHorizontally: t("centerHorizontally"),
        centerVertically: t("centerVertically"),
        alignLeft: t("alignLeft"),
        alignRight: t("alignRight"),
        alignTop: t("alignTop"),
        alignBottom: t("alignBottom"),
        bringToFront: t("bringToFront"),
        sendToBack: t("sendToBack"),
      }}
      onCreateSlide={() => {
        scheduler_ref.current?.flushAll();
        return runCommand(capability.createSlide, true);
      }}
      onDuplicateSlide={() => {
        if (active_slide_id === null) return;
        let duplicate_index = -1;
        void runSlideCommand(
          (state) => {
            duplicate_index = state.slides.findIndex(
              (slide) => slide.id === active_slide_id,
            );
            return capability.duplicateSlide(state, {
              slideId: active_slide_id,
            });
          },
          (next_state) => {
            const duplicated_slide = next_state.slides[duplicate_index + 1];
            if (duplicated_slide === undefined) return;
            store.getState().setActiveSlideId(duplicated_slide.id);
            store.getState().setSelection({ kind: "none" });
          },
        );
      }}
      onDeleteSlide={() => {
        if (active_slide_id === null) return;
        let fallback_slide_id: string | null = null;
        void runSlideCommand(
          (state) => {
            fallback_slide_id = getDeletedSlideFallbackId(
              state.slides,
              active_slide_id,
            );
            return capability.deleteSlide(state, { slideId: active_slide_id });
          },
          () => {
            store.getState().setActiveSlideId(fallback_slide_id);
            store.getState().setSelection({ kind: "none" });
          },
        );
      }}
      onReorderSlide={(slide_id, after_slide_id) => {
        void runSlideCommand((state) =>
          capability.reorderSlide(state, {
            slideId: slide_id,
            afterSlideId: after_slide_id,
          }),
        );
      }}
      onCreateText={() =>
        active_slide_id === null
          ? undefined
          : runCommand(
              (state) =>
                capability.createTextElement(state, {
                  slideId: active_slide_id,
                  content: t("newTextContent"),
                }),
              false,
              (next_state) => {
                const element = getActiveSlide(
                  next_state.slides,
                  active_slide_id,
                )?.elements.at(-1);

                if (element?.type === "text") {
                  store
                    .getState()
                    .setSelection({ kind: "text", elementId: element.id });
                }
              },
            )
      }
      imageUrls={image_urls}
      onCreateShape={(shape_type) => {
        if (active_slide_id === null) return;
        void runCommand(
          (state) =>
            capability.createShapeElement(state, {
              slideId: active_slide_id,
              shapeType: shape_type,
            }),
          false,
          (next_state) => {
            const element = getActiveSlide(
              next_state.slides,
              active_slide_id,
            )?.elements.at(-1);
            if (element?.type === "shape")
              store
                .getState()
                .setSelection({ kind: "shape", elementId: element.id });
          },
        );
      }}
      onUploadImages={(files) => {
        if (active_slide_id === null || image_import_pending_ref.current)
          return;
        void importImages(files, active_slide_id);
      }}
      onRedo={() => {
        return runSlideHistoryCommand(capability.redoSlide, "redoStack");
      }}
      onSelectSlide={(slide_id) => {
        store.getState().setActiveSlideId(slide_id);
        store.getState().setSelection({ kind: "none" });
      }}
      onUndo={() => {
        return runSlideHistoryCommand(capability.undoSlide, "undoStack");
      }}
      onUndoPresentation={() =>
        runPresentationHistoryCommand(capability.undoPresentation, "undoStack")
      }
      onRedoPresentation={() =>
        runPresentationHistoryCommand(capability.redoPresentation, "redoStack")
      }
      onSelectElement={(element_id, additive = false) => {
        const element = getActiveSlide(
          status.state.slides,
          active_slide_id,
        )?.elements.find((current) => current.id === element_id);
        if (element === undefined) return;
        store
          .getState()
          .setSelection(
            getNextSelection(
              selection,
              element,
              getActiveSlide(status.state.slides, active_slide_id)?.elements ??
                [],
              additive,
            ),
          );
      }}
      onSelectElements={(element_ids, additive) => {
        const elements =
          getActiveSlide(status.state.slides, active_slide_id)?.elements ?? [];
        const next_ids = additive
          ? new Set([...getSelectionIds(selection), ...element_ids])
          : new Set(element_ids);
        const valid_ids = [...next_ids].filter((id) =>
          elements.some((element) => element.id === id),
        );
        store
          .getState()
          .setSelection(createSelection(elements, valid_ids, valid_ids.at(-1)));
      }}
      onDeselectElement={() => store.getState().setSelection({ kind: "none" })}
      onTextContentChange={(content) => {
        const selected_text = getSelectedText(
          status.state,
          active_slide_id,
          selection,
        );

        if (selected_text === null) return;
        scheduleTextEdit(
          selected_text.slideId,
          selected_text.element.id,
          content,
        );
      }}
      onTextContentCommit={(content) => {
        const selected_text = getSelectedText(
          status.state,
          active_slide_id,
          selection,
        );
        if (selected_text === null) return;
        const key = scheduleTextEdit(
          selected_text.slideId,
          selected_text.element.id,
          content,
        );
        scheduler_ref.current?.flush(key);
      }}
      onMoveEnd={async (element_id, x, y) => {
        if (active_slide_id === null) return { persisted: false };
        return runCommand((state) =>
          capability.moveElement(state, {
            slideId: active_slide_id,
            elementId: element_id,
            position: { x, y },
          }),
        );
      }}
      onResizeEnd={(element_id, position, size) => {
        if (active_slide_id === null)
          return Promise.resolve({ persisted: false });
        return runCommand((state) =>
          capability.editElement(state, {
            slideId: active_slide_id,
            elementId: element_id,
            patch: { position, size },
          }),
        );
      }}
      onRotateEnd={(element_id, rotation) => {
        if (active_slide_id === null)
          return Promise.resolve({ persisted: false });
        return runCommand((state) =>
          capability.editElement(state, {
            slideId: active_slide_id,
            elementId: element_id,
            patch: { rotation },
          }),
        );
      }}
      onTextStyleChange={(style) => {
        const selected_text = getSelectedText(
          status.state,
          active_slide_id,
          selection,
        );

        if (selected_text === null) return;
        scheduleElementPatch(
          selected_text.slideId,
          [selected_text.element.id],
          {
            style: style satisfies TextStylePatch,
          },
        );
      }}
      onTextStyleCommit={(style) => {
        const selected_text = getSelectedText(
          status.state,
          active_slide_id,
          selection,
        );
        if (selected_text === null) return;
        commitElementPatch(selected_text.slideId, [selected_text.element.id], {
          style: style satisfies TextStylePatch,
        });
      }}
      onTextStyleApply={(style) => {
        const selected_text = getSelectedText(
          status.state,
          active_slide_id,
          selection,
        );
        if (selected_text === null) return;
        applyElementPatch(selected_text.slideId, [selected_text.element.id], {
          style: style satisfies TextStylePatch,
        });
      }}
      onElementPatch={(element_id, patch) => {
        if (active_slide_id === null) return;
        const element_ids = getSelectionIds(selection);
        if (selection.kind === "multiple" && element_ids.includes(element_id)) {
          scheduleElementPatch(active_slide_id, element_ids, patch);
          return;
        }
        scheduleElementPatch(active_slide_id, [element_id], patch);
      }}
      onElementPatchCommit={(element_id, patch) => {
        if (active_slide_id === null) return;
        const element_ids = getSelectionIds(selection);
        commitElementPatch(
          active_slide_id,
          selection.kind === "multiple" && element_ids.includes(element_id)
            ? element_ids
            : [element_id],
          patch,
        );
      }}
      onBringForward={(element_id) => {
        if (active_slide_id === null) return;
        void runCommand((state) =>
          capability.bringForward(state, {
            slideId: active_slide_id,
            elementId: element_id,
          }),
        );
      }}
      onBringToFront={(element_id) => {
        if (active_slide_id === null) return;
        void runCommand((state) =>
          capability.bringToFront(state, {
            slideId: active_slide_id,
            elementId: element_id,
          }),
        );
      }}
      onSendBackward={(element_id) => {
        if (active_slide_id === null) return;
        void runCommand((state) =>
          capability.sendBackward(state, {
            slideId: active_slide_id,
            elementId: element_id,
          }),
        );
      }}
      onSendToBack={(element_id) => {
        if (active_slide_id === null) return;
        void runCommand((state) =>
          capability.sendToBack(state, {
            slideId: active_slide_id,
            elementId: element_id,
          }),
        );
      }}
      onAlignElement={(element_id, alignment) => {
        if (active_slide_id === null) return;
        void runCommand((state) =>
          capability.alignElement(state, {
            slideId: active_slide_id,
            elementId: element_id,
            alignment,
          }),
        );
      }}
      onDeleteElement={(element_id) => {
        if (active_slide_id === null) return;
        scheduler_ref.current?.flushAll();
        void runCommand((state) =>
          capability.deleteElement(state, {
            slideId: active_slide_id,
            elementId: element_id,
          }),
        );
      }}
      onBackgroundChange={(background) => {
        if (active_slide_id === null) return;
        scheduleSlidePatch(active_slide_id, {
          background: background satisfies SlideBackground,
        });
      }}
      onBackgroundCommit={(background) => {
        if (active_slide_id === null) return;
        const key = scheduleSlidePatch(active_slide_id, {
          background: background satisfies SlideBackground,
        });
        scheduler_ref.current?.flush(key);
      }}
      onTransitionChange={(type, duration) => {
        if (active_slide_id === null) return;
        scheduleSlidePatch(active_slide_id, {
          transition: {
            type,
            duration:
              duration ??
              status.state.slides.find((slide) => slide.id === active_slide_id)
                ?.transition.duration ??
              0,
          },
        });
      }}
      onTransitionCommit={(type, duration) => {
        if (active_slide_id === null) return;
        scheduler_ref.current?.flush(`slide:${active_slide_id}:transition`);
        void runCommand((state) =>
          capability.configureTransition(state, {
            slideId: active_slide_id,
            type,
            ...(duration === undefined ? {} : { configuration: { duration } }),
          }),
        );
      }}
    />
  );

  async function importImages(
    files: readonly File[],
    slide_id: string,
  ): Promise<void> {
    image_import_pending_ref.current = true;
    if (files.length > MAX_IMAGE_IMPORT_COUNT) {
      image_import_pending_ref.current = false;
      return;
    }
    if (files.some((file) => !file.type.startsWith("image/"))) {
      image_import_pending_ref.current = false;
      return;
    }
    let images: readonly ImageImportInput[];
    try {
      images = await Promise.all(
        files.map(async (file) => ({
          file,
          naturalSize: await getImageNaturalSize(file),
        })),
      );
    } catch {
      image_import_pending_ref.current = false;
      return;
    }
    image_import_pending_ref.current = false;
    void runCommand(
      (state) =>
        images.length === 1
          ? capability.createImageElement(state, {
              slideId: slide_id,
              file: images[0].file,
              naturalSize: images[0].naturalSize,
            })
          : capability.createImageElements(state, {
              slideId: slide_id,
              images,
            }),
      false,
      (next_state) => {
        const element = getActiveSlide(
          next_state.slides,
          slide_id,
        )?.elements.at(-1);
        if (element?.type === "image")
          store
            .getState()
            .setSelection({ kind: "image", elementId: element.id });
      },
    );
  }
}

function getActiveSlideId(
  slides: readonly Slide[],
  active_slide_id: string | null,
) {
  return slides.some((slide) => slide.id === active_slide_id)
    ? active_slide_id
    : (slides[0]?.id ?? null);
}

function getDeletedSlideFallbackId(
  slides: readonly Slide[],
  slide_id: string,
): string | null {
  const deleted_index = slides.findIndex((slide) => slide.id === slide_id);
  if (deleted_index === -1) return null;
  return slides[deleted_index - 1]?.id ?? slides[deleted_index + 1]?.id ?? null;
}

function mergeElementPatches(
  previous: ElementPatch | undefined,
  next: ElementPatch,
): ElementPatch {
  return {
    ...previous,
    ...next,
    ...(previous?.style === undefined && next.style === undefined
      ? {}
      : { style: { ...previous?.style, ...next.style } }),
  };
}

function getImageNaturalSize(file: File): Promise<ElementSize> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };
    image.src = url;
  });
}

function getActiveSlide(
  slides: readonly Slide[],
  active_slide_id: string | null,
): Slide | null {
  return slides.find((slide) => slide.id === active_slide_id) ?? null;
}

function getImageAssetReferences(
  slides: readonly Slide[],
): readonly ImageAssetReference[] {
  const references = new Map<string, ImageAssetReference>();
  for (const slide of slides) {
    for (const element of slide.elements) {
      if (element.type !== "image") continue;
      references.set(element.assetId, {
        id: element.assetId,
        // Replacing an image changes its Core asset reference.
        contentIdentity: element.assetId,
      });
    }
  }
  return [...references.values()];
}

function getImageAssetReferenceKey(slides: readonly Slide[]): string {
  return JSON.stringify(
    getImageAssetReferences(slides).toSorted((left, right) =>
      left.id.localeCompare(right.id),
    ),
  );
}

function getSelectedText(
  state: PresentationState,
  active_slide_id: string | null,
  selection: EditorSelection,
): { readonly slideId: string; readonly element: TextElement } | null {
  if (selection.kind !== "text") return null;
  const slide = getActiveSlide(state.slides, active_slide_id);
  const element = slide?.elements.find(
    (current_element) => current_element.id === selection.elementId,
  );

  return element?.type === "text" && slide !== null
    ? { slideId: slide.id, element }
    : null;
}

function getSelection(
  state: PresentationState,
  active_slide_id: string | null,
  selection: EditorSelection,
): EditorSelection {
  if (selection.kind === "none") return selection;
  if (selection.kind === "multiple") {
    const elements =
      getActiveSlide(state.slides, active_slide_id)?.elements ?? [];
    const element_ids = selection.elementIds.filter((id) =>
      elements.some((element) => element.id === id),
    );
    return createSelection(elements, element_ids, selection.primaryElementId);
  }
  return getActiveSlide(state.slides, active_slide_id)?.elements.some(
    (element) =>
      element.id === selection.elementId && element.type === selection.kind,
  )
    ? selection
    : { kind: "none" };
}

function getSelectionIds(selection: EditorSelection): readonly string[] {
  return selection.kind === "none"
    ? []
    : selection.kind === "multiple"
      ? selection.elementIds
      : [selection.elementId];
}

function getNextSelection(
  selection: EditorSelection,
  element: { readonly id: string; readonly type: "text" | "image" | "shape" },
  elements: readonly {
    readonly id: string;
    readonly type: "text" | "image" | "shape";
  }[],
  additive: boolean,
): EditorSelection {
  if (!additive) return { kind: element.type, elementId: element.id };
  const ids = new Set(getSelectionIds(selection));
  if (ids.has(element.id)) ids.delete(element.id);
  else ids.add(element.id);
  return createSelection(elements, [...ids], element.id);
}

function createSelection(
  elements: readonly {
    readonly id: string;
    readonly type: "text" | "image" | "shape";
  }[],
  ids: readonly string[],
  primary_id: string | undefined,
): EditorSelection {
  if (ids.length === 0) return { kind: "none" };
  const primary =
    elements.find((element) => element.id === primary_id) ??
    elements.find((element) => element.id === ids[0]);
  if (ids.length === 1 && primary !== undefined)
    return { kind: primary.type, elementId: primary.id };
  return {
    kind: "multiple",
    elementIds: ids,
    primaryElementId: primary_id ?? ids[0],
  };
}

function EditorLoading({ label }: { readonly label: string }) {
  return (
    <main
      aria-busy="true"
      aria-label={label}
      className="flex min-h-dvh items-center justify-center p-6"
    >
      <Skeleton className="h-96 w-full max-w-6xl" />
    </main>
  );
}

function EditorMessage({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Empty role="alert">
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  );
}
