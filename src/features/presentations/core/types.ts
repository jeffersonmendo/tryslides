export type OperationSource = "user" | "system" | "ai" | "mcp";
export type PresentationStatus = "draft" | "published";
export type PresentationLifecycle = {
  readonly status: PresentationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastSavedAt: string | null;
  readonly lastPublishedAt: string | null;
};

export type PresentationCoreErrorCode =
  | "ANIMATION_NOT_SUPPORTED"
  | "CONFLICT"
  | "ELEMENT_NOT_FOUND"
  | "INVALID_ANIMATION_TYPE"
  | "INVALID_DURATION"
  | "INVALID_SERIALIZED_STATE"
  | "INVALID_TRANSITION_TYPE"
  | "LAYER_BOUNDARY"
  | "REDO_NOT_AVAILABLE"
  | "SLIDE_NOT_FOUND"
  | "UNDO_NOT_AVAILABLE"
  | "VALIDATION_ERROR";

export type PresentationCoreError = {
  readonly code: PresentationCoreErrorCode;
};

/** Coordinates in the presentation's fixed logical canvas. */
export type ElementPosition = { readonly x: number; readonly y: number };
/** Dimensions in the presentation's fixed logical canvas. */
export type ElementSize = { readonly width: number; readonly height: number };
export type ElementAlignment =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";
export type PresentationCanvas = {
  readonly width: number;
  readonly height: number;
};
/**
 * The Core's single logical coordinate system. Renderers may scale it, but
 * cannot choose a different canvas or give slides independent dimensions.
 */
export const PRESENTATION_CANVAS: PresentationCanvas = Object.freeze({
  width: 1920,
  height: 1080,
});
export type AnimationCategory = "entrance" | "exit" | "continuous";
export type AnimationType =
  | "fade-in"
  | "slide-in"
  | "scale-in"
  | "typewriter"
  | "fade-out"
  | "slide-out"
  | "scale-out"
  | "float"
  | "pulse"
  | "rotate";
export type TransitionType = "none" | "fade" | "slide" | "scale";
export type ElementType = "text" | "image" | "shape";
export type SlideBackground =
  | { readonly type: "solid"; readonly color: string }
  | { readonly type: "gradient"; readonly gradient: string };
export type TextStyle = {
  readonly role: "H1" | "H2" | "H3" | "Paragraph";
  readonly font: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly color: string;
  readonly gradient?: string;
  readonly alignment: string;
};
export type ImageStyle = {
  readonly objectFit: string;
  readonly borderRadius: number;
};
export type ShapeStyle = {
  readonly fill: string;
  readonly border: string;
  readonly borderWidth: number;
  readonly radius: number;
};
export type TextStylePatch = Partial<TextStyle>;
export type ImageStylePatch = Partial<ImageStyle>;
export type ShapeStylePatch = Partial<ShapeStyle>;

/**
 * Declarative animation state. The Core validates this configuration but never
 * executes its visual effect.
 */
export type AnimationConfiguration = {
  readonly type: AnimationType;
  readonly duration: number;
  readonly delay: number;
  readonly easing: string;
  readonly repeat?: number | "infinite";
  readonly interval?: number;
};
export type AnimationConfigurationInput = Omit<
  Partial<AnimationConfiguration>,
  "type"
>;
export type SlideTransition = {
  readonly type: TransitionType;
  readonly duration: number;
};
export type TransitionConfigurationInput = { readonly duration?: number };

export type AnimationConfigurationSchema = {
  readonly duration: { readonly minimum: number };
  readonly delay: { readonly minimum: number };
  readonly easing: { readonly minimumLength: number };
  readonly repeat?: { readonly minimum: number; readonly allowsInfinite: true };
  readonly interval?: { readonly minimum: number };
};
/**
 * A discoverable animation definition shared by Core validation and consumers
 * that need to offer valid configuration options.
 */
export type AnimationCapability = {
  readonly id: AnimationType;
  readonly category: AnimationCategory;
  readonly supportedElementTypes: readonly ElementType[];
  readonly defaults: Omit<AnimationConfiguration, "type">;
  readonly configurationSchema: AnimationConfigurationSchema;
};
/**
 * A discoverable transition definition shared by Core validation and consumers
 * that need to offer valid configuration options.
 */
