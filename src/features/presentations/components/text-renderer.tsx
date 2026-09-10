import type { EditorTextElement } from "./editor-model";

type TextRendererProps = {
  readonly canvas: { readonly width: number; readonly height: number };
  readonly isSelected: boolean;
  readonly text: EditorTextElement;
  readonly onSelect: (element_id: string) => void;
};

export function TextRenderer({
  canvas,
  isSelected,
  text,
  onSelect,
}: TextRendererProps) {
  return (
    <button
      aria-pressed={isSelected}
      className="absolute rounded-sm p-1 text-left outline-none ring-ring focus-visible:ring-2 data-[selected=true]:ring-2"
      data-selected={isSelected}
      style={{
        color: text.style.color,
        fontFamily: "Arial, sans-serif",
        fontSize: `${(text.style.fontSize / canvas.width) * 100}cqw`,
        fontWeight: text.style.fontWeight,
        height: `${(text.size.height / canvas.height) * 100}%`,
        left: `${(text.position.x / canvas.width) * 100}%`,
        opacity: text.opacity,
        textAlign: text.style.alignment as "left" | "center" | "right",
        top: `${(text.position.y / canvas.height) * 100}%`,
        width: `${(text.size.width / canvas.width) * 100}%`,
      }}
      type="button"
      onClick={() => onSelect(text.id)}
    >
      <span className="whitespace-pre-wrap">{text.content}</span>
    </button>
  );
}
