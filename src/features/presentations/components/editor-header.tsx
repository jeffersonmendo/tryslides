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
  readonly onCreateShape: (shape_type: "rectangle" | "circle" | "line") => void;
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
          size="icon"
          type="button"
          variant="ghost"
          onClick={onCreateText}
        >
          <IconTextSize data-icon="inline-start" />
        </Button>
        <Button
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => onCreateShape("rectangle")}
        >
          <IconIcons data-icon="inline-start" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="icon" type="button" variant="ghost">
                <IconIcons data-icon="inline-start" />
              </Button>
            }
          />

          <DropdownMenuContent>
            <DropdownMenuGroup>
              {/* Shapes */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Shapes</DropdownMenuSubTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>
                      <IconRectangle />
                      Rectangle
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconCircle />
                      Circle
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconTriangle />
                      Triangle
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconDiamonds />
                      Diamond
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconStar />
                      Star
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconHeart />
                      Heart
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              {/* Lines */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Lines</DropdownMenuSubTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>
                      <IconStrokeStraight />
                      Line
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconArrowRight />
                      Arrow
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconArrowsHorizontal />
                      Double Arrow
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              {/* Callouts */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Callouts</DropdownMenuSubTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>
                      <IconBubble />
                      Speech Bubble
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconMessageCircle />
                      Round Bubble
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              {/* Math */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Math</DropdownMenuSubTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>
                      <IconPlus />
                      Plus
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconMinus />
                      Minus
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconX />
                      Multiply
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconDivide />
                      Divide
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconEqual />
                      Equal
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <IconEqualNot />
                      Not Equal
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
