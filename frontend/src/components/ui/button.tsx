import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-200 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] active:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 
          "bg-gradient-primary text-white border-transparent hover:opacity-90 hover:shadow-[0_8px_24px_-4px_rgba(140,90,230,0.35)] hover:scale-[1.02] focus-visible:ring-[var(--accent-primary)]",
        outline:
          "bg-transparent border-[var(--border-medium)] text-[var(--fg-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:shadow-[0_0_0_1px_var(--accent-primary)] dark:border-[var(--border-medium)]",
        secondary:
          "bg-[var(--bg-tertiary)] text-[var(--fg-primary)] border-[var(--border-light)] hover:bg-[var(--accent-primary)/0.1] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:shadow-[0_0_0_1px_var(--accent-primary)/0.3]",
        ghost:
          "bg-transparent border-transparent text-[var(--fg-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--fg-primary)] hover:shadow-none",
        destructive:
          "bg-[var(--destructive-bg)] text-[var(--destructive)] border-transparent hover:bg-[var(--destructive)] hover:text-white hover:shadow-[0_8px_24px_-4px_rgba(220,60,60,0.35)] hover:scale-[1.02]",
        link: "text-[var(--accent-primary)] underline-offset-4 hover:underline bg-transparent border-transparent shadow-none hover:scale-100",
        glass:
          "glass text-[var(--fg-primary)] border-[var(--glass-border)] hover:bg-[var(--accent-primary)/0.08] hover:border-[var(--accent-primary)/0.3] hover:shadow-[0_12px_32px_-8px_rgba(140,90,230,0.2)]",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1.5 rounded-lg px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-xl px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-11 gap-2.5 rounded-2xl px-5 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: "size-10 rounded-xl",
        "icon-xs": "size-8 rounded-lg",
        "icon-sm": "size-9 rounded-xl",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export function Button(
  props: React.ComponentProps<typeof ButtonPrimitive> & VariantProps<typeof buttonVariants>
) {
  const { className, variant = "default", size = "default", ...rest } = props
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...rest}
    />
  )
}

export { buttonVariants }
