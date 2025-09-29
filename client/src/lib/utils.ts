import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to calculate time between two dates in seconds
export function calculateDurationInSeconds(startTime: Date, endTime: Date): number {
  const diff = endTime.getTime() - startTime.getTime();
  return Math.floor(diff / 1000);
}

// Helper to format color hex codes with hash prefix
export function formatColor(color: string): string {
  return color.startsWith('#') ? color : `#${color}`;
}

// Helper to create a random color
export function getRandomColor(): string {
  const colors = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#06b6d4', // cyan
    '#3b82f6', // blue
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

// Format seconds to HH:MM:SS
export function formatSecondsToTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Format seconds to human-readable duration
export function formatSecondsToHumanReadable(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
  } else {
    return `0:${minutes.toString().padStart(2, '0')}:00`;
  }
}
