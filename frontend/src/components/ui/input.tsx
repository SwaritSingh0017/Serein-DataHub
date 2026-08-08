import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border bg-[var(--input-bg)] px-4 py-0 text-base text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] transition-all duration-200",
        "border-[var(--input-border)]",
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

export { Input }
