import { ActiveTimer } from "@shared/schema";

// Map to store active timers by user ID
const activeTimers: Map<number, ActiveTimer> = new Map();

// Update or add an active timer for a user
export function setActiveTimer(userId: number, timer: ActiveTimer): void {
  activeTimers.set(userId, timer);
}

// Remove a user's active timer
export function removeActiveTimer(userId: number): void {
  activeTimers.delete(userId);
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