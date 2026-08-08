import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
  animation?: "pulse" | "wave" | "none"
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
  animation = "pulse",
  ...props
}: SkeletonProps) {
  const baseStyles = cn(
    "bg-[var(--bg-tertiary)] rounded overflow-hidden",
    {
      "rounded-full": variant === "circular",
      "rounded-lg": variant === "rectangular",
      "animate-pulse": animation === "pulse",
      "animate-[shimmer_1.5s_infinite]": animation === "wave",
    },
    className
  )

  if (variant === "circular") {
    return (
      <div
        className={baseStyles}
        style={{
          width: width || "40px",
          height: height || "40px",
          borderRadius: "50%",
        }}
        {...props}
      />
    )
  }

  if (variant === "rectangular") {
    return (
      <div
        className={baseStyles}
        style={{
          width: width || "100%",
          height: height || "100%",
        }}
        {...props}
      />
    )
  }

  return (
    <div
      className={baseStyles}
      style={{
        width: width || "100%",
        height: height || "1rem",
        borderRadius: "0.375rem",
      }}
      {...props}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="space-y-2">
          <Skeleton width="40%" height={24} />
          <Skeleton width="25%" height={16} />
        </div>
      </div>
      <Skeleton variant="rectangular" height={120} />
      <div className="flex gap-2">
        <Skeleton width="30%" height={32} />
        <Skeleton width="30%" height={32} />
        <Skeleton width="30%" height={32} />
      </div>
    </div>
  )
}

export function SkeletonTable(rows = 5, cols = 4) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="grid gap-0 border-b border-[var(--border-light)] p-4 bg-[var(--bg-tertiary)]">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} width="80%" height={16} />
          ))}
        </div>
      </div>
      <div className="divide-y divide-[var(--border-light)]">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid p-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton key={colIndex} width="90%" height={16} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonInvestigationCard() {
  return (
    <div className="glass-card p-4 hover:-translate-y-1 transition-all duration-300 animate-slide-up">
      <div className="flex items-center gap-3 mb-2">
        <Skeleton variant="circular" width={8} height={8} className="bg-[var(--accent-primary)]" />
        <div className="flex-1">
          <Skeleton width="60%" height={16} />
          <Skeleton width="30%" height={12} />
        </div>
        <Skeleton width={80} height={24} />
      </div>
      <Skeleton width="100%" height={12} />
      <Skeleton width="60%" height={12} />
      <div className="flex items-center gap-2 mt-3">
        <Skeleton width={80} height={20} />
        <Skeleton width={80} height={20} />
      </div>
    </div>
  )
}

export function SkeletonReportDetail() {
  return (
    <div className="glass-card p-6 space-y-6 animate-fade-in">
      <div className="flex flex-wrap gap-2">
        <Skeleton width={120} height={24} />
        <Skeleton width={100} height={24} />
        <Skeleton width={140} height={24} />
      </div>
      <Skeleton width="100%" height={20} />
      <Skeleton width="80%" height={20} />
      <Skeleton width="60%" height={20} />
      <Skeleton variant="rectangular" height={120} />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={16} />
        ))}
      </div>
    </div>
  )
}