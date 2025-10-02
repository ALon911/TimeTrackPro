import Database from 'better-sqlite3';
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
import db from './db';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export class SQLiteStorage implements IStorage {
  private db: Database.Database;
  sessionStore: any;

  constructor(sessionStore: any) {
    this.db = db;
    this.sessionStore = sessionStore;
    
    // Seed if empty
    this.seedDatabaseIfEmpty();
  }
  
  private seedDatabaseIfEmpty() {
    // Check if users table is empty
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count === 0) {
      console.log('Seeding database with sample data...');
      
      // Create default user directly with SQL
      const userStmt = this.db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
      const userResult = userStmt.run('user', '$2b$10$vJQMX.XRY8XHZm4QFTWEoOxFXbZV2sjPSOu9p7y3ZzBbEd4yqzjMm'); // hashed 'password'
      const userId = userResult.lastInsertRowid as number;
      
      // Create default topics directly with SQL
      const topicStmt = this.db.prepare('INSERT INTO topics (userId, name, color) VALUES (?, ?, ?)');
      const topic1Result = topicStmt.run(userId, 'DevOps', '#6366f1');
      const topic2Result = topicStmt.run(userId, 'Workouts', '#8b5cf6');
      const topic3Result = topicStmt.run(userId, 'Reading', '#ec4899');
      
      const topic1Id = topic1Result.lastInsertRowid as number;
      const topic2Id = topic2Result.lastInsertRowid as number;
      const topic3Id = topic3Result.lastInsertRowid as number;
      
      // Add sample time entries
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const timeEntryStmt = this.db.prepare(`
        INSERT INTO time_entries (userId, topicId, description, startTime, endTime, duration, isManual)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Today's entries
      const todayStartTime1 = new Date(new Date(now).setHours(10, 30, 0, 0));
      const todayEndTime1 = new Date(new Date(now).setHours(12, 15, 0, 0));
      timeEntryStmt.run(
        userId,
        topic1Id,
        'Kubernetes Training',
        todayStartTime1.toISOString(),
        todayEndTime1.toISOString(),
        1.75 * 60 * 60, // 1h 45m in seconds
        1 // isManual true
      );
      
      const todayStartTime2 = new Date(new Date(now).setHours(7, 0, 0, 0));
      const todayEndTime2 = new Date(new Date(now).setHours(7, 45, 0, 0));
      timeEntryStmt.run(
        userId,
        topic2Id,
        'HIIT Session',
        todayStartTime2.toISOString(),
        todayEndTime2.toISOString(),
        45 * 60, // 45m in seconds
        1 // isManual true
      );
      
      // Yesterday's entries
      const yesterdayStartTime1 = new Date(new Date(yesterday).setHours(14, 15, 0, 0));
      const yesterdayEndTime1 = new Date(new Date(yesterday).setHours(16, 30, 0, 0));
      timeEntryStmt.run(
        userId,
        topic1Id,
        'Docker Composition',
        yesterdayStartTime1.toISOString(),
        yesterdayEndTime1.toISOString(),
        2.25 * 60 * 60, // 2h 15m in seconds
        1 // isManual true
      );
      
      const yesterdayStartTime2 = new Date(new Date(yesterday).setHours(20, 30, 0, 0));
      const yesterdayEndTime2 = new Date(new Date(yesterday).setHours(21, 15, 0, 0));
      timeEntryStmt.run(
        userId,
        topic3Id,
        'System Design Interview',
        yesterdayStartTime2.toISOString(),
        yesterdayEndTime2.toISOString(),
        45 * 60, // 45m in seconds
        1 // isManual true
      );
      
      // Add more entries throughout the week for weekly chart
      const weekago = new Date();
      weekago.setDate(weekago.getDate() - 7);
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekago);
        day.setDate(day.getDate() + i);
        const hours = Math.random() * 3 + 0.5; // Random duration between 0.5 and 3.5 hours
        const duration = hours * 60 * 60; // Convert to seconds
        const topicId = [topic1Id, topic2Id, topic3Id][Math.floor(Math.random() * 3)]; // Random topic
        
        const startTime = new Date(new Date(day).setHours(10, 0, 0, 0));
        const endTime = new Date(new Date(day).setHours(10 + Math.floor(hours), Math.floor((hours % 1) * 60), 0, 0));
        
        timeEntryStmt.run(
          userId,
          topicId,
          `Auto-generated entry for ${day.toDateString()}`,
          startTime.toISOString(),
          endTime.toISOString(),
          duration,
          1 // isManual true
        );
      }
    }
  }

  // User methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    return user;
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const stmt = this.db.prepare('INSERT INTO users (username, password, email, display_name) VALUES (?, ?, ?, ?)');
    const result = stmt.run(insertUser.username, insertUser.password, insertUser.email || null, insertUser.displayName || null);
    const id = result.lastInsertRowid as number;
    return { ...insertUser, id };
  }
  
  async updateUser(id: number, userData: Partial<{ username: string; email: string; displayName: string }>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (userData.username !== undefined) {
      updates.push('username = ?');
      params.push(userData.username);
    }

    if (userData.email !== undefined) {
      updates.push('email = ?');
      params.push(userData.email);
    }

    if (userData.displayName !== undefined) {
      updates.push('display_name = ?');
      params.push(userData.displayName);
    }

    if (updates.length === 0) return user;

    params.push(id);

    const stmt = this.db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);
    
    return await this.getUser(id);
  }

  // Topic methods
  async getTopics(userId: number): Promise<Topic[]> {
    const topics = this.db.prepare('SELECT * FROM topics WHERE userId = ?').all(userId) as Topic[];
    return topics;
  }

  async getTopic(id: number): Promise<Topic | undefined> {
    const topic = this.db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as Topic | undefined;
    return topic;
  }

  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    // Ensure color is provided, default to indigo if not
    const color = insertTopic.color || '#6366f1';
    
    const stmt = this.db.prepare('INSERT INTO topics (userId, name, color) VALUES (?, ?, ?)');
    const result = stmt.run(insertTopic.userId, insertTopic.name, color);
    const id = result.lastInsertRowid as number;
    
    return { 
      id, 
      userId: insertTopic.userId, 
      name: insertTopic.name, 
      color 
    };
  }

  async updateTopic(id: number, topicUpdate: Partial<InsertTopic>): Promise<Topic | undefined> {
    const topic = await this.getTopic(id);
    if (!topic) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (topicUpdate.name !== undefined) {
      updates.push('name = ?');
      params.push(topicUpdate.name);
    }

    if (topicUpdate.color !== undefined) {
      updates.push('color = ?');
      params.push(topicUpdate.color);
    }

    if (updates.length === 0) return topic;

    params.push(id);

    const stmt = this.db.prepare(`UPDATE topics SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);
    
    // Fetch the updated topic
    return await this.getTopic(id);
  }

  async deleteTopic(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM topics WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Time entry methods
  async getTimeEntries(userId: number, filters?: TimeEntryFilters): Promise<TimeEntry[]> {
    let query = 'SELECT * FROM time_entries WHERE userId = ?';
    const params: any[] = [userId];

    if (filters) {
      if (filters.topicId !== undefined) {
        query += ' AND topicId = ?';
        params.push(filters.topicId);
      }

      if (filters.startDate !== undefined) {
        query += ' AND startTime >= ?';
        params.push(filters.startDate.toISOString());
      }

      if (filters.endDate !== undefined) {
        query += ' AND endTime <= ?';
        params.push(filters.endDate.toISOString());
      }

      query += ' ORDER BY startTime DESC';

      if (filters.limit !== undefined) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }
    }

    const entries = this.db.prepare(query).all(...params) as any[];
    
    // Convert timestamps back to Date objects and boolean
    return entries.map(entry => ({
      ...entry,
      startTime: entry.startTime,
      endTime: entry.endTime,
      isManual: Boolean(entry.isManual)
    }));
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const entry = this.db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as any | undefined;
    
    if (!entry) return undefined;
    
    return {
      ...entry,
      startTime: entry.startTime,
      endTime: entry.endTime,
      isManual: Boolean(entry.isManual)
    };
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const stmt = this.db.prepare(`
      INSERT INTO time_entries (userId, topicId, description, startTime, endTime, duration, isManual)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Ensure description is not undefined for SQLite
    const description = insertTimeEntry.description ?? null;
    
    // Ensure isManual is a boolean
    const isManual = insertTimeEntry.isManual ?? false;
    
    // Convert dates to ISO strings
    const startTimeIso = typeof insertTimeEntry.startTime === 'string' 
      ? insertTimeEntry.startTime 
      : insertTimeEntry.startTime.toISOString();
      
    const endTimeIso = typeof insertTimeEntry.endTime === 'string' 
      ? insertTimeEntry.endTime 
      : insertTimeEntry.endTime.toISOString();
    
    const result = stmt.run(
      insertTimeEntry.userId,
      insertTimeEntry.topicId,
      description,
      startTimeIso,
      endTimeIso,
      insertTimeEntry.duration,
      isManual ? 1 : 0
    );
    
    const id = result.lastInsertRowid as number;
    
    return {
      ...insertTimeEntry,
      id,
      description,
      startTime: startTimeIso,
      endTime: endTimeIso,
      isManual
    };
  }

  async updateTimeEntry(id: number, timeEntryUpdate: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const timeEntry = await this.getTimeEntry(id);
    if (!timeEntry) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (timeEntryUpdate.userId !== undefined) {
      updates.push('userId = ?');
      params.push(timeEntryUpdate.userId);
    }

    if (timeEntryUpdate.topicId !== undefined) {
      updates.push('topicId = ?');
      params.push(timeEntryUpdate.topicId);
    }

    if (timeEntryUpdate.description !== undefined) {
      updates.push('description = ?');
      params.push(timeEntryUpdate.description);
    }

    if (timeEntryUpdate.startTime !== undefined) {
      updates.push('startTime = ?');
      const startTimeIso = typeof timeEntryUpdate.startTime === 'string' 
        ? timeEntryUpdate.startTime 
        : timeEntryUpdate.startTime.toISOString();
      params.push(startTimeIso);
    }

    if (timeEntryUpdate.endTime !== undefined) {
      updates.push('endTime = ?');
      const endTimeIso = typeof timeEntryUpdate.endTime === 'string' 
        ? timeEntryUpdate.endTime 
        : timeEntryUpdate.endTime.toISOString();
      params.push(endTimeIso);
    }

    if (timeEntryUpdate.duration !== undefined) {
      updates.push('duration = ?');
      params.push(timeEntryUpdate.duration);
    }

    if (timeEntryUpdate.isManual !== undefined) {
      updates.push('isManual = ?');
      params.push(timeEntryUpdate.isManual ? 1 : 0);
    }

    if (updates.length === 0) return timeEntry;

    params.push(id);

    const stmt = this.db.prepare(`UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);
    
    return await this.getTimeEntry(id);
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM time_entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async deleteAllTimeEntries(userId: number): Promise<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM time_entries WHERE user_id = ?');
      const result = stmt.run(userId);
      console.log(`🗑️ Deleted ${result.changes} time entries for user ${userId}`);
      return result.changes >= 0;
    } catch (error) {
      console.error('Error deleting all time entries:', error);
      return false;
    }
  }

  // Statistics methods
  async getDailyStats(userId: number): Promise<TimeStat> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayEntries = await this.getTimeEntries(userId, { 
      startDate: today, 
      endDate: tomorrow 
    });
    
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
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as first day
    
    const startOfPrevWeek = new Date(startOfWeek);
    startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
    
    const endOfPrevWeek = new Date(startOfWeek);
    
    const thisWeekEntries = await this.getTimeEntries(userId, { 
      startDate: startOfWeek
    });
    
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
    const topics = await this.getTopics(userId);
    
    if (topics.length === 0) return undefined;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const topicTimes: Record<number, number> = {};
    
    // Initialize topic times to 0
    topics.forEach(topic => {
      topicTimes[topic.id] = 0;
    });
    
    // Get all time entries for this month
    const entries = await this.getTimeEntries(userId, { 
      startDate: startOfMonth
    });
    
    // Calculate total time per topic
    entries.forEach(entry => {
      topicTimes[entry.topicId] = (topicTimes[entry.topicId] || 0) + entry.duration;
    });
    
    // Find topic with maximum time
    let maxTime = 0;
    let mostTrackedTopicId = 0;
    
    Object.entries(topicTimes).forEach(([topicId, time]) => {
      if (time > maxTime) {
        maxTime = time;
        mostTrackedTopicId = parseInt(topicId);
      }
    });
    
    const mostTrackedTopic = topics.find(t => t.id === mostTrackedTopicId);
    
    if (!mostTrackedTopic) return undefined;
    
    return {
      topic: mostTrackedTopic,
      totalTime: maxTime
    };
  }
  
  async getTopicDistribution(userId: number): Promise<TopicDistribution[]> {
    const topics = await this.getTopics(userId);
    
    if (topics.length === 0) return [];
    
    const topicMap = new Map<number, Topic>();
    topics.forEach(topic => topicMap.set(topic.id, topic));
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get all time entries for this month
    const entries = await this.getTimeEntries(userId, { 
      startDate: startOfMonth
    });
    
    // Calculate total time per topic
    const topicTimes: Record<number, number> = {};
    let totalTime = 0;
    
    entries.forEach(entry => {
      topicTimes[entry.topicId] = (topicTimes[entry.topicId] || 0) + entry.duration;
      totalTime += entry.duration;
    });
    
    if (totalTime === 0) {
      // Return empty data with 0% for each topic
      return topics.map(topic => ({
        topic,
        totalTime: 0,
        percentage: 0
      }));
    }
    
    // Convert to distribution data
    return topics.map(topic => {
      const time = topicTimes[topic.id] || 0;
      return {
        topic,
        totalTime: time,
        percentage: Math.round((time / totalTime) * 100)
      };
    }).sort((a, b) => b.totalTime - a.totalTime);
  }

  async getWeeklyOverview(userId: number): Promise<WeeklyData[]> {
    console.log(`🔍 getWeeklyOverview called for user ${userId} at ${new Date().toISOString()}`);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesHebrew = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // Sunday=א, Monday=ב, ... Saturday=ש
    
    // Initialize with zero time for each day
    const weekData: WeeklyData[] = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dayOfWeekNum = day.getDay(); // Get the actual day of week (0=Sunday, 1=Monday, etc.)
      console.log(`🗓️ Day ${i}: ${day.toISOString().split('T')[0]} -> getDay()=${dayOfWeekNum} -> Hebrew: ${dayNamesHebrew[dayOfWeekNum]}`);
      
      return {
        day: dayNames[i],
        dayOfWeek: dayNamesHebrew[dayOfWeekNum], // Use the actual day of week number
        totalDuration: 0,
        totalTime: 0,
        date: day.toISOString().split('T')[0]
      };
    });
    
    // Get entries for the week
    const entries = await this.getTimeEntries(userId, {
      startDate: startOfWeek
    });
    
    // Calculate total time for each day
    entries.forEach(entry => {
      const entryDate = new Date(entry.startTime);
      const dayOfWeek = entryDate.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Only count if it's within the current week
      const entryTime = entryDate.getTime();
      const weekStart = startOfWeek.getTime();
      const weekEnd = new Date(startOfWeek);
      weekEnd.setDate(startOfWeek.getDate() + 7);
      
      if (entryTime >= weekStart && entryTime < weekEnd.getTime()) {
        // Make sure we're adding to the correct day in our weekData array
        // dayOfWeek corresponds directly to our weekData index since both start from Sunday (0)
        if (dayOfWeek >= 0 && dayOfWeek < weekData.length) {
          weekData[dayOfWeek].totalTime += entry.duration;
          weekData[dayOfWeek].totalDuration += entry.duration;
        }
      }
    });
    
    // Debug: Log the final data
    console.log('Final weekData:', weekData.map(d => ({ dayOfWeek: d.dayOfWeek, totalDuration: d.totalDuration })));
    
    return weekData;
  }

  async getRecentSessions(userId: number, limit: number = 4): Promise<TimeEntrySummary[]> {
    const entries = await this.getTimeEntries(userId, { limit });
    
    const summaries: TimeEntrySummary[] = [];
    
    for (const entry of entries) {
      const topic = await this.getTopic(entry.topicId);
      if (!topic) continue;
      
      const startDate = new Date(entry.startTime);
      const endDate = new Date(entry.endTime);
      
      // Format the date in Hebrew
      const dateStr = format(startDate, 'd בMMM yyyy', { locale: he });
      
      // Format time range
      const startTime = format(startDate, 'HH:mm');
      const endTime = format(endDate, 'HH:mm');
      const timeRange = `${startTime} - ${endTime}`;
      
      // Format duration
      const hours = Math.floor(entry.duration / 3600);
      const minutes = Math.floor((entry.duration % 3600) / 60);
      const durationStr = `${hours}:${minutes.toString().padStart(2, '0')}:00`;
      
      summaries.push({
        id: entry.id,
        description: entry.description || '',
        topic: {
          name: topic.name,
          color: topic.color
        },
        date: dateStr,
        timeRange,
        duration: durationStr
      });
    }
    
    return summaries;
  }
}
