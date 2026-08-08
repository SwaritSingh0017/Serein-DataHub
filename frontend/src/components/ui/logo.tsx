"use client"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "text"
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

/**
 * Serein Logo Component
 * 
 * Represents the Serein DataHub Agent brand identity.
 * - Full: Icon + Text (default)
 * - Icon: Only the icon mark
 * - Text: Only the wordmark
 * 
 * The logo represents:
 * - Gradient: Purple to Cyan (AI + Data)
 * - Arrow: Forward progress / investigation flow
 * - Dots: Data points / metadata nodes
 */
export function Logo({ 
  variant = "full", 
  size = "md", 
  className 
}: LogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl", 
    xl: "text-2xl",
  }

  const iconMark = (
    <svg 
      viewBox="0 0 32 32" 
      fill="none" 
      className={cn(sizeClasses[size], "flex-shrink-0")}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="6" fill="url(#logoGradient)" />
      {/* Arrow representing investigation flow */}
      <path 
        d="M8 20 L12 16 L20 24" 
        stroke="white" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
      {/* Data points / metadata nodes */}
      <circle cx="10" cy="10" r="2" fill="white" opacity="0.6" />
      <circle cx="22" cy="22" r="1.5" fill="white" opacity="0.4" />
    </svg>
  )

  const wordMark = (
    <span className={cn(
      "font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent",
      textSizeClasses[size]
    )}>
      Serein
    </span>
  )

  // Icon only variant
  if (variant === "icon") {
    return <span className={cn("inline-flex", className)}>{iconMark}</span>
  }

  // Text only variant
  if (variant === "text") {
    return <span className={cn("font-bold", className)}>{wordMark}</span>
  }

  // Full variant (icon + text)
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {iconMark}
      <span className="font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent whitespace-nowrap">
        Serein
      </span>
    </span>
  )
}

/**
 * Logo with tagline
 */
export function LogoWithTagline({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className || ""}`}>
      <Logo variant="full" size="xl" />
      <p className="text-sm text-[var(--fg-secondary)] max-w-xs text-center">
        Autonomous AI Data Engineer
      </p>
    </div>
  )
}

/**
 * Small logo for navigation/header
 */
export function LogoSmall({ className }: { className?: string }) {
  return (
    <Logo variant="icon" size="md" className={className} />
  )
}

export default Logo