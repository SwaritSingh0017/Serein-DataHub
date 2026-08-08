"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Search, Keyboard, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface CommandItem {
  id: string
  label: string
  description?: string
  shortcut?: string
  action: () => void
  category?: string
}

interface CommandPaletteProps {
  items: CommandItem[]
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ items, isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredItems = items.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase()) ||
      item.shortcut?.toLowerCase().includes(query.toLowerCase())
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action()
          onClose()
        }
        break
      case "Escape":
        e.preventDefault()
        onClose()
        break
    }
  }

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0)
      setQuery("")
      const input = document.getElementById("command-palette-input")
      input?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent("open-command-palette"))
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--fg-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              id="command-palette-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="w-full pl-12 pr-10 py-3 text-lg bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-xl text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
              autoFocus
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-[var(--fg-muted)] bg-[var(--bg-tertiary)] rounded">
              ⌘ K
            </kbd>
          </div>
          <p className="text-sm text-[var(--fg-muted)]">
            {filteredItems.length} command{filteredItems.length !== 1 ? "s" : ""} available
          </p>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-[var(--fg-muted)]">
              No commands found
            </div>
          ) : (
            <ul className="space-y-1 p-2" role="listbox">
              {filteredItems.map((item, index) => (
                <li key={item.id} role="option" aria-selected={index === selectedIndex}>
                  <button
                    onClick={() => {
                      item.action()
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full flex items-center justify-between gap-4 p-3 rounded-xl transition-all text-left",
                      index === selectedIndex
                        ? "bg-[var(--accent-primary)/0.1] text-[var(--accent-primary)]"
                        : "hover:bg-[var(--bg-tertiary)] text-[var(--fg-primary)]"
                    )}
                    role="option"
                    aria-selected={index === selectedIndex}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.label}</p>
                      {item.description && (
                        <p className="text-sm text-[var(--fg-muted)] truncate">{item.description}</p>
                      )}
                    </div>
                    {item.shortcut && (
                      <kbd className="px-2 py-0.5 text-xs text-[var(--fg-muted)] bg-[var(--bg-tertiary)] rounded">
                        {item.shortcut}
                      </kbd>
                    )}
                    {item.category && (
                      <span className="px-2 py-0.5 text-xs text-[var(--fg-muted)] bg-[var(--bg-tertiary)] rounded">
                        {item.category}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Keyboard shortcuts help dialog
interface ShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["⌘", "Enter"], description: "Submit form / start investigation" },
  { keys: ["⌘", "/"], description: "Focus search" },
  { keys: ["Esc"], description: "Close dialog / cancel" },
  { keys: ["⌘", "D"], description: "Toggle dark mode" },
  { keys: ["⌘", "1"], description: "Go to Dashboard" },
  { keys: ["⌘", "2"], description: "Go to Reports" },
  { keys: ["⌘", "3"], description: "New Investigation" },
  { keys: ["⌘", ","], description: "Open Settings" },
  { keys: ["⌘", "."], description: "Open command palette (alt)" },
]

export function ShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
              <path d="M9 14h11M9 18h7M9 10h10"/>
            </svg>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <kbd className="px-1.5 py-0.5 text-xs bg-[var(--bg-tertiary)] rounded">⌘</kbd> + <kbd className="px-1.5 py-0.5 text-xs bg-[var(--bg-tertiary)] rounded">K</kbd> to open command palette from anywhere
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {[
            { keys: ["⌘", "K"], description: "Open command palette" },
            { keys: ["⌘", "Enter"], description: "Submit form / start investigation" },
            { keys: ["⌘", "/"], description: "Focus search" },
            { keys: ["Esc"], description: "Close dialog / cancel" },
            { keys: ["⌘", "D"], description: "Toggle dark mode" },
            { keys: ["⌘", "1"], description: "Go to Dashboard" },
            { keys: ["⌘", "2"], description: "Go to Reports" },
            { keys: ["⌘", "3"], description: "New Investigation" },
            { keys: ["⌘", ","], description: "Open Settings" },
            { keys: ["⌘", "."], description: "Open command palette (alt)" },
          ].map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
              <span className="text-[var(--fg-secondary)]">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <kbd key={i} className="px-2 py-1 text-xs font-mono bg-[var(--bg-tertiary)] rounded border border-[var(--border-light)] text-[var(--fg-secondary)]">
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="pt-4">
          <Button onClick={onClose} className="w-full" variant="outline">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for global keyboard shortcuts
export function useKeyboardShortcuts() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K - Open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent("open-command-palette"))
      }

      // ⌘/ - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="search" i], input[placeholder*="Search" i]') as HTMLInputElement
        searchInput?.focus()
      }

      // ⌘D - Toggle dark mode
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault()
        const themeToggle = document.querySelector('[aria-label*="dark" i], [aria-label*="light" i], button[aria-label*="theme" i]') as HTMLButtonElement
        themeToggle?.click()
      }

      // Escape - Close dialogs
      if (e.key === "Escape") {
        // This will be handled by dialog components
      }

      // ⌘1-3 - Navigation shortcuts
      if ((e.metaKey || e.ctrlKey) && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault()
        const routes = ["/dashboard", "/reports", "/investigations/new"]
        const index = parseInt(e.key) - 1
        if (routes[index]) {
          window.location.href = routes[index]
        }
      }

      // ⌘, - Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault()
        window.location.href = "/settings"
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isShortcutsHelpOpen,
    setIsShortcutsHelpOpen,
  }
}