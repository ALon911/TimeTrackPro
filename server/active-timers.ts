import { ActiveTimer } from "@shared/schema";

// Map to store active timers by user ID
const activeTimers: Map<number, ActiveTimer> = new Map();

// Update or add an active timer for a user
export function setActiveTimer(userId: number, timer: ActiveTimer): void {
  activeTimers.set(userId, timer);
  console.log(`🕐 Timer set for user ${userId}:`, timer);
}

// Remove a user's active timer
export function removeActiveTimer(userId: number): void {
  activeTimers.delete(userId);
  console.log(`🕐 Timer removed for user ${userId}`);
}

// Get a specific user's active timer
export function getActiveTimer(userId: number): ActiveTimer | undefined {
  return activeTimers.get(userId);
}

// Get all active timers
export function getAllActiveTimers(): ActiveTimer[] {
  return Array.from(activeTimers.values());
}

// Get all active timers for a team
export function getTeamActiveTimers(teamMembers: number[]): ActiveTimer[] {
  return Array.from(activeTimers.values()).filter(timer => 
    teamMembers.includes(timer.userId)
  );
}

// Update timer state (for synchronization)
export function updateTimerState(userId: number, updates: Partial<ActiveTimer>): void {
  const currentTimer = activeTimers.get(userId);
  if (currentTimer) {
    const updatedTimer = { ...currentTimer, ...updates };
    activeTimers.set(userId, updatedTimer);
    console.log(`🕐 Timer updated for user ${userId}:`, updatedTimer);
  }
}

// Check if timer is still valid (not expired)
export function isTimerValid(timer: ActiveTimer): boolean {
  if (!timer.startTime) return false;
  
  const now = Date.now();
  const startTime = new Date(timer.startTime).getTime();
  
  if (timer.duration) {
    // Countdown timer - check if time has expired
    const elapsed = (now - startTime) / 1000;
    return elapsed < timer.duration;
  } else {
    // Regular timer - always valid until manually stopped
    return true;
  }
}

// Clean up expired timers
export function cleanupExpiredTimers(): void {
  const now = Date.now();
  const expiredUsers: number[] = [];
  
  for (const [userId, timer] of activeTimers.entries()) {
    if (!isTimerValid(timer)) {
      expiredUsers.push(userId);
    }
  }
  
  expiredUsers.forEach(userId => {
    activeTimers.delete(userId);
    console.log(`🕐 Cleaned up expired timer for user ${userId}`);
  });
}

// Get timer with calculated elapsed time
export function getTimerWithElapsedTime(userId: number): (ActiveTimer & { elapsedSeconds: number; remainingSeconds?: number }) | undefined {
  const timer = activeTimers.get(userId);
  if (!timer || !timer.startTime) return undefined;
  
  const now = Date.now();
  const startTime = new Date(timer.startTime).getTime();
  const elapsedSeconds = Math.floor((now - startTime) / 1000);
  
  if (timer.duration) {
    // Countdown timer
    const remainingSeconds = Math.max(0, timer.duration - elapsedSeconds);
    return { ...timer, elapsedSeconds, remainingSeconds };
  } else {
    // Regular timer
    return { ...timer, elapsedSeconds };
  }
}