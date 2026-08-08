import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] transition-all duration-200 resize-none",
        "focus:outline-none focus:border-[var(--input-focus-border)] focus:ring-4 focus:ring-[var(--input-focus-ring)]",
        "hover:border-[var(--border-medium)]",
        "disabled:pointer-events-none disabled:opacity-50 disabled:bg-[var(--bg-tertiary)]",
        "aria-invalid:border-[var(--destructive)] aria-invalid:ring-[rgba(220,60,60,0.3)]",
        "selection:bg-[var(--accent-primary)/0.3]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
