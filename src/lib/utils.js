import { clsx } from "clsx";

// Combine Tailwind classes safely
export function cn(...inputs) {
  return clsx(inputs);
}

// Format date to readable string
export function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Format time from ISO string
export function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format elapsed seconds → HH:MM:SS
export function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Get today's date as YYYY-MM-DD
export function today() {
  return new Date().toISOString().split("T")[0];
}

// Role badge color
export function roleBadgeColor(role) {
  return {
    admin: "bg-purple-100 text-purple-700",
    manager: "bg-blue-100 text-blue-700",
    employee: "bg-green-100 text-green-700",
  }[role] || "bg-gray-100 text-gray-700";
}

// Priority color
export function priorityColor(priority) {
  return {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  }[priority] || "bg-gray-100 text-gray-700";
}

// Compute hours between two ISO timestamps
export function computeHours(start, end) {
  const diff = new Date(end) - new Date(start);
  return Math.round((diff / 3600000) * 100) / 100;
}