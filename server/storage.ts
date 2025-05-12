import { 
  User, 
  InsertUser, 
  Topic, 
  InsertTopic, 
  TimeEntry, 
  InsertTimeEntry,
  TimeStat,
  TopicDistribution,
  WeeklyData,
  TimeEntrySummary
} from "@shared/schema";
import session from "express-session";

export interface TimeEntryFilters {
  topicId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>; // Kept for backward compatibility
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<{ email: string }>): Promise<User | undefined>;
  
  // Topic methods
  getTopics(userId: number): Promise<Topic[]>;
  getTopic(id: number): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: number, topic: Partial<InsertTopic>): Promise<Topic | undefined>;
  deleteTopic(id: number): Promise<boolean>;
  
  // Time entry methods
  getTimeEntries(userId: number, filters?: TimeEntryFilters): Promise<TimeEntry[]>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;
  
  // Statistics methods
  getDailyStats(userId: number): Promise<TimeStat>;
  getWeeklyStats(userId: number): Promise<TimeStat>;
  getMostTrackedTopic(userId: number): Promise<{ topic: Topic; totalTime: number } | undefined>;
  getTopicDistribution(userId: number): Promise<TopicDistribution[]>;
  getWeeklyOverview(userId: number): Promise<WeeklyData[]>;
  getRecentSessions(userId: number, limit?: number): Promise<TimeEntrySummary[]>;
  
  // Session store
  sessionStore: session.Store;
}

// Import the actual storage implementation
import { DatabaseStorage } from './database-storage';

// Export the storage instance
export const storage = new DatabaseStorage();
