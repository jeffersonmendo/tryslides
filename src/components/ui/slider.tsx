import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"
import { useId } from "react"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbAriaLabelledby,
  ...props
}: SliderPrimitive.Root.Props & { readonly thumbAriaLabelledby?: string }) {
  const slider_id = useId()
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-input/90 select-none data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {getThumbDescriptors(slider_id, _values.length).map((thumb) => (
          <SliderPrimitive.Thumb
            aria-labelledby={thumbAriaLabelledby}
            data-slot="slider-thumb"
            index={thumb.index}
            key={thumb.id}
            className="block h-4 w-6 shrink-0 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-[color,box-shadow,background-color] select-none not-dark:bg-clip-padding hover:ring-4 hover:ring-ring/30 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-vertical:h-6 data-vertical:w-4"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

function getThumbDescriptors(slider_id: string, length: number) {
  return Array.from({ length }, (_, index) => ({
    id: `${slider_id}-thumb-${index}`,
    index,
  }))
}

export { Slider }
