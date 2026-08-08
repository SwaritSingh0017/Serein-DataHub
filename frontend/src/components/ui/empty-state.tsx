"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import * as React from "react"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "ghost"
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-4",
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl glass flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-[var(--fg-primary)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[var(--fg-secondary)] max-w-md mx-auto mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || "default"}
          onClick={action.onClick}
          className="w-full sm:w-auto"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Predefined empty states
export function EmptyInvestigations(onCreate?: () => void) {
  return (
    <EmptyState
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      }
      title="No Investigations Yet"
      description="Start your first investigation to see it appear here. Serein will investigate your data problems and generate fixes automatically."
      action={onCreate ? { label: "Create Investigation", onClick: onCreate } : undefined}
    />
  )
}

export function EmptyReports(onCreate?: () => void) {
  return (
    <EmptyState
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      }
      title="No Reports Available"
      description="Reports are generated after an investigation completes. Start an investigation to generate a comprehensive report with findings, evidence, and recommendations."
      action={onCreate ? { label: "Create Investigation", onClick: onCreate } : undefined}
    />
  )
}

export function EmptySearch(onClear?: () => void) {
  return (
    <EmptyState
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      }
      title="No Results Found"
      description="Try adjusting your search terms or filters to find what you're looking for."
      action={onClear ? { label: "Clear Filters", onClick: onClear, variant: "outline" } : undefined}
    />
  )
}