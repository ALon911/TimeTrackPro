/**
 * Format seconds to HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration for display with appropriate units (hours, minutes, seconds)
 */
export function formatDurationWithUnits(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  let result = '';
  if (hours > 0) {
    result += `${hours} שעות `;
  }
  if (minutes > 0 || hours > 0) {
    result += `${minutes} דקות `;
  }
  if (secs > 0 || (hours === 0 && minutes === 0)) {
    result += `${secs} שניות`;
  }
  
  return result.trim();
}

/**
 * Parse time in format HH:MM to seconds
 */
export function parseTimeToSeconds(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60 * 60) + (minutes * 60);
}

/**
 * Calculate duration between two dates in seconds
 */
export function calculateDuration(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
}
