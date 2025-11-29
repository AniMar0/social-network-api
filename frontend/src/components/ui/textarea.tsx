import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, ...props }, ref) => (
  <div className="relative w-full">
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        error && "border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      aria-invalid={!!error}
      {...props}
    />
    {error && <p className="mt-1.5 text-sm font-medium text-destructive fade-in">{error}</p>}
  </div>
))
Textarea.displayName = "Textarea"

export { Textarea }
