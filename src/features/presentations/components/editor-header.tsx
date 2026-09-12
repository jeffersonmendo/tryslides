import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowRight,
  IconArrowsHorizontal,
  IconBubble,
  IconCircle,
  IconDiamonds,
  IconDivide,
  IconEqual,
  IconEqualNot,
  IconHeart,
  IconIcons,
  IconMessageCircle,
  IconMinus,
  IconPhotoPlus,
  IconPlus,
  IconRectangle,
  IconStar,
  IconStrokeStraight,
  IconTextSize,
  IconTriangle,
  IconX,
} from "@tabler/icons-react";
import * as Lucide from "lucide-react";
import { useTranslations } from "next-intl";
import { type ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { ShapeType } from "@/features/presentations/core/presentation-core";

type EditorHeaderProps = {
  readonly title: string;
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly addImageLabel: string;
  readonly addShapeLabel: string;
  readonly addTextLabel: string;
  readonly redoLabel: string;
  readonly undoLabel: string;
  readonly onRedo: () => void;
  readonly onCreateShape: (shape_type: ShapeType) => void;
  readonly onCreateText: () => void;
  readonly onUploadImages: (files: readonly File[]) => void;
  readonly onUndo: () => void;
};

export function EditorHeader({
  title,
  canRedo,
  canUndo,
  addImageLabel,
  addShapeLabel,
  addTextLabel,
  redoLabel,
  undoLabel,
  onRedo,
  onCreateShape,
  onCreateText,
  onUploadImages,
  onUndo,
}: EditorHeaderProps) {
  const image_input_ref = useRef<HTMLInputElement>(null);
  const t = useTranslations("Editor");
  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const image_files = Array.from(event.target.files ?? []);
    if (image_files.length > 0) onUploadImages(image_files);
    event.target.value = "";
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 rounded-2xl dark:bg-sidebar bg-white px-4">
      <h1 className="truncate text-sm">{title}</h1>
      <div className="flex items-center gap-1">
        <Button size="icon" type="button" variant="ghost">
          <Lucide.PenTool data-icon="inline-start" />
        </Button>
        <Button
          aria-label={addTextLabel}
          size="icon"
          type="button"
          variant="ghost"
          onClick={onCreateText}
        >
          <IconTextSize data-icon="inline-start" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={addShapeLabel}
                size="icon"
                type="button"
                variant="ghost"
              >
                <IconIcons data-icon="inline-start" />
              </Button>
            }
          />

          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {t("shapeCategoryShapes")}
                </DropdownMenuSubTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => onCreateShape("rectangle")}
                    >
                      <IconRectangle />
                      {t("shapeRectangle")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCreateShape("circle")}>
                      <IconCircle />
                      {t("shapeCircle")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCreateShape("triangle")}>
                      <IconTriangle />
                      {t("shapeTriangle")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCreateShape("diamond")}>
                      <IconDiamonds />
                      {t("shapeDiamond")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCreateShape("star")}>
                      <IconStar />
                      {t("shapeStar")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCreateShape("heart")}>
                      <IconHeart />
                      {t("shapeHeart")}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {t("shapeCategoryLines")}
                </DropdownMenuSubTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onCreateShape("line")}>
                      <IconStrokeStraight />
                      {t("shapeLine")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCreateShape("arrow")}>
                      <IconArrowRight />
                      {t("shapeArrow")}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => onCreateShape("double-arrow")}
                    >
                      <IconArrowsHorizontal />
                      {t("shapeDoubleArrow")}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {t("shapeCategoryCallouts")}
                </DropdownMenuSubTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => onCreateShape("speech-bubble")}
                    >
                      <IconBubble />
                      {t("shapeSpeechBubble")}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => onCreateShape("round-bubble")}
                    >
                      <IconMessageCircle />
                      {t("shapeRoundBubble")}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {t("shapeCategoryMath")}
                </DropdownMenuSubTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onCreateShape("plus")}>
                      <IconPlus />
                      {t("shapePlus")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCreateShape("minus")}>
                      <IconMinus />
                      {t("shapeMinus")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCreateShape("multiply")}>
                      <IconX />
                      {t("shapeMultiply")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCreateShape("divide")}>
                      <IconDivide />
                      {t("shapeDivide")}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCreateShape("equal")}>
                      <IconEqual />
                      {t("shapeEqual")}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => onCreateShape("not-equal")}
                    >
                      <IconEqualNot />
                      {t("shapeNotEqual")}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={image_input_ref}
          accept="image/*"
          className="sr-only"
          multiple
          type="file"
          onChange={handleImageChange}
        />
        <Button
          aria-label={addImageLabel}
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => image_input_ref.current?.click()}
        >
          <IconPhotoPlus data-icon="inline-start" />
        </Button>
        <div>
          <Separator className={"h-6"} orientation="vertical" />
        </div>
        <Button
          aria-label={undoLabel}
          disabled={!canUndo}
          size="icon"
          variant="ghost"
          onClick={onUndo}
        >
          <IconArrowBackUp data-icon="inline-start" />
        </Button>
        <Button
          aria-label={redoLabel}
          disabled={!canRedo}
          size="icon"
          variant="ghost"
          onClick={onRedo}
        >
          <IconArrowForwardUp data-icon="inline-start" />
        </Button>
      </div>
    </header>
  );
}