export type TransitionCapability = {
  readonly id: TransitionType;
  readonly defaults: Omit<SlideTransition, "type">;
  readonly configurationSchema: {
    readonly duration: { readonly minimum: number };
  };
};

type ElementBase = {
  readonly id: string;
  readonly revision: number;
  readonly position: ElementPosition;
  readonly size: ElementSize;
  readonly rotation: number;
  readonly opacity: number;
  readonly animations: readonly AnimationConfiguration[];
};
export type TextElement = ElementBase & {
  readonly type: "text";
  readonly content: string;
  readonly style: TextStyle;
};
export type ImageElement = ElementBase & {
  readonly type: "image";
  readonly assetId: string;
  readonly style: ImageStyle;
};
export type ShapeType =
  | "rectangle"
  | "circle"
  | "triangle"
  | "diamond"
  | "star"
  | "heart"
  | "line"
  | "arrow"
  | "double-arrow"
  | "speech-bubble"
  | "round-bubble"
  | "plus"
  | "minus"
  | "multiply"
  | "divide"
  | "equal"
  | "not-equal";
export type ShapeElement = ElementBase & {
  readonly type: "shape";
  readonly shapeType: ShapeType;
  readonly style: ShapeStyle;
};
export type PresentationElement = TextElement | ImageElement | ShapeElement;
type WithoutRevision<T> = T extends unknown ? Omit<T, "revision"> : never;
type WithoutAnimations<T> = T extends unknown ? Omit<T, "animations"> : never;
type WithoutStyle<T> = T extends unknown ? Omit<T, "style"> : never;
/**
 * Caller-supplied element data. The Core assigns its initial revision and empty
 * animation configuration when the element is created.
 */
export type NewPresentationElement =
  | (WithoutStyle<WithoutAnimations<WithoutRevision<TextElement>>> & {
      readonly style?: TextStylePatch;
    })
  | (WithoutStyle<WithoutAnimations<WithoutRevision<ImageElement>>> & {
      readonly style?: ImageStylePatch;
    })
  | (WithoutStyle<WithoutAnimations<WithoutRevision<ShapeElement>>> & {
      readonly style?: ShapeStylePatch;
    });

export type Slide = {
  readonly id: string;
  readonly revision: number;
  readonly background: SlideBackground;
  readonly transition: SlideTransition;
  readonly elements: readonly PresentationElement[];
};
/**
 * The serializable presentation document without undo or redo stacks. Its
 * canvas is always the Core-owned fixed logical canvas.
 */
export type PresentationDocumentState = {
  readonly id: string;
  readonly publicId: string;
  readonly title: string;
  readonly revision: number;
  readonly canvas: PresentationCanvas;
  readonly slides: readonly Slide[];
  readonly operationSequence: number;
} & PresentationLifecycle;
export type EntityRevisionTransition = {
  readonly entityType: "presentation" | "slide" | "element";
  readonly entityId: string;
  readonly fromRevision: number | null;
  readonly toRevision: number | null;
};
/**
 * The immutable record of one successful Core command. Revision transitions
 * identify the entities affected by that command.
 */
export type PresentationOperation = {
  readonly id: string;
  readonly sequence: number;
  readonly type:
    | "create-slide"
    | "edit-slide"
    | "rename-presentation"
    | "delete-slide"
    | "duplicate-slide"
    | "reorder-slide"
    | "create-element"
    | "create-elements"
    | "edit-element"
    | "edit-elements"
    | "move-elements"
    | "delete-elements"
    | "set-elements-opacity"
    | "rotate-elements"
    | "align-elements-to-canvas"
    | "align-elements-to-reference"
    | "distribute-elements"
    | "delete-element"
    | "duplicate-element"
    | "reorder-element"
    | "bring-forward"
    | "send-backward"
    | "bring-to-front"
    | "send-to-back"
    | "move-element"
    | "resize-element"
    | "replace-asset"
    | "configure-animation"
    | "configure-transition"
    | "undo"
    | "redo";
  readonly source: OperationSource;
  readonly changes: readonly EntityRevisionTransition[];
};
/**
 * A validated before-and-after document pair used to restore one logical
 * command without replaying it.
 */
