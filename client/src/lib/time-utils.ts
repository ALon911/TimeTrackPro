import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { he } from 'date-fns/locale';

export function formatDateTime(date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: he });
}

export function formatDate(date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    return 'היום';
  } else if (isYesterday(dateObj)) {
    return 'אתמול';
  } else {
    return format(dateObj, 'd בMMM yyyy', { locale: he });
  }
}

export function formatTime(date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'HH:mm');
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export function formatDurationHumanReadable(seconds: number) {
  if (seconds === 0) return '0 שניות';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'יום' : 'ימים'}`);
  }
  
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'שעה' : 'שעות'}`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'דקה' : 'דקות'}`);
  }
  
  if (secs > 0 && (parts.length === 0 || seconds < 60)) {
    parts.push(`${secs} ${secs === 1 ? 'שניה' : 'שניות'}`);
  }
  
  return parts.join(' ו-');
}

export function getCurrentHebrewDate() {
  const now = new Date();
  return format(now, "EEEE, d בMMMM yyyy", { locale: he });
}

export function timeAgo(date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { locale: he, addSuffix: true });
}

// Timer utils
export function formatTimerDisplay(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
