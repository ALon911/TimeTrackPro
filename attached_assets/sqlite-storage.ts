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
import path from 'path';
import fs from 'fs';

// Create database directory if it doesn't exist
const dbDir = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export class SQLiteStorage implements IStorage {
  private db: Database.Database;

  constructor() {
    this.db = new Database(path.join(dbDir, 'timetrack.db'));
    this.initializeDatabase();
    
    // Reset the database for testing
    // Uncomment this to reset the database when needed
    // this.resetDatabase();
    
    // Seed if empty
    this.seedDatabaseIfEmpty();
    
    // For debugging, log table counts
    this.logTableCounts();
  }
  
  private resetDatabase() {
    console.log('Resetting database...');
    this.db.exec('DELETE FROM time_entries');
    this.db.exec('DELETE FROM topics');
    this.db.exec('DELETE FROM users');
    console.log('Database reset complete.');
  }
  
  private logTableCounts() {
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const topicCount = this.db.prepare('SELECT COUNT(*) as count FROM topics').get() as { count: number };
    const entryCount = this.db.prepare('SELECT COUNT(*) as count FROM time_entries').get() as { count: number };
    
    console.log(`Database has ${userCount.count} users, ${topicCount.count} topics, and ${entryCount.count} time entries.`);
  }

  private initializeDatabase() {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `);

    // Create topics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create time_entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        topicId INTEGER NOT NULL,
        description TEXT,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        duration INTEGER NOT NULL,
        isManual INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE
      )
    `);
  }

  private seedDatabaseIfEmpty() {
    // Check if users table is empty
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count === 0) {
      console.log('Seeding database with sample data...');
      
      // Create default user directly with SQL
      const userStmt = this.db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
      const userResult = userStmt.run('user', 'password');
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
  async getUser(id: number): Promise<User | undefined> {
    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const stmt = this.db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const result = stmt.run(insertUser.username, insertUser.password);
    const id = result.lastInsertRowid as number;
    return { ...insertUser, id };
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
    const updatedTopic = await this.getTopic(id);
    if (!updatedTopic) {
      throw new Error(`Failed to retrieve updated topic with id ${id}`);
    }
    
    return updatedTopic;
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
    
    // Convert timestamps back to Date objects
    return entries.map(entry => ({
      ...entry,
      startTime: new Date(entry.startTime),
      endTime: new Date(entry.endTime),
      isManual: Boolean(entry.isManual)
    }));
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const entry = this.db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as any | undefined;
    
    if (!entry) return undefined;
    
    return {
      ...entry,
      startTime: new Date(entry.startTime),
      endTime: new Date(entry.endTime),
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
    
    const result = stmt.run(
      insertTimeEntry.userId,
      insertTimeEntry.topicId,
      description,
      insertTimeEntry.startTime.toISOString(),
      insertTimeEntry.endTime.toISOString(),
      insertTimeEntry.duration,
      isManual ? 1 : 0
    );
    
    const id = result.lastInsertRowid as number;
    
    return {
      ...insertTimeEntry,
      id,
      description,
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
      params.push(timeEntryUpdate.startTime.toISOString());
    }

    if (timeEntryUpdate.endTime !== undefined) {
      updates.push('endTime = ?');
      params.push(timeEntryUpdate.endTime.toISOString());
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

    return this.getTimeEntry(id);
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM time_entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
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
        topicId: topic.id,
        topicName: topic.name,
        topicColor: topic.color,
        duration: 0,
        percentage: 0
      }));
    }
    
    // Calculate percentages
    return Object.entries(topicTimes)
      .map(([topicId, duration]) => {
        const topic = topicMap.get(parseInt(topicId));
        
        if (!topic) return null; // Skip if topic not found
        
        return {
          topicId: topic.id,
          topicName: topic.name,
          topicColor: topic.color,
          duration,
          percentage: Math.round((duration / totalTime) * 100)
        };
      })
      .filter((item): item is TopicDistribution => item !== null)
      .sort((a, b) => b.percentage - a.percentage);
  }

  async getWeeklyOverview(userId: number): Promise<WeeklyData[]> {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Start from previous Sunday
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);
    
    const weeklyData: WeeklyData[] = [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize with 0 duration for each day
    for (let i = 0; i < 7; i++) {
      weeklyData.push({
        day: days[i],
        shortDay: shortDays[i],
        duration: 0
      });
    }
    
    // Get all entries for the week
    const entries = await this.getTimeEntries(userId, {
      startDate
    });
    
    // Calculate total duration per day
    entries.forEach(entry => {
      const entryDay = entry.startTime.getDay();
      weeklyData[entryDay].duration += entry.duration;
    });
    
    return weeklyData;
  }

  async getRecentSessions(userId: number, limit: number = 4): Promise<TimeEntrySummary[]> {
    const entries = await this.getTimeEntries(userId, { limit });
    const results: TimeEntrySummary[] = [];
    
    for (const entry of entries) {
      const topic = await this.getTopic(entry.topicId);
      
      if (!topic) {
        throw new Error(`Topic not found for id: ${entry.topicId}`);
      }
      
      const hours = Math.floor(entry.duration / 3600);
      const minutes = Math.floor((entry.duration % 3600) / 60);
      const formattedDuration = hours > 0 
        ? `${hours}h ${minutes}m` 
        : `${minutes}m`;
      
      const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      };
      
      const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear();
      };
      
      const isYesterday = (date: Date) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return date.getDate() === yesterday.getDate() &&
          date.getMonth() === yesterday.getMonth() &&
          date.getFullYear() === yesterday.getFullYear();
      };
      
      let formattedDate = '';
      if (isToday(entry.startTime)) {
        formattedDate = 'Today';
      } else if (isYesterday(entry.startTime)) {
        formattedDate = 'Yesterday';
      } else {
        formattedDate = entry.startTime.toLocaleDateString('en-US', {
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
        description: entry.description || '',
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration,
        formattedDuration,
        formattedTimeRange,
        formattedDate
      });
    }
    
    return results;
  }
}

export const sqliteStorage = new SQLiteStorage();