export type OperationHistoryEntry = {
  readonly before: PresentationDocumentState;
  readonly after: PresentationDocumentState;
  readonly operation: PresentationOperation;
};
export type ScopedHistory = {
  readonly undoStack: readonly OperationHistoryEntry[];
  readonly redoStack: readonly OperationHistoryEntry[];
};
/**
 * The complete immutable Core state, including logical history required for
 * undo and redo.
 */
export type PresentationState = PresentationDocumentState & {
  /** Legacy complete-document history retained for snapshot compatibility. */
  readonly undoStack: readonly OperationHistoryEntry[];
  readonly redoStack: readonly OperationHistoryEntry[];
  /** Slide-local histories only contain content and property operations. */
  readonly slideHistories: Readonly<Record<string, ScopedHistory>>;
  /** Presentation history only contains metadata and slide-structure operations. */
  readonly presentationHistory: ScopedHistory;
};
export type CommandSuccess = {
  readonly success: true;
  readonly state: PresentationState;
  readonly operation: PresentationOperation;
};
export type CommandFailure = {
  readonly success: false;
  readonly state: PresentationState;
  readonly error: PresentationCoreError;
};
/**
 * A successful command records an operation and resets redo history; a failed
 * command returns an unchanged immutable state with a stable error code.
 */
export type CommandResult = CommandSuccess | CommandFailure;
export type CreatePresentationInput = {
  readonly id: string;
  readonly publicId: string;
  readonly title: string;
  readonly createdAt: string;
};
export type CreatePresentationResult =
  | { readonly success: true; readonly state: PresentationState }
  | { readonly success: false; readonly error: PresentationCoreError };
/**
 * A JSON-safe optimistic-concurrency target for a repository-owned physical
 * deletion. Creating it does not remove Core state or persisted data.
 */
export type PresentationDeletionIntent = {
  readonly presentationId: string;
  readonly revision: number;
};
export type CreatePresentationDeletionIntentResult =
  | { readonly success: true; readonly intent: PresentationDeletionIntent }
  | { readonly success: false; readonly error: PresentationCoreError };
