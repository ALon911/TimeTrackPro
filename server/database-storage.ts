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
import session from 'express-session';
import SQLiteStore from 'better-sqlite3-session-store';

// Create database directory if it doesn't exist
const dbDir = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export class DatabaseStorage implements IStorage {
  private db: Database.Database;
  sessionStore: session.Store;

  constructor() {
    this.db = new Database(path.join(dbDir, 'timetrack.db'));
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Initialize the session store
    const SQLiteSessionStore = SQLiteStore(session);
    this.sessionStore = new SQLiteSessionStore({
      client: this.db,
      expired: {
        clear: true,
        intervalMs: 24 * 60 * 60 * 1000 // ms = 24 hours
      }
    });
    
    this.initializeDatabase();
    this.seedDatabaseIfEmpty();
  }

  private initializeDatabase() {
    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `);

    // Create topics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create time_entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        description TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration INTEGER NOT NULL,
        is_manual INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
      )
    `);
  }

  private seedDatabaseIfEmpty() {
    // Check if users table is empty
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count === 0) {
      console.log('Seeding database with sample data...');
      
      // Create default user directly with SQL (password = 'password')
      const userStmt = this.db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
      const userResult = userStmt.run('user@example.com', '4e1b73dd02446f5afdee3b8af07440a4e7988e07883fa37deca51e9c6bd88cd02b9c6f99f97946f94d312d9b7845216bee32be594d11e7db5cd1352271e83ec.62dea3d9e3aaa69f');
      const userId = userResult.lastInsertRowid as number;
      
      // Create default topics directly with SQL
      const topicStmt = this.db.prepare('INSERT INTO topics (user_id, name, color) VALUES (?, ?, ?)');
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
        INSERT INTO time_entries (user_id, topic_id, description, start_time, end_time, duration, is_manual)
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const stmt = this.db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
    const result = stmt.run(insertUser.email, insertUser.password);
    const id = result.lastInsertRowid as number;
    return { ...insertUser, id };
  }

  async updateUser(id: number, userData: Partial<{ email: string }>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (userData.email !== undefined) {
      updates.push('email = ?');
      params.push(userData.email);
    }

    if (updates.length === 0) return user;

    params.push(id);

    const stmt = this.db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);
    
    return this.getUser(id);
  }

  // Topic methods
  async getTopics(userId: number): Promise<Topic[]> {
    const topics = this.db.prepare('SELECT * FROM topics WHERE user_id = ?').all(userId) as Topic[];
    
    // Convert snake_case to camelCase
    return topics.map(topic => ({
      id: topic.id,
      userId: topic.user_id,
      name: topic.name,
      color: topic.color
    }));
  }

  async getTopic(id: number): Promise<Topic | undefined> {
    const topic = this.db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as any | undefined;
    
    if (!topic) return undefined;
    
    // Convert snake_case to camelCase
    return {
      id: topic.id,
      userId: topic.user_id,
      name: topic.name,
      color: topic.color
    };
  }

  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    // Ensure color is provided, default to indigo if not
    const color = insertTopic.color || '#6366f1';
    
    const stmt = this.db.prepare('INSERT INTO topics (user_id, name, color) VALUES (?, ?, ?)');
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
    
    return this.getTopic(id);
  }

  async deleteTopic(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM topics WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Time entry methods
  async getTimeEntries(userId: number, filters?: TimeEntryFilters): Promise<TimeEntry[]> {
    let query = 'SELECT * FROM time_entries WHERE user_id = ?';
    const params: any[] = [userId];

    if (filters) {
      if (filters.topicId !== undefined) {
        query += ' AND topic_id = ?';
        params.push(filters.topicId);
      }

      if (filters.startDate !== undefined) {
        query += ' AND start_time >= ?';
        params.push(filters.startDate.toISOString());
      }

      if (filters.endDate !== undefined) {
        query += ' AND end_time <= ?';
        params.push(filters.endDate.toISOString());
      }

      query += ' ORDER BY start_time DESC';

      if (filters.limit !== undefined) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }
    } else {
      query += ' ORDER BY start_time DESC';
    }

    const entries = this.db.prepare(query).all(...params) as any[];
    
    // Convert timestamps back to Date objects and snake_case to camelCase
    return entries.map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      topicId: entry.topic_id,
      description: entry.description,
      startTime: entry.start_time,
      endTime: entry.end_time,
      duration: entry.duration,
      isManual: Boolean(entry.is_manual)
    }));
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const entry = this.db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as any | undefined;
    
    if (!entry) return undefined;
    
    // Convert snake_case to camelCase
    return {
      id: entry.id,
      userId: entry.user_id,
      topicId: entry.topic_id,
      description: entry.description,
      startTime: entry.start_time,
      endTime: entry.end_time,
      duration: entry.duration,
      isManual: Boolean(entry.is_manual)
    };
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const stmt = this.db.prepare(`
      INSERT INTO time_entries (user_id, topic_id, description, start_time, end_time, duration, is_manual)
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
      insertTimeEntry.startTime,
      insertTimeEntry.endTime,
      insertTimeEntry.duration,
      isManual ? 1 : 0
    );
    
    const id = result.lastInsertRowid as number;
    
    return {
      id,
      userId: insertTimeEntry.userId,
      topicId: insertTimeEntry.topicId,
      description,
      startTime: insertTimeEntry.startTime,
      endTime: insertTimeEntry.endTime,
      duration: insertTimeEntry.duration,
      isManual
    };
  }

  async updateTimeEntry(id: number, timeEntryUpdate: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const timeEntry = await this.getTimeEntry(id);
    if (!timeEntry) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (timeEntryUpdate.userId !== undefined) {
      updates.push('user_id = ?');
      params.push(timeEntryUpdate.userId);
    }

    if (timeEntryUpdate.topicId !== undefined) {
      updates.push('topic_id = ?');
      params.push(timeEntryUpdate.topicId);
    }

    if (timeEntryUpdate.description !== undefined) {
      updates.push('description = ?');
      params.push(timeEntryUpdate.description);
    }

    if (timeEntryUpdate.startTime !== undefined) {
      updates.push('start_time = ?');
      params.push(timeEntryUpdate.startTime);
    }

    if (timeEntryUpdate.endTime !== undefined) {
      updates.push('end_time = ?');
      params.push(timeEntryUpdate.endTime);
    }

    if (timeEntryUpdate.duration !== undefined) {
      updates.push('duration = ?');
      params.push(timeEntryUpdate.duration);
    }

    if (timeEntryUpdate.isManual !== undefined) {
      updates.push('is_manual = ?');
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
    
    const entriesThisMonth = await this.getTimeEntries(userId, { startDate: startOfMonth });
    
    const topicTimes: Record<number, number> = {};
    
    // Calculate total time per topic
    entriesThisMonth.forEach(entry => {
      topicTimes[entry.topicId] = (topicTimes[entry.topicId] || 0) + entry.duration;
    });
    
    let maxTime = 0;
    let mostTrackedTopicId = 0;
    
    Object.entries(topicTimes).forEach(([topicId, time]) => {
      if (time > maxTime) {
        maxTime = time;
        mostTrackedTopicId = parseInt(topicId);
      }
    });
    
    if (mostTrackedTopicId === 0) return undefined;
    
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
        percentage: 0,
        totalTime: 0
      }));
    }
    
    // Calculate percentages and create distribution data
    return topics
      .map(topic => {
        const topicTime = topicTimes[topic.id] || 0;
        const percentage = Math.round((topicTime / totalTime) * 100);
        
        return {
          topic,
          percentage,
          totalTime: topicTime
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }
  
  async getWeeklyOverview(userId: number): Promise<WeeklyData[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    
    const entries = await this.getTimeEntries(userId, {
      startDate: startOfWeek,
      endDate: endOfWeek
    });
    
    const daysOfWeek = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    const weekData: WeeklyData[] = [];
    
    // Initialize data for each day of the week
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      
      weekData.push({
        day: day.toISOString().split('T')[0], // YYYY-MM-DD
        dayOfWeek: daysOfWeek[i],
        totalDuration: 0
      });
    }
    
    // Aggregate entries by day
    entries.forEach(entry => {
      const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
      const dayData = weekData.find(d => d.day === entryDate);
      
      if (dayData) {
        dayData.totalDuration += entry.duration;
      }
    });
    
    return weekData;
  }
  
  async getRecentSessions(userId: number, limit: number = 4): Promise<TimeEntrySummary[]> {
    const entries = await this.getTimeEntries(userId, { limit });
    
    const result: TimeEntrySummary[] = [];
    
    for (const entry of entries) {
      const topic = await this.getTopic(entry.topicId);
      
      if (topic) {
        const startDate = new Date(entry.startTime);
        const endDate = new Date(entry.endTime);
        
        // Format date: DD MMM YYYY (in Hebrew)
        const dateOptions: Intl.DateTimeFormatOptions = { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric'
        };
        const date = startDate.toLocaleDateString('he-IL', dateOptions);
        
        // Format time range: HH:MM - HH:MM
        const timeOptions: Intl.DateTimeFormatOptions = { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        };
        const startTime = startDate.toLocaleTimeString('he-IL', timeOptions);
        const endTime = endDate.toLocaleTimeString('he-IL', timeOptions);
        const timeRange = `${startTime} - ${endTime}`;
        
        // Format duration: H:MM:SS
        const hours = Math.floor(entry.duration / 3600);
        const minutes = Math.floor((entry.duration % 3600) / 60);
        const seconds = entry.duration % 60;
        const duration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        result.push({
          id: entry.id,
          description: entry.description,
          topic,
          date,
          timeRange,
          duration,
          durationSeconds: entry.duration
        });
      }
    }
    
    return result;
  }
}
