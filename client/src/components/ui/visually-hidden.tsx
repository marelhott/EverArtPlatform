import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden"
import { cn } from "@/lib/utils"

const VisuallyHidden = ({ className, ...props }: React.ComponentProps<typeof VisuallyHiddenPrimitive.Root>) => (
  <VisuallyHiddenPrimitive.Root className={cn(className)} {...props} />
)

export { VisuallyHidden }