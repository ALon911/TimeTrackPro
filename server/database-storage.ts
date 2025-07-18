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
  TimeEntrySummary,
  Team,
  InsertTeam,
  TeamMember,
  InsertTeamMember,
  TeamInvitation,
  InsertTeamInvitation,
  TeamTimeStat,
  TeamTopicDistribution,
  TeamMemberActivity
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
        password TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create teams table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create team_members table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(team_id, user_id)
      )
    `);

    // Create team_invitations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS team_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        token TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        invited_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id)
      )
    `);

    // Create topics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        team_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
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
        team_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
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
    // For backward compatibility, we're treating username as an email
    return this.getUserByEmail(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const stmt = this.db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(insertUser.username, insertUser.email, insertUser.password);
    const id = result.lastInsertRowid as number;
    return { ...insertUser, id, createdAt: new Date().toISOString() };
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
    
    // Filter out topics with no time tracked
    const trackedTopics = topics.filter(topic => topicTimes[topic.id] > 0);
    
    // If no topics have any tracked time after filtering, return the original empty data
    if (trackedTopics.length === 0) {
      return topics.map(topic => ({
        topic,
        percentage: 0,
        totalTime: 0
      }));
    }
    
    // Calculate percentages and create distribution data for topics with tracked time
    return trackedTopics
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

  // Team methods
  async getTeams(userId: number): Promise<Team[]> {
    const stmt = this.db.prepare(`
      SELECT t.*
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
    `);
    
    return stmt.all(userId) as Team[];
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const stmt = this.db.prepare('SELECT * FROM teams WHERE id = ?');
    return stmt.get(id) as Team | undefined;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const stmt = this.db.prepare('INSERT INTO teams (name, owner_id) VALUES (?, ?)');
    const info = stmt.run(team.name, team.ownerId);
    
    // Also add the owner as a member with 'owner' role
    await this.addTeamMember({
      teamId: info.lastInsertRowid as number,
      userId: team.ownerId,
      role: 'owner'
    });
    
    // Get the newly created team after adding the member
    const newTeam = await this.getTeam(info.lastInsertRowid as number);
    if (!newTeam) {
      throw new Error('Failed to create team');
    }
    
    return newTeam;
  }

  async updateTeam(id: number, teamData: Partial<{ name: string }>): Promise<Team | undefined> {
    const stmt = this.db.prepare('UPDATE teams SET name = ? WHERE id = ?');
    stmt.run(teamData.name, id);
    
    return this.getTeam(id);
  }

  async deleteTeam(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM teams WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  // Team members methods
  async getTeamMembers(teamId: number): Promise<(TeamMember & { user: User })[]> {
    try {
      // First check if the team exists
      const teamCheck = this.db.prepare('SELECT * FROM teams WHERE id = ?');
      const team = teamCheck.get(teamId);
      if (!team) {
        return [];
      }
      
      // Get the columns from the team_members table
      const columnsStmt = this.db.prepare("PRAGMA table_info(team_members)");
      const columns = columnsStmt.all();
      const teamMemberColumns = columns.map(col => col.name);
      
      // Check if the necessary columns exist
      const hasTeamId = teamMemberColumns.includes('team_id');
      const hasUserId = teamMemberColumns.includes('user_id');
      
      if (!hasTeamId || !hasUserId) {
        console.error('Missing columns in team_members table:', { hasTeamId, hasUserId });
        return [];
      }
      
      const stmt = this.db.prepare(`
        SELECT tm.*, u.id as user_id, u.email
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
      `);
      
      const members = stmt.all(teamId) as any[];
      
      return members.map(member => ({
        id: member.id,
        teamId: member.team_id,
        userId: member.user_id,
        role: member.role || 'member',
        joinedAt: member.joined_at || new Date().toISOString(),
        user: {
          id: member.user_id,
          email: member.email,
          password: '', // We don't want to expose the password
          createdAt: new Date().toISOString() // Default value
        }
      }));
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
  }

  async addTeamMember(teamMember: InsertTeamMember): Promise<TeamMember> {
    try {
      // First check if the member already exists
      const existingMemberStmt = this.db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?');
      const existingMember = existingMemberStmt.get(teamMember.teamId, teamMember.userId) as TeamMember | undefined;
      
      if (existingMember) {
        // If member already exists, return it
        return existingMember;
      }
      
      // Otherwise add the new member
      const stmt = this.db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)');
      const info = stmt.run(teamMember.teamId, teamMember.userId, teamMember.role);
      
      return {
        id: info.lastInsertRowid as number,
        teamId: teamMember.teamId,
        userId: teamMember.userId,
        role: teamMember.role,
        joinedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error adding team member:", error);
      
      // If there was an error but it's a unique constraint failure, we can still get the existing record
      const memberStmt = this.db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?');
      const member = memberStmt.get(teamMember.teamId, teamMember.userId) as TeamMember | undefined;
      
      if (member) {
        return member;
      }
      
      // If we couldn't recover, rethrow the error
      throw error;
    }
  }

  async removeTeamMember(teamId: number, userId: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?');
    const result = stmt.run(teamId, userId);
    
    return result.changes > 0;
  }

  async updateTeamMemberRole(teamId: number, userId: number, role: string): Promise<TeamMember | undefined> {
    const stmt = this.db.prepare('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?');
    stmt.run(role, teamId, userId);
    
    const memberStmt = this.db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?');
    return memberStmt.get(teamId, userId) as TeamMember | undefined;
  }

  // Team invitations methods
  async createTeamInvitation(invitation: InsertTeamInvitation & { token: string }): Promise<TeamInvitation> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days expiry
    
    const stmt = this.db.prepare(`
      INSERT INTO team_invitations 
      (team_id, email, token, invited_by, expires_at) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      invitation.teamId, 
      invitation.email, 
      invitation.token, 
      invitation.invitedBy, 
      expiryDate.toISOString()
    );
    
    const invitationStmt = this.db.prepare('SELECT * FROM team_invitations WHERE id = ?');
    return invitationStmt.get(info.lastInsertRowid) as TeamInvitation;
  }

  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
    console.log('DB: Looking up invitation with token:', token);
    
    try {
      // Check valid token
      if (!token || token.length < 10) {
        console.log('DB: Invalid token format:', token);
        return undefined;
      }
      
      const stmt = this.db.prepare('SELECT * FROM team_invitations WHERE token = ?');
      console.log('DB: SQL prepared, executing with token:', token);
      
      const result = stmt.get(token) as TeamInvitation | undefined;
      console.log('DB: Token lookup result:', result);
      
      return result;
    } catch (err) {
      console.error('DB: Error in getTeamInvitationByToken:', err);
      return undefined;
    }
  }
  
  async getTeamInvitationById(id: number): Promise<TeamInvitation | undefined> {
    const stmt = this.db.prepare('SELECT * FROM team_invitations WHERE id = ?');
    return stmt.get(id) as TeamInvitation | undefined;
  }

  async getTeamInvitationsByEmail(email: string): Promise<TeamInvitation[]> {
    const stmt = this.db.prepare(`
      SELECT ti.*, t.name as team_name, u.email as inviter_email
      FROM team_invitations ti
      JOIN teams t ON ti.team_id = t.id
      JOIN users u ON ti.invited_by = u.id
      WHERE ti.email = ? AND ti.status = 'pending'
      AND ti.expires_at > CURRENT_TIMESTAMP
    `);
    
    return stmt.all(email) as TeamInvitation[];
  }

  async getTeamInvitationsByTeam(teamId: number): Promise<TeamInvitation[]> {
    const stmt = this.db.prepare('SELECT * FROM team_invitations WHERE team_id = ?');
    return stmt.all(teamId) as TeamInvitation[];
  }

  async updateTeamInvitationStatus(id: number, status: string): Promise<TeamInvitation | undefined> {
    const stmt = this.db.prepare('UPDATE team_invitations SET status = ? WHERE id = ?');
    stmt.run(status, id);
    
    const invitationStmt = this.db.prepare('SELECT * FROM team_invitations WHERE id = ?');
    return invitationStmt.get(id) as TeamInvitation | undefined;
  }

  // Team statistics methods
  async getTeamStats(teamId: number): Promise<TeamTimeStat> {
    const teamStmt = this.db.prepare('SELECT * FROM teams WHERE id = ?');
    const team = teamStmt.get(teamId) as Team;
    
    const membersStmt = this.db.prepare(`
      SELECT tm.user_id, u.email, SUM(te.duration) as total_seconds
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      LEFT JOIN time_entries te ON u.id = te.user_id
      WHERE tm.team_id = ?
      GROUP BY tm.user_id
      ORDER BY total_seconds DESC
    `);
    
    const members = membersStmt.all(teamId) as any[];
    
    const totalStmt = this.db.prepare(`
      SELECT SUM(te.duration) as total 
      FROM time_entries te
      JOIN team_members tm ON te.user_id = tm.user_id
      WHERE tm.team_id = ?
    `);
    const totalResult = totalStmt.get(teamId) as any;
    const totalSeconds = totalResult?.total || 0;
    
    return {
      teamId: team.id,
      teamName: team.name,
      membersCount: members.length,
      totalSeconds,
      breakdownByUser: members.map(member => ({
        userId: member.user_id,
        email: member.email,
        seconds: member.total_seconds || 0,
        percentage: (totalSeconds > 0 && member.total_seconds > 0) ? ((member.total_seconds || 0) / totalSeconds) * 100 : 0
      }))
    };
  }

  async getTeamTopicDistribution(teamId: number): Promise<TeamTopicDistribution[]> {
    const topicsStmt = this.db.prepare(`
      SELECT t.id, t.name, t.color, SUM(te.duration) as total_seconds
      FROM topics t
      JOIN time_entries te ON t.id = te.topic_id
      JOIN team_members tm ON te.user_id = tm.user_id
      WHERE tm.team_id = ?
      GROUP BY t.id
      HAVING SUM(te.duration) > 0
      ORDER BY total_seconds DESC
    `);
    
    const topics = topicsStmt.all(teamId) as any[];
    
    // Get total seconds of all team members
    const totalStmt = this.db.prepare(`
      SELECT SUM(te.duration) as total
      FROM time_entries te
      JOIN team_members tm ON te.user_id = tm.user_id
      WHERE tm.team_id = ?
    `);
    const totalResult = totalStmt.get(teamId) as any;
    const totalSeconds = totalResult?.total || 0;
    
    const results: TeamTopicDistribution[] = [];
    
    for (const topic of topics) {
      const userBreakdownStmt = this.db.prepare(`
        SELECT u.id as user_id, u.email, SUM(te.duration) as user_seconds
        FROM time_entries te
        JOIN users u ON te.user_id = u.id
        JOIN team_members tm ON te.user_id = tm.user_id
        WHERE tm.team_id = ? AND te.topic_id = ?
        GROUP BY u.id
        ORDER BY user_seconds DESC
      `);
      
      const userBreakdown = userBreakdownStmt.all(teamId, topic.id) as any[];
      
      results.push({
        topic: {
          id: topic.id,
          name: topic.name,
          color: topic.color,
          userId: 0, // Team topics don't have a specific user
          teamId: teamId
        },
        percentage: (totalSeconds > 0 && topic.total_seconds > 0) ? (topic.total_seconds / totalSeconds) * 100 : 0,
        totalSeconds: topic.total_seconds,
        breakdownByUser: userBreakdown.map(user => ({
          userId: user.user_id,
          email: user.email,
          seconds: user.user_seconds,
          percentage: (topic.total_seconds > 0 && user.user_seconds > 0) ? (user.user_seconds / topic.total_seconds) * 100 : 0
        }))
      });
    }
    
    return results;
  }

  async getTeamMemberActivity(teamId: number): Promise<TeamMemberActivity[]> {
    const membersStmt = this.db.prepare(`
      SELECT tm.user_id, u.email
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `);
    
    const members = membersStmt.all(teamId) as any[];
    
    const results: TeamMemberActivity[] = [];
    
    for (const member of members) {
      // Get total time tracked
      const totalStmt = this.db.prepare(`
        SELECT SUM(duration) as total
        FROM time_entries
        WHERE user_id = ?
      `);
      
      const totalResult = totalStmt.get(member.user_id) as any;
      
      // Get most active hour
      const hourStmt = this.db.prepare(`
        SELECT strftime('%H', start_time) as hour, SUM(duration) as total
        FROM time_entries
        WHERE user_id = ?
        GROUP BY hour
        ORDER BY total DESC
        LIMIT 1
      `);
      
      const hourResult = hourStmt.get(member.user_id) as any;
      
      // Get last active day
      const lastActiveStmt = this.db.prepare(`
        SELECT date(start_time) as last_day
        FROM time_entries
        WHERE user_id = ?
        ORDER BY start_time DESC
        LIMIT 1
      `);
      
      const lastActiveResult = lastActiveStmt.get(member.user_id) as any;
      
      results.push({
        userId: member.user_id,
        email: member.email,
        totalSeconds: totalResult?.total || 0,
        mostActiveHour: hourResult?.hour ? parseInt(hourResult.hour) : 9, // Default to 9am if no data
        lastActiveDay: lastActiveResult?.last_day || new Date().toISOString().split('T')[0]
      });
    }
    
    return results;
  }

  async getTeamTopics(teamId: number): Promise<Topic[]> {
    try {
      // בדיקה אם עמודת team_id קיימת בטבלת topics
      const tableInfoStmt = this.db.prepare(`PRAGMA table_info(topics)`);
      const columns = tableInfoStmt.all();
      const hasTeamIdColumn = columns.some(col => col.name === 'team_id');
      
      if (hasTeamIdColumn) {
        // אם העמודה קיימת, השתמש בה לשליפת נושאים
        const stmt = this.db.prepare(`
          SELECT t.*
          FROM topics t
          WHERE t.team_id = ?
          ORDER BY t.name
        `);
        return stmt.all(teamId) as Topic[];
      } else {
        // אם העמודה לא קיימת, נחזיר רשימה ריקה של נושאים
        console.warn(`team_id column not found in topics table, returning empty list`);
        return [];
      }
    } catch (error) {
      console.error('Error in getTeamTopics:', error);
      return [];
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Start a transaction to ensure data consistency
      this.db.exec('BEGIN TRANSACTION;');
      
      // First, delete all user's time entries 
      const deleteTimeEntriesStmt = this.db.prepare('DELETE FROM time_entries WHERE user_id = ?');
      deleteTimeEntriesStmt.run(id);
      
      // Delete user's topics
      const deleteTopicsStmt = this.db.prepare('DELETE FROM topics WHERE user_id = ?');
      deleteTopicsStmt.run(id);
      
      // Remove user from all teams they're a member of
      const deleteTeamMemberStmt = this.db.prepare('DELETE FROM team_members WHERE user_id = ?');
      deleteTeamMemberStmt.run(id);
      
      // Delete any team invitations for this user
      const deleteInvitationsStmt = this.db.prepare('DELETE FROM team_invitations WHERE invited_by = ?');
      deleteInvitationsStmt.run(id);
      
      // Find teams owned by this user
      const findTeamsStmt = this.db.prepare('SELECT id FROM teams WHERE owner_id = ?');
      const ownedTeams = findTeamsStmt.all(id) as { id: number }[];
      
      // Delete those teams (cascade will handle team members)
      for (const team of ownedTeams) {
        const deleteTeamStmt = this.db.prepare('DELETE FROM teams WHERE id = ?');
        deleteTeamStmt.run(team.id);
      }
      
      // Finally, delete the user
      const deleteUserStmt = this.db.prepare('DELETE FROM users WHERE id = ?');
      const result = deleteUserStmt.run(id);
      
      // Commit transaction
      this.db.exec('COMMIT;');
      
      return result.changes > 0;
    } catch (error) {
      // Rollback in case of error
      this.db.exec('ROLLBACK;');
      console.error('Error deleting user:', error);
      return false;
    }
  }
}
