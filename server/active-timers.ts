import { getSyncTimeSync, getSyncDateSync } from './ntp-service';

// Interface for active timers in memory
interface ActiveTimerState {
  userId: number;
  topicId: number | null;
  description: string | null;
  startTime: string;
  duration: number | null; // in seconds, for countdown timers
  isCountDown: boolean;
  isRunning: boolean;
  isPaused: boolean;
  pausedDuration?: number; // total paused time in seconds
  remainingSeconds?: number; // remaining seconds when paused
}

// Map to store active timers by user ID
const activeTimers: Map<number, ActiveTimerState> = new Map();

// Update or add an active timer for a user
export function setActiveTimer(userId: number, timer: ActiveTimerState): void {
  activeTimers.set(userId, timer);
  console.log(`🕐 Timer set for user ${userId}:`, timer);
}

// Remove a user's active timer
export function removeActiveTimer(userId: number): void {
  activeTimers.delete(userId);
  console.log(`🕐 Timer removed for user ${userId}`);
}

// Get a specific user's active timer
export function getActiveTimer(userId: number): ActiveTimerState | undefined {
  return activeTimers.get(userId);
}

// Get all active timers
export function getAllActiveTimers(): ActiveTimerState[] {
  return Array.from(activeTimers.values());
}

// Get all active timers for a team
export function getTeamActiveTimers(teamMembers: number[]): ActiveTimerState[] {
  return Array.from(activeTimers.values()).filter(timer => 
    teamMembers.includes(timer.userId)
  );
}

// Update timer state (for synchronization)
export function updateTimerState(userId: number, updates: Partial<ActiveTimerState>): void {
  const currentTimer = activeTimers.get(userId);
  if (currentTimer) {
    let updatedTimer = { ...currentTimer, ...updates };
    
    // If resuming a paused timer, completely reset the timer with remaining time
    if (updates.isRunning === true && updates.isPaused === false && currentTimer.isPaused) {
      const now = getSyncTimeSync();
      
      // For countdown timers, use the remaining seconds from when it was paused
      if (currentTimer.isCountDown && currentTimer.duration) {
        // Use the remaining seconds that were saved when paused
        const remainingSeconds = currentTimer.remainingSeconds || 0;
        
        // Completely reset the timer with the remaining time
        const newStartTime = getSyncDateSync().toISOString();
        updatedTimer = { 
          ...updatedTimer, 
          startTime: newStartTime,
          duration: remainingSeconds, // Set duration to remaining seconds
          pausedDuration: 0, // Reset paused duration
          remainingSeconds: undefined // Clear remaining seconds
        };
        console.log(`🕐 Resuming countdown timer - resetting with remaining: ${remainingSeconds}s`);
      }
    }
    
    // If pausing a timer, record the pause time and remaining seconds
    if (updates.isPaused === true && currentTimer.isRunning) {
      const now = getSyncTimeSync();
      const originalStartTime = new Date(currentTimer.startTime).getTime();
      const elapsedSeconds = Math.floor((now - originalStartTime) / 1000);
      
      // For countdown timers, calculate remaining seconds
      let remainingSeconds = 0;
      if (currentTimer.isCountDown && currentTimer.duration) {
        remainingSeconds = Math.max(0, currentTimer.duration - elapsedSeconds);
      }
      
      // Store the elapsed time as paused duration and remaining seconds
      updatedTimer = { 
        ...updatedTimer, 
        pausedDuration: elapsedSeconds,
        remainingSeconds: remainingSeconds
      };
      console.log(`🕐 Pausing timer - elapsed: ${elapsedSeconds}s, remaining: ${remainingSeconds}s`);
    }
    
    activeTimers.set(userId, updatedTimer);
    console.log(`🕐 Timer updated for user ${userId}:`, updatedTimer);
  }
}

// Check if timer is still valid (not expired)
export function isTimerValid(timer: ActiveTimerState): boolean {
  if (!timer.startTime) return false;
  
  const now = getSyncTimeSync();
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
  const now = getSyncTimeSync();
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
export function getTimerWithElapsedTime(userId: number): (ActiveTimerState & { elapsedSeconds: number; remainingSeconds?: number }) | undefined {
  const timer = activeTimers.get(userId);
  if (!timer || !timer.startTime) return undefined;
  
  const now = getSyncTimeSync();
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