type CommandMetadata = { source?: OperationSource; updatedAt: string };
export type HistoryCommandInput = { readonly source?: OperationSource };
export type CreateSlideInput = CommandMetadata & { id: string };
export type RenamePresentationInput = CommandMetadata & { title: string };
export type SlidePatch = { background?: SlideBackground };
export type EditSlideInput = CommandMetadata & {
  slideId: string;
  patch: SlidePatch;
};
export type DeleteSlideInput = CommandMetadata & { slideId: string };
export type DuplicateSlideInput = CommandMetadata & {
  slideId: string;
  id: string;
  elementIds: Readonly<Record<string, string>>;
};
export type ReorderSlideInput = CommandMetadata & {
  slideId: string;
  /** `null` places the slide first; otherwise this stable ID is its predecessor. */
  afterSlideId: string | null;
};
export type CreateElementInput = CommandMetadata & {
  slideId: string;
  element: NewPresentationElement;
};
/** Creates a validated group of elements as one logical undoable operation. */
export type CreateElementsInput = CommandMetadata & {
  readonly slideId: string;
  readonly elements: readonly NewPresentationElement[];
};
export type ElementPatch = {
  position?: ElementPosition;
  size?: ElementSize;
  rotation?: number;
  opacity?: number;
  content?: string;
  assetId?: string;
  shapeType?: ShapeElement["shapeType"];
  style?: TextStylePatch | ImageStylePatch | ShapeStylePatch;
};
export type EditElementInput = CommandMetadata & {
  slideId: string;
  elementId: string;
  patch: ElementPatch;
};
/** Applies one compatible patch to a group as a single undoable operation. */
export type EditElementsInput = CommandMetadata & {
  readonly slideId: string;
  readonly elementIds: readonly string[];
  readonly patch: ElementPatch;
};
export type DeleteElementInput = CommandMetadata & {
  slideId: string;
  elementId: string;
};
export type ElementsCommandInput = CommandMetadata & {
  readonly slideId: string;
  readonly elementIds: readonly string[];
};
export type MoveElementsInput = ElementsCommandInput & {
  readonly delta: ElementPosition;
};
export type DeleteElementsInput = ElementsCommandInput;
export type SetElementsOpacityInput = ElementsCommandInput & {
  readonly opacity: number;
};
export type RotateElementsInput = ElementsCommandInput & {
  readonly delta: number;
};
export type AlignElementsToCanvasInput = ElementsCommandInput & {
  readonly alignment: ElementAlignment;
};
export type AlignElementsToReferenceInput = ElementsCommandInput & {
  readonly referenceElementId: string;
  readonly alignment: ElementAlignment;
};
export type DistributeElementsInput = ElementsCommandInput & {
  readonly axis: "horizontal" | "vertical";
  readonly gap: number;
};
export type DuplicateElementInput = CommandMetadata & {
  slideId: string;
  elementId: string;
  id: string;
};
export type ReorderElementInput = CommandMetadata & {
  slideId: string;
  elementId: string;
  /** `null` places the element first; otherwise this stable ID is its predecessor. */
  afterElementId: string | null;
};
export type BringForwardInput = CommandMetadata & {
  slideId: string;
  elementId: string;
};
export type SendBackwardInput = CommandMetadata & {
  slideId: string;
  elementId: string;
};
export type BringToFrontInput = CommandMetadata & {
  slideId: string;
  elementId: string;
};
export type SendToBackInput = CommandMetadata & {
  slideId: string;
  elementId: string;
};
export type MoveElementInput = CommandMetadata & {
  slideId: string;
  elementId: string;
  position: ElementPosition;
};
export type ResizeElementInput = CommandMetadata & {
  slideId: string;
  elementId: string;
  size: ElementSize;
};
export type ReplaceAssetInput = CommandMetadata & {
  slideId: string;
  elementId: string;
  assetId: string;
};
export type ConfigureAnimationInput = CommandMetadata & {
  slideId: string;
  elementId: string;
  type: string;
  configuration?: AnimationConfigurationInput;
};
export type ConfigureTransitionInput = CommandMetadata & {
  slideId: string;
  type: string;
  configuration?: TransitionConfigurationInput;
};
export type ConfirmPresentationSavedInput = {
  readonly revision: number;
  readonly savedAt: string;
};
export type ConfirmPresentationPublishedInput = {
  readonly revision: number;
  readonly publishedAt: string;
};
export type SerializePresentationStateResult =
  | { readonly success: true; readonly serializedState: string }
  | { readonly success: false; readonly error: PresentationCoreError };
/**
 * Application or Infrastructure-owned evidence that exists outside the mutable
 * serialized snapshot. The Core treats its shape as opaque.
 */
export type PresentationSnapshotReceiptVerificationInput<Receipt> = {
  readonly serializedState: string;
  readonly integrityReceipt: Receipt;
};
/**
 * Verifies an immutable or signed receipt against the exact serialized snapshot.
 * The Core supplies neither cryptography nor receipt storage.
 */
export type VerifyPresentationSnapshotReceipt<Receipt = unknown> = (
  input: PresentationSnapshotReceiptVerificationInput<Receipt>,
) => boolean;
export type DeserializePresentationStateOptions<Receipt = unknown> = {
  readonly integrityReceipt: Receipt;
  readonly verifyIntegrityReceipt: VerifyPresentationSnapshotReceipt<Receipt>;
};
export type PresentationSnapshotIntegrityStatus =
  | "unverified"
  | "receipt-verified";
export type DeserializePresentationStateResult =
  | {
      readonly success: true;
      readonly state: PresentationState;
      readonly integrityStatus: PresentationSnapshotIntegrityStatus;
    }
  | { readonly success: false; readonly error: PresentationCoreError };
