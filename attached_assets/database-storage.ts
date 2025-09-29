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
import { IStorage, TimeEntryFilters } from './storage';
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { users, topics, timeEntries } from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  // Add missing updateUser method to implement IStorage interface properly
  async updateUser(id: number, userData: Partial<{ username: string; email: string }>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  sessionStore: any; // Using any type for session store

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Topic methods
  async getTopics(userId: number): Promise<Topic[]> {
    const results = await db
      .select()
      .from(topics)
      .where(eq(topics.userId, userId));
    return results;
  }

  async getTopic(id: number): Promise<Topic | undefined> {
    const [topic] = await db
      .select()
      .from(topics)
      .where(eq(topics.id, id));
    return topic;
  }

  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    const [topic] = await db
      .insert(topics)
      .values(insertTopic)
      .returning();
    return topic;
  }

  async updateTopic(id: number, topicUpdate: Partial<InsertTopic>): Promise<Topic | undefined> {
    const [updatedTopic] = await db
      .update(topics)
      .set(topicUpdate)
      .where(eq(topics.id, id))
      .returning();
    return updatedTopic;
  }

  async deleteTopic(id: number): Promise<boolean> {
    const result = await db
      .delete(topics)
      .where(eq(topics.id, id));
    return true; // In drizzle, if no error was thrown, it was successful
  }

  // Time entry methods
  async getTimeEntries(userId: number, filters?: TimeEntryFilters): Promise<TimeEntry[]> {
    let query = db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.userId, userId));

    if (filters) {
      if (filters.topicId !== undefined) {
        query = query.where(eq(timeEntries.topicId, filters.topicId));
      }

      if (filters.startDate !== undefined) {
        query = query.where(gte(timeEntries.startTime, filters.startDate));
      }

      if (filters.endDate !== undefined) {
        query = query.where(lte(timeEntries.endTime, filters.endDate));
      }

      // We're adding order by here
      query = query.orderBy(desc(timeEntries.startTime));

      // Always log the query for debugging
      console.log('Time entries query with filters:', filters);

      if (filters.limit !== undefined) {
        query = query.limit(filters.limit);
      }
    }

    const entries = await query;
    return entries;
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id));
    return entry;
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db
      .insert(timeEntries)
      .values(insertTimeEntry)
      .returning();
    return entry;
  }

  async updateTimeEntry(id: number, timeEntryUpdate: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const [updatedEntry] = await db
      .update(timeEntries)
      .set(timeEntryUpdate)
      .where(eq(timeEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.id, id));
    return true;
  }

  // Statistics methods
  async getDailyStats(userId: number): Promise<TimeStat> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get today's entries
    const todayEntries = await this.getTimeEntries(userId, {
      startDate: today,
      endDate: tomorrow
    });
    
    // Get yesterday's entries
    const yesterdayEntries = await this.getTimeEntries(userId, {
      startDate: yesterday,
      endDate: today
    });
    
    const todayTotal = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const yesterdayTotal = yesterdayEntries.reduce((sum, entry) => sum + entry.duration, 0);
    
    let percentChange = 0;
    let increase = true;
    
    if (yesterdayTotal > 0) {
      percentChange = Math.round((todayTotal - yesterdayTotal) / yesterdayTotal * 100);
      increase = percentChange >= 0;
    }
    
    return {
      total: todayTotal,
      compareTotal: yesterdayTotal,
      percentChange: Math.abs(percentChange),
      increase
    };
  }

  async getWeeklyStats(userId: number): Promise<TimeStat> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    // Set to previous Sunday (or today if it is Sunday)
    startOfWeek.setDate(today.getDate() - today.getDay()); 
    
    const startOfPrevWeek = new Date(startOfWeek);
    startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
    
    const endOfPrevWeek = new Date(startOfWeek);
    
    // Get this week's entries
    const thisWeekEntries = await this.getTimeEntries(userId, {
      startDate: startOfWeek
    });
    
    // Get previous week's entries
    const prevWeekEntries = await this.getTimeEntries(userId, {
      startDate: startOfPrevWeek,
      endDate: endOfPrevWeek
    });
    
    const thisWeekTotal = thisWeekEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const prevWeekTotal = prevWeekEntries.reduce((sum, entry) => sum + entry.duration, 0);
    
    let percentChange = 0;
    let increase = true;
    
    if (prevWeekTotal > 0) {
      percentChange = Math.round((thisWeekTotal - prevWeekTotal) / prevWeekTotal * 100);
      increase = percentChange >= 0;
    }
    
    return {
      total: thisWeekTotal,
      compareTotal: prevWeekTotal,
      percentChange: Math.abs(percentChange),
      increase
    };
  }

  async getMostTrackedTopic(userId: number): Promise<{ topic: Topic; totalTime: number } | undefined> {
    const userTopics = await this.getTopics(userId);
    
    if (userTopics.length === 0) return undefined;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get monthly entries
    const monthlyEntries = await this.getTimeEntries(userId, {
      startDate: startOfMonth
    });
    
    // Calculate time per topic
    const topicTimes = new Map<number, number>();
    
    // Initialize with all topics at 0
    userTopics.forEach(topic => {
      topicTimes.set(topic.id, 0);
    });
    
    // Sum up durations by topic
    monthlyEntries.forEach(entry => {
      const currentTime = topicTimes.get(entry.topicId) || 0;
      topicTimes.set(entry.topicId, currentTime + entry.duration);
    });
    
    // Find the topic with the max time
    let maxTime = 0;
    let maxTopicId: number | null = null;
    
    topicTimes.forEach((time, topicId) => {
      if (time > maxTime) {
        maxTime = time;
        maxTopicId = topicId;
      }
    });
    
    if (maxTopicId === null) return undefined;
    
    const topic = userTopics.find(t => t.id === maxTopicId);
    if (!topic) return undefined;
    
    return {
      topic,
      totalTime: maxTime
    };
  }

  async getTopicDistribution(userId: number): Promise<TopicDistribution[]> {
    const userTopics = await this.getTopics(userId);
    
    if (userTopics.length === 0) return [];
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get monthly entries
    const monthlyEntries = await this.getTimeEntries(userId, {
      startDate: startOfMonth
    });
    
    // Calculate time per topic
    const topicTimes = new Map<number, number>();
    
    // Initialize with all topics at 0
    userTopics.forEach(topic => {
      topicTimes.set(topic.id, 0);
    });
    
    // Sum up durations by topic
    let totalTime = 0;
    monthlyEntries.forEach(entry => {
      const currentTime = topicTimes.get(entry.topicId) || 0;
      topicTimes.set(entry.topicId, currentTime + entry.duration);
      totalTime += entry.duration;
    });
    
    // If no time tracked this month, return zero percentages
    if (totalTime === 0) {
      return userTopics.map(topic => ({
        topicId: topic.id,
        topicName: topic.name,
        topicColor: topic.color,
        duration: 0,
        percentage: 0
      }));
    }
    
    // Calculate percentages
    const distribution = userTopics.map(topic => {
      const duration = topicTimes.get(topic.id) || 0;
      return {
        topicId: topic.id,
        topicName: topic.name,
        topicColor: topic.color,
        duration,
        percentage: Math.round((duration / totalTime) * 100)
      };
    });
    
    // Sort by percentage (highest first)
    return distribution.sort((a, b) => b.percentage - a.percentage);
  }

  async getWeeklyOverview(userId: number): Promise<WeeklyData[]> {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const shortDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    
    // Initialize weekly data with zero durations
    const weeklyData: WeeklyData[] = days.map((day, index) => ({
      day,
      shortDay: shortDays[index],
      duration: 0
    }));
    
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Find the previous Sunday (start of week)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - currentDay);
    startDate.setHours(0, 0, 0, 0);
    
    // Get all entries for the current week
    const weekEntries = await this.getTimeEntries(userId, {
      startDate
    });
    
    // Sum up durations by day of week
    weekEntries.forEach(entry => {
      const day = entry.startTime.getDay();
      weeklyData[day].duration += entry.duration;
    });
    
    return weeklyData;
  }

  async getRecentSessions(userId: number, limit: number = 4): Promise<TimeEntrySummary[]> {
    // Get all topics first to identify which ones exist
    const validTopics = await this.getTopics(userId);
    const validTopicIds = new Set(validTopics.map(topic => topic.id));
    
    console.log(`Valid topic IDs for user ${userId}:`, Array.from(validTopicIds));
    
    // Get the recent time entries, but only those with valid topics
    const allEntries = await this.getTimeEntries(userId, { limit: limit * 2 }); // Get more entries in case some are filtered out
    console.log(`All time entries for user ${userId}:`, allEntries);
    
    const entriesWithValidTopics = allEntries.filter(entry => validTopicIds.has(entry.topicId));
    console.log(`Filtered time entries with valid topics:`, entriesWithValidTopics);
    
    const entries = entriesWithValidTopics.slice(0, limit);
    
    const results: TimeEntrySummary[] = [];
    
    for (const entry of entries) {
      try {
        // Get the associated topic - we already know it exists
        const topic = await this.getTopic(entry.topicId);
        
        if (!topic) {
          // Skip entries with missing topics instead of throwing an error
          console.warn(`Topic not found for id: ${entry.topicId}, skipping entry`);
          continue;
        }
        
        // Format duration (e.g., "1 שעה 30 דקות")
        // Round duration to the nearest minute for display purposes
        let roundedDuration = entry.duration;
        if (roundedDuration >= 55 && roundedDuration < 60) {
          // Round up to a full minute if within 5 seconds
          roundedDuration = 60;
        }
        
        const hours = Math.floor(roundedDuration / 3600);
        const minutes = Math.floor((roundedDuration % 3600) / 60);
        const seconds = roundedDuration % 60;
        
        let formattedDuration = '';
        
        if (hours > 0) {
          formattedDuration = `${hours} שעה${minutes > 0 ? ` ${minutes} דקות` : ''}`;
        } else if (minutes > 0) {
          if (minutes === 1) {
            formattedDuration = "דקה";
          } else {
            formattedDuration = `${minutes} דקות`;
          }
        } else {
          formattedDuration = `${seconds} שניות`;
        }
        
        // Format time (e.g., "10:30") using Israel timezone
        const formatTime = (date: Date) => {
          // Add +3 hours for Israel timezone during summer time (May 12th, 2025 should be in daylight saving time)
          const israelTimeOffset = 3 * 60 * 60 * 1000;
          const israelTime = new Date(date.getTime() + israelTimeOffset);
          
          // Format hour and minute with proper padding
          const hours = israelTime.getUTCHours();
          const minutes = israelTime.getUTCMinutes();
          
          // Add +1 hour to match the exact time needed based on user feedback
          return `${(hours + 1).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        };
        
        // Get date adjusted to Israel timezone
        const getIsraeliDate = (date: Date): Date => {
          // Create a new date with the Israel timezone offset applied (UTC+3 for summer time)
          const israelTimeOffset = 3 * 60 * 60 * 1000;
          const israelTime = new Date(date.getTime() + israelTimeOffset);
          
          // Create date at midnight of the same day in Israel time
          const israelDate = new Date(Date.UTC(
            israelTime.getUTCFullYear(),
            israelTime.getUTCMonth(),
            israelTime.getUTCDate(),
            0, 0, 0, 0
          ));
          return israelDate;
        };
        
        const isToday = (date: Date) => {
          const today = getIsraeliDate(new Date());
          const targetDate = getIsraeliDate(date);
          
          return targetDate.getDate() === today.getDate() &&
                targetDate.getMonth() === today.getMonth() &&
                targetDate.getFullYear() === today.getFullYear();
        };
        
        const isYesterday = (date: Date) => {
          const yesterday = getIsraeliDate(new Date());
          yesterday.setDate(yesterday.getDate() - 1);
          const targetDate = getIsraeliDate(date);
          
          return targetDate.getDate() === yesterday.getDate() &&
                targetDate.getMonth() === yesterday.getMonth() &&
                targetDate.getFullYear() === yesterday.getFullYear();
        };
        
        let formattedDate = '';
        if (isToday(entry.startTime)) {
          formattedDate = 'היום';
        } else if (isYesterday(entry.startTime)) {
          formattedDate = 'אתמול';
        } else {
          formattedDate = entry.startTime.toLocaleDateString('he-IL', {
            month: 'short',
            day: 'numeric'
          });
        }
        
        const formattedTimeRange = `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}`;
        
        results.push({
          id: entry.id,
          topicId: topic.id,
          topicName: topic.name,
          topicColor: topic.color,
          description: entry.description,
          startTime: entry.startTime,
          endTime: entry.endTime,
          duration: entry.duration,
          formattedDuration,
          formattedTimeRange,
          formattedDate
        });
      } catch (error) {
        console.warn(`Error processing time entry ${entry.id}:`, error);
        // Continue with the next entry
        continue;
      }
    }
    
    return results;
  }
}

export const dbStorage = new DatabaseStorage();