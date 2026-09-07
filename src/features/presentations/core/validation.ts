import type {
  AnimationCapability,
  AnimationConfiguration,
  AnimationConfigurationInput,
  ElementPatch,
  ElementPosition,
  ElementSize,
  NewPresentationElement,
  PresentationCanvas,
  PresentationElement,
  SlideBackground,
  SlidePatch,
  SlideTransition,
  TransitionCapability,
  TransitionConfigurationInput,
} from "./types";

const SHAPE_TYPES = new Set(["rectangle", "circle", "line"]);
const BASE_PATCH_KEYS = new Set([
  "position",
  "size",
  "rotation",
  "opacity",
  "style",
]);

export function isValidIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
export function isValidPresentationId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
export function isValidPublicId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9A-Za-z]{6}$/.test(value);
}
/** Accepts canonical, JSON-safe ISO-8601 UTC instants without using Date. */
export function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/.exec(value);
  if (match === null) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59)
    return false;
  const days_in_month = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day >= 1 && day <= days_in_month[month - 1];
}
function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
export function isValidTitle(value: unknown): value is string {
  return isValidIdentifier(value);
}
export function isValidPresentationRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
export function isValidOperationSource(source: unknown): boolean {
  return (
    source === "user" ||
    source === "system" ||
    source === "ai" ||
    source === "mcp"
  );
}
export function isValidElementIdMap(
  value: unknown,
): value is Readonly<Record<string, string>> {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([source_id, replacement_id]) =>
        isValidIdentifier(source_id) && isValidIdentifier(replacement_id),
    )
  );
}
export function isValidNewElement(element: NewPresentationElement): boolean {
  if (
    !isValidIdentifier(element.id) ||
    !isValidPosition(element.position) ||
    !isValidSize(element.size) ||
    !isFiniteNumber(element.rotation) ||
    !isValidOpacity(element.opacity)
  )
    return false;
  if (element.type === "text")
    return (
      typeof element.content === "string" &&
      (element.style === undefined || isValidTextStylePatch(element.style))
    );
  if (element.type === "image")
    return (
      isValidIdentifier(element.assetId) &&
      (element.style === undefined || isValidImageStylePatch(element.style))
    );
  return (
    SHAPE_TYPES.has(element.shapeType) &&
    (element.style === undefined || isValidShapeStylePatch(element.style))
  );
}
export function isValidSlidePatch(patch: SlidePatch): boolean {
  return (
    isRecord(patch) &&
    Object.keys(patch).length > 0 &&
    Object.keys(patch).every((key) => key === "background") &&
    patch.background !== undefined &&
    isValidSlideBackground(patch.background)
  );
}
export function isValidSlideBackground(
  value: unknown,
): value is SlideBackground {
  if (!isRecord(value)) return false;
  if (value.type === "solid")
    return (
      Object.keys(value).length === 2 &&
      isNonBlankString(value.color) &&
      Object.hasOwn(value, "color")
    );
  return (
    value.type === "gradient" &&
    Object.keys(value).length === 2 &&
    isNonBlankString(value.gradient) &&
    Object.hasOwn(value, "gradient")
  );
}
export function isElementWithinCanvas(
  position: ElementPosition,
  size: ElementSize,
  canvas: PresentationCanvas,
): boolean {
  // Elements may overflow each edge by at most half of their own dimension;
  // this keeps at least 50% visible in the fixed logical canvas.
  return (
    isValidPosition(position) &&
    isValidSize(size) &&
    position.x >= -size.width / 2 &&
    position.x + size.width <= canvas.width + size.width / 2 &&
    position.y >= -size.height / 2 &&
    position.y + size.height <= canvas.height + size.height / 2
  );
}
export function isValidPresentationCanvas(
  value: unknown,
): value is PresentationCanvas {
  // Deserialized state must preserve the Core-owned canvas instead of accepting
  // a renderer or persisted payload's alternative coordinate system.
  return (
    isRecord(value) &&
    value.width === 1920 &&
    value.height === 1080 &&
    Object.keys(value).length === 2
  );
}
export function isValidPatch(
  element: PresentationElement,
  patch: ElementPatch,
): boolean {
  if (!isRecord(patch)) return false;
  const allowed_keys = new Set(BASE_PATCH_KEYS);
  if (element.type === "text") allowed_keys.add("content");
  if (element.type === "image") allowed_keys.add("assetId");
  if (element.type === "shape") allowed_keys.add("shapeType");
  const keys = Object.keys(patch);
  return (
    keys.length > 0 &&
    keys.every((key) => allowed_keys.has(key)) &&
    Object.values(patch).every((value) => value !== undefined) &&
    (patch.position === undefined || isValidPosition(patch.position)) &&
    (patch.size === undefined || isValidSize(patch.size)) &&
    (patch.rotation === undefined || isFiniteNumber(patch.rotation)) &&
    (patch.opacity === undefined || isValidOpacity(patch.opacity)) &&
    (patch.content === undefined ||
      (element.type === "text" && typeof patch.content === "string")) &&
    (patch.assetId === undefined ||
      (element.type === "image" && isValidIdentifier(patch.assetId))) &&
    (patch.shapeType === undefined ||
      (element.type === "shape" && SHAPE_TYPES.has(patch.shapeType))) &&
    (patch.style === undefined || isValidStylePatch(element, patch.style))
  );
}
export function isValidPosition(value: unknown): value is ElementPosition {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    Object.keys(value).length === 2
  );
}
export function isValidSize(value: unknown): value is ElementSize {
  return (
    isRecord(value) &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    isFiniteNumber(value.height) &&
    value.height > 0 &&
    Object.keys(value).length === 2
  );
}
export function createAnimationConfiguration(
  capability: AnimationCapability,
  input: AnimationConfigurationInput | undefined,
): AnimationConfiguration | "INVALID_DURATION" | null {
  if (
    input !== undefined &&
    !isValidConfigurationInput(
      input,
      new Set(["duration", "delay", "easing", "repeat", "interval"]),
    )
  )
    return null;
  const configuration = { ...capability.defaults, ...input };
  const schema = capability.configurationSchema;
  if (
    !isFiniteNumber(configuration.duration) ||
    configuration.duration < schema.duration.minimum
  )
    return "INVALID_DURATION";
  if (
    !isFiniteNumber(configuration.delay) ||
    configuration.delay < schema.delay.minimum ||
    !isValidEasing(configuration.easing) ||
    configuration.easing.trim().length < schema.easing.minimumLength
  )
    return null;
  const supports_repeat = schema.repeat !== undefined;
  const supports_interval = schema.interval !== undefined;
  if (
    (supports_repeat &&
      (!isValidRepeat(configuration.repeat) ||
        (typeof configuration.repeat === "number" &&
          configuration.repeat < schema.repeat.minimum))) ||
    (!supports_repeat && "repeat" in configuration) ||
    (supports_interval &&
      (!isFiniteNumber(configuration.interval) ||
        configuration.interval < schema.interval.minimum)) ||
    (!supports_interval && "interval" in configuration)
  )
    return null;
  return { type: capability.id, ...configuration };
}
export function createTransition(
  capability: TransitionCapability,
  input: TransitionConfigurationInput | undefined,
): SlideTransition | "INVALID_DURATION" | null {
  if (
    input !== undefined &&
    !isValidConfigurationInput(input, new Set(["duration"]))
  )
    return null;
  const duration = input?.duration ?? capability.defaults.duration;
  if (capability.id === "none" && input?.duration === undefined)
    return { type: capability.id, duration };
  if (
    !isFiniteNumber(duration) ||
    duration < capability.configurationSchema.duration.minimum
  )
    return "INVALID_DURATION";
  return { type: capability.id, duration };
}
function isValidConfigurationInput(
  input: object,
  allowed_keys: Set<string>,
): boolean {
  return (
    isRecord(input) &&
    Object.keys(input).every((key) => allowed_keys.has(key)) &&
    Object.values(input).every((value) => value !== undefined)
  );
}
function isValidEasing(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isValidRepeat(value: unknown): value is number | "infinite" {
  return (
    value === "infinite" ||
    (isFiniteNumber(value) && value > 0 && Number.isInteger(value))
  );
}
function isValidOpacity(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}
function isValidStylePatch(
  element: PresentationElement,
  style: unknown,
): boolean {
  if (element.type === "text") return isValidTextStylePatch(style);
  if (element.type === "image") return isValidImageStylePatch(style);
  return isValidShapeStylePatch(style);
}
function isValidTextStylePatch(value: unknown): boolean {
  return (
    isValidPatchRecord(value, [
      "role",
      "font",
      "fontSize",
      "fontWeight",
      "color",
      "gradient",
      "alignment",
    ]) &&
    (value.role === undefined ||
      value.role === "H1" ||
      value.role === "H2" ||
      value.role === "H3" ||
      value.role === "Paragraph") &&
    (value.font === undefined || isNonBlankString(value.font)) &&
    (value.fontSize === undefined || isPositiveNumber(value.fontSize)) &&
    (value.fontWeight === undefined || isPositiveNumber(value.fontWeight)) &&
    (value.color === undefined || isNonBlankString(value.color)) &&
    (value.gradient === undefined || isNonBlankString(value.gradient)) &&
    (value.alignment === undefined || isNonBlankString(value.alignment))
  );
}
function isValidImageStylePatch(value: unknown): boolean {
  return (
    isValidPatchRecord(value, ["objectFit", "borderRadius"]) &&
    (value.objectFit === undefined || isNonBlankString(value.objectFit)) &&
    (value.borderRadius === undefined ||
      isNonNegativeNumber(value.borderRadius))
  );
}
function isValidShapeStylePatch(value: unknown): boolean {
  return (
    isValidPatchRecord(value, ["fill", "border", "borderWidth", "radius"]) &&
    (value.fill === undefined || isNonBlankString(value.fill)) &&
    (value.border === undefined || isNonBlankString(value.border)) &&
    (value.borderWidth === undefined ||
      isNonNegativeNumber(value.borderWidth)) &&
    (value.radius === undefined || isNonNegativeNumber(value.radius))
  );
}
function isValidPatchRecord(
  value: unknown,
  allowed_keys: readonly string[],
): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((key) => allowed_keys.includes(key)) &&
    Object.values(value).every((property) => property !== undefined)
  );
}
function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}
function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
