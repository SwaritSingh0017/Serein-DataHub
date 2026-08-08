"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDevelopment = import.meta.env.DEV

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <Card variant="glass" className="max-w-md w-full">
            <CardContent className="pt-8 pb-8 px-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--destructive-bg)] flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-[var(--destructive)]" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--fg-primary)] mb-2">
                Something went wrong
              </h2>
              <p className="text-[var(--fg-secondary)] mb-6">
                We encountered an unexpected error. Please try refreshing the page or navigating back.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
                  Refresh Page
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
                  Go to Dashboard
                </Button>
              </div>
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-sm text-[var(--fg-muted)] cursor-pointer">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-3 bg-[var(--bg-tertiary)] rounded-lg text-xs overflow-auto text-[var(--fg-muted)]">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}

export function GlobalErrorHandler({
  message = "An unexpected error occurred",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="min-h-[300px] flex items-center justify-center p-8">
      <Card variant="glass" className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 px-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--destructive-bg)] flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-[var(--destructive)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--fg-primary)] mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-[var(--fg-secondary)] mb-6">{message}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <Button onClick={onRetry} className="w-full sm:w-auto">
                Try Again
              </Button>
            )}
            <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}