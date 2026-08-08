import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "FAILED":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "PLANNING":
    case "COLLECTING_CONTEXT":
    case "INVESTIGATING":
    case "ANALYZING":
    case "GENERATING_FIX":
    case "GENERATING_REPORT":
    case "CREATING_PR":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

export function getSeverityColor(severity?: string): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "HIGH":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "MEDIUM":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "LOW":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}
